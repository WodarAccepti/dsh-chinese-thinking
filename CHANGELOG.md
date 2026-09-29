# Changelog

本文件记录所有值得注意的变更，格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

## [1.0.0] - 2026-09-29

### Added

- 首个发布版本：`dsh-chinese-thinking` 插件本体，零依赖。
- 向 Host 系统提示词注册唯一段落 `dsh-chinese-thinking:reasoning-language`，通过
  `ctx.effect()` 随插件卸载自动注销。
- 配置项 `enabled` / `language` / `order` / `text`，支持在 profile 的
  `cordis.patch.yml` 里按行 id `dsh-chinese-thinking` 覆盖。
- 段落以 `interpolate: false` 注册并自行替换 `{{language}}`，避免模板插值遇到未知引用时
  让整个提示词组装抛错。
- 非法配置显式抛 `TypeError`（`order` 非有限数、`language` 为空串等），让问题在启动期暴露。
- `cordis.patch.yml` bundle 补丁：把插件行插入 profile 配置树。
- `tests/smoke.mjs` 冒烟测试：5 条路径（默认配置、配置覆盖、显式停用、2 条非法配置）。

[Unreleased]: https://github.com/WodarAccepti/dsh-chinese-thinking/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/WodarAccepti/dsh-chinese-thinking/releases/tag/v1.0.0
