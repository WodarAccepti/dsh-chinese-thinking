# 发布说明 —— dsh-chinese-thinking v1.0.0

让 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）的思考链（thinking / reasoning）固定用中文的零依赖插件：向 Host 的系统提示词注册一个全局段落，因此 profile 内每个 Agent（含子 Agent）都用配置的语言思考，面向用户的回答语言不受影响。

## 安装

### 方式一：直接装 Release 里的 tgz（推荐）

下载本 Release 的 `dsh-chinese-thinking-1.0.0.tgz`，然后在 DSH Web 界面 → 插件 → 添加插件 里填这个文件在本机的绝对路径：

```text
D:\Downloads\dsh-chinese-thinking-1.0.0.tgz
```

或者用 CLI：

```text
dsh plugin --profile web add D:/Downloads/dsh-chinese-thinking-1.0.0.tgz
```

> 桌面版（DeepSeek Harness Desktop）的 `desktop` profile 由应用独占管理，命令行需要先完全退出应用：
>
> ```text
> "<DSH 安装目录>\resources\runtime\cli\bin\dsh.cmd" plugin --profile desktop add D:\Downloads\dsh-chinese-thinking-1.0.0.tgz
> ```

### 方式二：解压源码包

下载 `dsh-chinese-thinking-1.0.0-source.zip`，解压到任意目录，然后按上面的方式用目录绝对路径安装（例如 `D:\path\to\dsh-chinese-thinking`）。

### 方式三：从仓库安装

```text
dsh plugin --profile web add https://github.com/WodarAccepti/dsh-chinese-thinking.git
```

> Git 方式要求系统 PATH 里有 `git`，且会走源码构建；优先用方式一。

## 配置

配置可以写在 profile 的 `cordis.patch.yml` 里，按行 id `dsh-chinese-thinking` 覆盖：

```yaml
- id: dsh-chinese-thinking
  name: dsh-chinese-thinking
  config:
    language: 繁體中文
    order: 400
    # enabled: false   # 关掉这个插件
    # text: |          # 完全自定义段落正文，{{language}} 是唯一占位符
    #   ...
```

| 选项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | boolean | `true` | `false` 时完全不注册段落 |
| `language` | string | `'简体中文'` | 思考语言，非空字符串 |
| `order` | number | `400` | 段落优先级（部署人设 `0` 之后、第一方指导 `500` 之前） |
| `text` | string | 见 README | 段落正文 |

## 兼容性

| 项 | 要求 |
|---|---|
| DSH | `>=0.1.5-rc.1` |
| Node.js | `>=20` |
| 平台 | 不限（桌面版 Web / 独立 `dsh web` / headless） |
| 依赖 | 无 |

## 校验

```powershell
# Windows PowerShell
Get-FileHash .\dsh-chinese-thinking-1.0.0.tgz -Algorithm SHA256
```

```bash
# macOS / Linux
sha256sum -c SHA256SUMS
```

## 这份包含哪些文件

| 文件 | 说明 |
|---|---|
| `dsh-chinese-thinking-1.0.0.tgz` | npm 包（`npm pack` 产物），5 个文件 12.7 kB，可直接被 `dsh plugin add` 安装 |
| `dsh-chinese-thinking-1.0.0-source.zip` | 完整源码快照，含 README / LICENSE / 测试 / CI 配置 |
| `SHA256SUMS` | 上面两个文件的 SHA-256 校验和 |
| `RELEASE_NOTES.md` | 本文件 |

## 完整变更

见仓库 [CHANGELOG.md](https://github.com/WodarAccepti/dsh-chinese-thinking/blob/main/CHANGELOG.md)。

## 许可证

[MIT](https://github.com/WodarAccepti/dsh-chinese-thinking/blob/main/LICENSE)
