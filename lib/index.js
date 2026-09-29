/**
 * dsh-chinese-thinking —— 让 Harness 的思考链（reasoning / thinking）固定为中文。
 *
 * 只做一件事：向系统提示词注册一个全局段落（section），因此 profile 内每个智能体
 * ——包括子智能体——都会用配置的语言思考；面向用户的回答语言不受影响，仍跟随用户。
 *
 * 段落的 `interpolate: false` 是刻意的：段落文本默认会被当作模板解析 `{{变量}}`，
 * 未知引用会让整个提示词组装抛错，所以我们自己替换文本、并关闭插值。
 *
 * 零依赖。行的 `config` 会被原样传入（本插件不声明 Config schema），因此下面这些
 * 选项既可以写在代码默认值里，也可以在 profile 的 cordis.patch.yml 里按行 id 覆盖：
 *
 *   - id: dsh-chinese-thinking
 *     name: dsh-chinese-thinking
 *     config:
 *       language: 繁體中文
 *       order: 400
 */

/** 插件名，便于日志与诊断辨认。 */
export const name = 'dsh-chinese-thinking'

/** 等 systemPrompt 服务就绪后再激活；没有它的 profile 里插件保持休眠而不是报错。 */
export const inject = ['systemPrompt']

/** 段落名在全局作用域内必须唯一。 */
const SECTION_NAME = 'dsh-chinese-thinking:reasoning-language'

/** 默认优先级：位于部署人设（0）之后、第一方指导与工具说明（500 起）之前。 */
const DEFAULT_ORDER = 400

const DEFAULTS = {
  enabled: true,
  language: '简体中文',
  order: DEFAULT_ORDER,
  text: `Reasoning language: always think in {{language}}. Every reasoning/thinking block you produce — the thinking the user can open, your plans, comparisons, debugging and self-checks — must be written in {{language}}, whatever language the user's message, these instructions, or any tool output use.

This rule governs your thinking only. Inside that thinking text, keep code, identifiers, file paths, commands, tool names, JSON/YAML keys, and text quoted from another source exactly as they are.

It does not change how you reply: your user-visible answer still follows the user's own language and requested format.`,
}

/**
 * 校验并补全配置。
 * @param config - 行配置，可能缺失或为未校验的原始对象。
 * @returns 完整选项。
 * @throws TypeError - 类型或取值非法时抛出，让错误显式暴露而不是静默失效。
 */
function normalize(config) {
  const raw = config !== null && typeof config === 'object' ? config : {}
  const options = {}
  for (const [key, fallback] of Object.entries(DEFAULTS)) {
    const value = raw[key]
    options[key] = value === undefined || value === null ? fallback : value
  }
  if (typeof options.enabled !== 'boolean') throw new TypeError('enabled must be a boolean')
  if (typeof options.language !== 'string' || options.language.trim() === '') {
    throw new TypeError('language must be a non-empty string')
  }
  if (typeof options.order !== 'number' || !Number.isFinite(options.order)) {
    throw new TypeError('order must be a finite number')
  }
  if (typeof options.text !== 'string') throw new TypeError('text must be a string')
  return options
}

/**
 * 激活插件：注册（并随插件卸载而注销）思考语言段落。
 * @param ctx - 已注入 systemPrompt 的插件上下文。
 * @param config - 行配置。
 */
export function apply(ctx, config) {
  const options = normalize(config)
  if (!options.enabled) return
  ctx.effect(() =>
    ctx.systemPrompt.section({
      name: SECTION_NAME,
      order: options.order,
      text: options.text.replaceAll('{{language}}', options.language),
      interpolate: false,
    }),
  )
}
