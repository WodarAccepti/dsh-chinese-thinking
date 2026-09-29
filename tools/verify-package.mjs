/**
 * 校验发布包：解出 tgz 的每个条目，用 gunzip + tar 解析，并和源文件逐字节比对。
 * 用法：node tools/verify-package.mjs <tgz 路径>
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const tgz = process.argv[2]
if (!tgz) throw new Error('用法：node tools/verify-package.mjs <tgz 路径>')

const tar = gunzipSync(readFileSync(tgz))
const entries = []
for (let offset = 0; offset + 512 <= tar.length; ) {
  const header = tar.subarray(offset, offset + 512)
  if (header.every((byte) => byte === 0)) break
  const read = (start, length) => header.subarray(start, start + length).toString('utf8').replace(/\0.*$/s, '').trim()
  const name = [read(345, 155), read(0, 100)].filter(Boolean).join('/')
  const size = parseInt(read(124, 12), 8)
  const mode = parseInt(read(100, 8), 8)
  const type = read(156, 1)
  const data = tar.subarray(offset + 512, offset + 512 + size)
  entries.push({ name, size, mode: mode.toString(8), type, data })
  offset += 512 + Math.ceil(size / 512) * 512
}

console.log(`entries: ${entries.length}`)
for (const entry of entries) console.log(`  ${entry.mode}  ${String(entry.size).padStart(6)}  ${entry.name}`)

const names = entries.map((entry) => entry.name)
if (names[0] !== 'package/package.json') throw new Error('tar 的第一个条目必须是 package/package.json（npm 约定）')
for (const entry of entries) if (entry.type !== '0') throw new Error(`非普通文件条目：${entry.name} (type=${entry.type})`)

// 逐字节和仓库源文件比对
const prefix = 'package/'
let checked = 0
for (const entry of entries) {
  const rel = entry.name.slice(prefix.length)
  const onDisk = readFileSync(join(repo, rel))
  if (Buffer.compare(onDisk, entry.data) !== 0) throw new Error(`内容与源文件不一致：${rel}`)
  checked++
}
console.log(`OK: ${checked} 个条目全部与仓库源文件逐字节一致`)
console.log(`sha256(tgz) = ${createHash('sha256').update(readFileSync(tgz)).digest('hex')}`)
