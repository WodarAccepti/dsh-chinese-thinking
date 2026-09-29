/**
 * 生成本地发布包：npm 包 tgz + 源码 zip + SHA-256 校验和。
 *
 * 纯 Node 实现，不调用 shell（避开 Windows PowerShell 的编码与管道问题），
 * 也不依赖 npm：tgz 自己按 tar(ustar)+gzip 写，zip 走系统 tar.exe 或 PowerShell。
 *
 * 用法（仓库根目录）：
 *   node tools/pack-release.mjs
 *   node tools/pack-release.mjs --out D:\releases
 */

import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)
const outFlag = argv.indexOf('--out')
const outDir = outFlag >= 0 && argv[outFlag + 1] ? resolve(argv[outFlag + 1]) : join(repo, 'release')

/* ------------------------------------------------------------------ tar */

/** 写一个 ustar 头块（512 字节）。 */
function tarHeader(name, size, mtimeSeconds, mode = 0o644) {
  const block = Buffer.alloc(512)
  const put = (offset, length, value) => block.write(value, offset, Math.min(length, Buffer.byteLength(value)), 'utf8')
  const octal = (value, length) => value.toString(8).padStart(length - 1, '0') + '\0'
  // 长路径走 ustar 的 prefix/name 拆分
  let nameBuf = Buffer.from(name, 'utf8')
  if (nameBuf.length > 100) {
    const cut = name.lastIndexOf('/', name.length - 100)
    if (cut < 0) throw new Error(`路径过长且无法拆分：${name}`)
    put(345, 155, name.slice(0, cut))
    nameBuf = Buffer.from(name.slice(cut + 1), 'utf8')
  }
  nameBuf.copy(block, 0, 0, Math.min(nameBuf.length, 100))
  put(100, 8, octal(mode, 8))
  put(108, 8, octal(0, 8))
  put(116, 8, octal(0, 8))
  put(124, 12, octal(size, 12))
  put(136, 12, octal(mtimeSeconds, 12))
  put(148, 8, '        ')
  put(156, 1, '0')
  put(257, 6, 'ustar\0')
  put(263, 2, '00')
  put(265, 32, 'root')
  put(297, 32, 'root')
  let sum = 0
  for (const byte of block) sum += byte
  put(148, 8, sum.toString(8).padStart(6, '0') + '\0 ')
  return block
}

/** 把一组 {name, data, mode} 打成 ustar 归档。 */
function tar(files) {
  const chunks = []
  const mtime = Math.floor(Date.now() / 1000)
  for (const file of files) {
    chunks.push(tarHeader(file.name, file.data.length, mtime, file.mode))
    chunks.push(file.data)
    const padding = (512 - (file.data.length % 512)) % 512
    if (padding > 0) chunks.push(Buffer.alloc(padding))
  }
  chunks.push(Buffer.alloc(1024)) // 归档结束：两个全零块
  return Buffer.concat(chunks)
}

/* -------------------------------------------------------------- helpers */

/** 递归列出目录下的相对文件路径。 */
function walk(dir, base = dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full, base, acc)
    else if (entry.isFile()) acc.push(relative(base, full).split('\\').join('/'))
  }
  return acc
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function human(bytes) {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} kB`
}

/* ------------------------------------------------------------------ main */

const manifest = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8'))
const { name, version } = manifest
if (!name || !version) throw new Error('package.json 里缺少 name 或 version')

// 1) 先跑冒烟测试，失败就不打包
const smoke = spawnSync(process.execPath, [join(repo, 'tests', 'smoke.mjs')], { cwd: repo, stdio: 'inherit' })
if (smoke.status !== 0) throw new Error(`冒烟测试失败（exit ${smoke.status}），已中止打包`)

mkdirSync(outDir, { recursive: true })

// 2) npm 包：只收 package.json 的 files 白名单
const tgzName = `${name}-${version}.tgz`
const tgzPath = join(outDir, tgzName)
const packed = [`package/package.json`].map((n) => ({ name: n, data: readFileSync(join(repo, 'package.json')), mode: 0o644 }))
for (const entry of manifest.files ?? []) {
  const full = join(repo, entry)
  if (!existsSync(full)) throw new Error(`files 里声明的 ${entry} 不存在`)
  if (statSync(full).isDirectory()) {
    for (const rel of walk(full)) packed.push({ name: `package/${entry}/${rel}`, data: readFileSync(join(full, rel)), mode: 0o644 })
  } else {
    packed.push({ name: `package/${entry}`, data: readFileSync(full), mode: 0o644 })
  }
}
writeFileSync(tgzPath, gzipSync(tar(packed), { level: 9 }))

// 3) 源码 zip：仓库工作树（排除依赖、产物与 git 元数据）
const skip = new Set(['node_modules', 'release', '.git', '.dsh-module-fallback', '.npm-cache'])
const sourceZip = join(outDir, `${name}-${version}-source.zip`)
const stage = mkdtempSync(join(tmpdir(), `${name}-stage-`))
const stageRoot = join(stage, `${name}-${version}`)
mkdirSync(stageRoot, { recursive: true })
for (const entry of readdirSync(repo, { withFileTypes: true })) {
  if (skip.has(entry.name)) continue
  if (entry.name.endsWith('.tgz') || entry.name.endsWith('.zip')) continue
  cpSync(join(repo, entry.name), join(stageRoot, entry.name), { recursive: true })
}
if (existsSync(sourceZip)) rmSync(sourceZip, { force: true })
// Windows 自带 tar.exe 能直接写 zip；失败再退回 PowerShell 的 Compress-Archive
let zipped = spawnSync('tar.exe', ['-a', '-c', '-f', sourceZip, '-C', stage, `${name}-${version}`], { stdio: 'ignore' })
if (zipped.status !== 0 || !existsSync(sourceZip)) {
  const script = join(stage, 'zip.ps1')
  writeFileSync(script, `Compress-Archive -Path '${join(stageRoot, '*')}' -DestinationPath '${sourceZip}' -Force\n`, 'ascii')
  zipped = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script], { stdio: 'ignore' })
  if (zipped.status !== 0 || !existsSync(sourceZip)) throw new Error('生成源码 zip 失败：tar.exe 与 Compress-Archive 都不可用')
}
rmSync(stage, { recursive: true, force: true })

// 4) 校验和
const sums = [tgzName, `${name}-${version}-source.zip`].map((f) => `${sha256(join(outDir, f))}  ${f}`).join('\n') + '\n'
writeFileSync(join(outDir, 'SHA256SUMS'), sums, 'ascii')

console.log('')
console.log(`发布包已生成于 ${outDir}`)
for (const f of [tgzName, `${name}-${version}-source.zip`, 'SHA256SUMS']) {
  console.log(`  ${human(statSync(join(outDir, f)).size).padStart(9)}  ${f}`)
}
console.log('')
console.log(sums.trim())
