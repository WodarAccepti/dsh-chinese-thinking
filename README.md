# dsh-chinese-thinking

让 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）的**思考链（thinking / reasoning）固定用中文**的零依赖插件。

它只做一件事：向 Host 的系统提示词注册**一个**全局段落，因此该 profile 里的每个 Agent——主 Agent、子 Agent、workflow 里的 Agent——都会用你配置的语言思考。**面向用户的回答语言不受影响**，仍然跟随用户。

```
用户问什么语言  →  回答就用什么语言（不变）
思考链          →  始终用配置的语言（本插件的作用）
```

## 为什么需要它

推理模型的思考语言会漂移：中文提问、英文思考，或者在同一轮里中英混杂。思考链是模型做规划、比较、调试和自我检查的地方，语言漂移会让长任务越跑越散；对中文使用者来说，中文思考链也更容易复核模型的判断依据。

本插件不翻译、不拦截输出、不改任何请求参数，只是在系统提示词里加一条明确的思考语言规则。

## 安装

### 方式一：Web 界面插件页（推荐）

1. 打开 DSH Web 界面，左侧边栏点 **插件**（Plugins）。
2. 点 **添加插件**（Add plugin）。
3. 在包名输入框里填**包名**（不是 GitHub 地址，也不是 `git+` 地址）：

   ```text
   dsh-chinese-thinking
   ```

   本地开发目录直接用绝对路径也可以：

   ```text
   D:\Agent\dsh-chinese-thinking
   ```

4. 点 **安装**，装完刷新页面。

### 方式二：CLI

```bash
# 独立 dsh 安装
dsh plugin --profile web add dsh-chinese-thinking

# 指定本地目录（相对路径会以你当前所在目录为基准解析）
dsh plugin --profile web add D:/Agent/dsh-chinese-thinking
```

> **桌面版（DeepSeek Harness Desktop）注意**：桌面版的 `desktop` profile 由应用独占管理，命令行必须先**完全退出应用**再执行：
>
> ```text
> "D:\dsh\resources\runtime\cli\bin\dsh.cmd" plugin --profile desktop add D:\Agent\dsh-chinese-thinking
> ```
>
> 装完重新打开应用。

### 方式三：手工链接（应用正在运行、又不方便重启时）

把插件目录链接进 profile 的 `node_modules`，并把包名加进 `package.json` 的 `dsh.profile.bundles`：

```powershell
$profileDir = "$env:USERPROFILE\.dsh\profiles\desktop"
New-Item -ItemType Junction -Path "$profileDir\node_modules\dsh-chinese-thinking" -Target "D:\Agent\dsh-chinese-thinking"
```

然后编辑 `$profileDir\package.json`：

```json
{
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "dsh-chinese-thinking"
      ]
    }
  }
}
```

bundle 列表在启动时读取，**改完要重启应用**才生效。

## 配置

配置既可以写在插件代码的默认值里，也可以在 profile 的 `cordis.patch.yml` 里**按行 id 覆盖**——本插件不声明 Config schema，行的 `config` 会原样传进来：

```yaml
- id: dsh-chinese-thinking
  name: dsh-chinese-thinking
  config:
    language: 繁體中文
    order: 400
```

| 选项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | boolean | `true` | `false` 时完全不注册段落，插件静默休眠 |
| `language` | string | `'简体中文'` | 思考用的语言，非空字符串；填 `'繁體中文'`、`'English'` 等均可 |
| `order` | number | `400` | 段落优先级。默认落在部署人设（`0`）之后、第一方指导与工具说明（`500` 起）之前 |
| `text` | string | 见下文 | 段落正文。`{{language}}` 是唯一占位符，由插件自己替换 |

默认正文（英文撰写，避免与其它系统提示词的语言惯性互相干扰）：

> Reasoning language: always think in {{language}}. Every reasoning/thinking block you produce — the thinking the user can open, your plans, comparisons, debugging and self-checks — must be written in {{language}}, whatever language the user's message, these instructions, or any tool output use.
>
> This rule governs your thinking only. Inside that thinking text, keep code, identifiers, file paths, commands, tool names, JSON/YAML keys, and text quoted from another source exactly as they are.
>
> It does not change how you reply: your user-visible answer still follows the user's own language and requested format.

## 实现说明

`lib/index.js` 只有 80 余行，没有依赖：

- `inject = ['systemPrompt']` —— 只有提供 `systemPrompt` 服务的 profile 才激活，其它 profile 里插件保持休眠而不是报错。
- `ctx.effect(() => ctx.systemPrompt.section({...}))` —— 段落随插件卸载自动注销。
- `interpolate: false` —— **刻意关闭插值**。段落文本默认会被当作模板解析 `{{变量}}`，出现未知引用会让整个提示词组装抛错，所以插件自己替换 `{{language}}` 并关闭插值。
- 配置非法（`order` 不是有限数、`language` 为空串等）时**显式抛 `TypeError`**，让错误在启动期暴露，而不是静默失效。

## 兼容性

| 项 | 要求 |
|---|---|
| DSH | `>=0.1.5-rc.1`（`systemPrompt` 段落机制自该版本起稳定） |
| Node.js | `>=20`（DSH 自带运行时已满足） |
| 平台 | 不限；桌面版 Web、独立 `dsh web`、headless 均可用 |
| 依赖 | 无 |

## 已知边界

- 这是**提示词层**的约束，不是解码参数：模型偶尔仍可能蹦出英文单词，属于正常现象；对结果敏感的场景可以在 `text` 里加更强制的话术。
- 它不翻译已经生成的内容，也不改变 `reasoning_effort`/思考预算——那是另一类插件（如 `dsh-thinking-levels`）的职责。
- 同一 profile 内**不要同时装多个同类插件**（例如 `@max-null/dsh-chinese-thinking`、`dsh-zh-reasoning`），它们都往系统提示词里塞「用中文思考」的段落，重复注入浪费 token 且可能互相拉扯。

## 开发与自测

```bash
node tests/smoke.mjs        # 5 条行为 + 清单/补丁一致性
```

冒烟测试用一个假的 `systemPrompt` 上下文覆盖 5 条路径：默认配置、配置覆盖、显式停用、以及两条必须抛错的非法配置。测试断言段落名唯一、`order` 生效、`interpolate` 关闭、`{{language}}` 被替换、并且**没有未解析的 `{{` 残留**；最后还校验 `package.json` 与 `cordis.patch.yml` 对包名的约定一致，避免 bundle 补丁指向解析不到的模块。

## 打包发布

```bash
node tools/pack-release.mjs                 # 产物落到 release/
node tools/pack-release.mjs --out D:\releases
node tools/verify-package.mjs release/dsh-chinese-thinking-1.0.0.tgz
```

- `tools/pack-release.mjs`：先跑冒烟测试，再按 `package.json` 的 `files` 白名单打 npm 包（自实现 tar+gzip，不依赖 npm），同时导出源码 zip，最后写出 `SHA256SUMS`。
- `tools/verify-package.mjs`：解开 tgz，断言首个条目是 `package/package.json`（npm 约定）、所有条目都是普通文件、并与仓库源文件**逐字节比对**。
- `release/` 下的三个文件就是 GitHub Release 的直传内容：`dsh-chinese-thinking-1.0.0.tgz`、`dsh-chinese-thinking-1.0.0-source.zip`、`SHA256SUMS`。

## 许可证

[MIT](LICENSE) © 2026 dsh-chinese-thinking contributors
