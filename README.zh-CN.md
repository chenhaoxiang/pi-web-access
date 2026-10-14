# Pi Web Access — 维护版

这是 `chenhaoxiang/pi-web-access` 维护版，社区上游为 [`nicobailon/pi-web-access`](https://github.com/nicobailon/pi-web-access)。

- `main`：我们的整合与发布主线
- `upstream-main`：社区 `main` 的只读镜像，不是安装来源
- 当前维护版本：`0.40.0-fork.1`
- 社区基线：`0.40.0`，提交 `9861ad72a11c9af419b39f9b00860708407f7025`

## 安装

使用固定版本：

```bash
pi install git:github.com/chenhaoxiang/pi-web-access@v0.40.0-fork.1
```

如需跟随维护主线：

```bash
pi install git:github.com/chenhaoxiang/pi-web-access@main
```

生产或可复现环境优先使用 GitHub Release 中的编译包、来源清单和 `SHA256SUMS`。不要安装 `upstream-main`，也不要用社区 npm 包替代维护版。

安装新版本不会替换已经运行的 Pi 进程。让当前任务结束后再 `/reload` 或重启；旧版本应保留到新版本完成验收。

## 搜索路由改进

本维护版保留社区能力，并增加以下可靠性处理：

- 区分“搜索成功但没有结果”和“上游响应无法解析”；
- 配置有序路由时，Exa 无效响应可回退到 AnySearch；
- 鉴权错误、配置错误和取消操作仍然 fail-closed，不静默切换；
- 备用渠道成功时，保留前一个渠道的失败原因；
- 诊断同时进入普通输出、结构化结果和已保存的搜索结果。

推荐的本机路由配置：

```json
{
  "searchRouting": {
    "providers": ["exa", "anysearch"],
    "useCurrentModel": false,
    "fallbackOn": [
      "transient",
      "quota",
      "network",
      "invalid-response",
      "unsupported"
    ]
  }
}
```

该配置不需要新增 API Key，不会启用浏览器 Cookie，也不会放宽 SSRF 或第三方托管抓取策略。AnySearch 作为备用时仍受其服务可用性和限流影响。

## 验证

```bash
npm ci --ignore-scripts --legacy-peer-deps
npm run typecheck
npm test -- --test-concurrency=2
npm run build
npm run audit:runtime
```

当前搜索路由的回归测试覆盖：

- 正常 Exa 主路径；
- 合法空结果；
- 无效/空响应；
- Exa 到 AnySearch 的回退；
- 鉴权错误和取消操作；
- 普通输出、结构化结果和保存结果中的回退诊断。

## 维护与发布

社区更新通过只读 `upstream` / `upstream-main` 进入同步评审，不直接覆盖 `main`。维护版本使用 `<社区版本>-fork.<修订号>`，每个版本通过 GitHub Release 提供固定 tag、编译包、来源清单和 SHA-256 校验文件。详细流程见 [`docs/maintenance/fork-maintenance.md`](docs/maintenance/fork-maintenance.md)。

## 许可证

MIT，沿用社区项目许可证与原作者署名。
