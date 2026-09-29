/**
 * 冒烟测试：不起 DSH，只用一个假的 systemPrompt 上下文验证插件的全部对外行为。
 *
 * 覆盖 5 条路径：
 *   1. 默认配置      —— 注册恰好一个段落，名字/order/interpolate/文本替换都正确
 *   2. 配置覆盖      —— language 与 order 生效（等价于 cordis.patch.yml 里覆盖行 config）
 *   3. 显式停用      —— enabled: false 时什么都不注册
 *   4. 非法 order    —— 抛 TypeError
 *   5. 空 language   —— 抛 TypeError
 *
 * 另外校验 package.json 与 cordis.patch.yml 的一致性：两者对包名的约定必须相同，
 * 否则 bundle 补丁会指向一个解析不到的模块。
 *
 * 运行：node tests/smoke.mjs
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { apply, inject, name } from '../lib/index.js'

const root = fileURLToPath(new URL('..', import.meta.url))

/** 记录注册过的段落，模拟 systemPrompt 服务。 */
const sections = []
const ctx = {
  systemPrompt: {
    section(section) {
      sections.push(section)
      return () => {}
    },
  },
  effect(fn) {
    return fn()
  },
}

// --- 1. 默认配置 ---------------------------------------------------------
assert.equal(name, 'dsh-chinese-thinking')
assert.deepEqual(inject, ['systemPrompt'])

apply(ctx, undefined)
assert.equal(sections.length, 1, '注册恰好一个段落')

const section = sections[0]
assert.equal(section.name, 'dsh-chinese-thinking:reasoning-language')
assert.equal(section.order, 400)
assert.equal(section.interpolate, false, '插值必须关闭')
assert.ok(section.text.includes('简体中文'), '默认目标语言是简体中文')
assert.ok(!section.text.includes('{{'), '不能残留未解析的占位符')
assert.ok(section.text.includes('user-visible answer'), '明确不改回答语言')

// --- 2. 配置覆盖 ---------------------------------------------------------
sections.length = 0
apply(ctx, { language: '繁體中文', order: 12 })
assert.equal(sections.length, 1)
assert.equal(sections[0].order, 12)
assert.ok(sections[0].text.includes('繁體中文'))

// --- 3. 显式停用 ---------------------------------------------------------
sections.length = 0
apply(ctx, { enabled: false })
assert.equal(sections.length, 0, '停用时什么都不注册')

// --- 4/5. 非法配置必须显式报错 -------------------------------------------
assert.throws(() => apply(ctx, { order: 'x' }), TypeError)
assert.throws(() => apply(ctx, { language: '  ' }), TypeError)

// --- 清单与 bundle 补丁的一致性 ------------------------------------------
const manifest = JSON.parse(readFileSync(`${root}/package.json`, 'utf8'))
const patch = readFileSync(`${root}/cordis.patch.yml`, 'utf8')
assert.equal(manifest.name, 'dsh-chinese-thinking')
assert.equal(manifest.dsh?.bundle?.patch, './cordis.patch.yml')
assert.ok(patch.includes('name: dsh-chinese-thinking'), 'bundle 补丁里的模块名必须与包名一致')
assert.ok(manifest.files.includes('cordis.patch.yml'), 'bundle 补丁必须随包发布')
assert.ok(manifest.files.includes('lib'), '实现必须随包发布')

console.log('smoke OK: 5 behaviour cases + manifest/patch consistency passed')
