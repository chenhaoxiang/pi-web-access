# Pi Web Access — 维护版

这是 `chenhaoxiang/pi-web-access` 维护版，社区上游为 [`nicobailon/pi-web-access`](https://github.com/nicobailon/pi-web-access)。

- `main`：我们的整合与发布主线
- `upstream-main`：社区 `main` 的只读镜像，不是安装来源
- 当前维护版本：`0.47.0-fork.2`
- 社区基线：社区稳定版 `0.47.0`，提交 `6dd57b7f5a0c3041053e65a28f5f425323ec95f9`

## 安装

对应 GitHub Release/tag 发布完成后，使用固定版本：

```bash
pi install git:github.com/chenhaoxiang/pi-web-access@v0.47.0-fork.2
```

如需跟随维护主线：

```bash
pi install git:github.com/chenhaoxiang/pi-web-access@main
```

生产或可复现环境优先使用 GitHub Release 中的编译包、来源清单和 `SHA256SUMS`。不要安装 `upstream-main`，也不要用社区 npm 包替代维护版。

安装新版本不会替换已经运行的 Pi 进程。让当前任务结束后再 `/reload` 或重启；旧版本应保留到新版本完成验收。

## 社区 0.47 后续同步（0.47.0-fork.2 候选）

- 同步上述精确社区 main 的 4 个提交，社区 package 仍为 `0.47.0`。源码候选、PR/CI、独立审查、Release、安装及实际 loaded 分别验收；此阶段不发布或安装。
- AnySearch 在本地应用 include/exclude 域名过滤，并将请求结果数限制为 10；空结果可按显式 `empty` / `domain-miss` 策略回退。
- 新增显式选择的付费 cloro Google / AI Mode，不进入 `auto` 或 `all`。
- DuckDuckGo 每进程限制请求间隔与预算，通过配置目录下的文件共享 bot-check 冷却；不会自动改写搜索配置。
- 显式 `fetch_content` answer 模式可把图片/视频帧交给已选择且支持图片的回答模型；文本模型在调用前报错，不另选渠道。

## 社区 0.47 更新

- 新增 Sofya、Outcrawl 搜索，必须显式选择或加入配置路由；`auto`、`all` 不会自动启用。
- `lockProxy` 可阻止单次调用绕过已配置代理，不自动更改本机配置。
- GitHub README 提取上限提高至 100K 字符，克隆使用系统临时目录。
- 保留 Exa 诊断、有序回退错误及现有凭据、隐私和付费渠道边界。

## 社区 0.43 / 0.44 更新

- 多个搜索渠道支持网关前缀；跨源重定向移除 API 凭据，默认官方地址不变。
- 新增显式选择的付费 Linkup 搜索；DeepSeek Fetch 仍需单独允许远程托管抓取。
- 默认 provider 数组全部失败时，可按已有策略进入 searchRouting；单次显式 provider 选择仍严格执行。
- 静态完整短页面可直接返回；xAI 支持单独的 Responses 地址与搜索超时。
- `toolExposure: "deferred"` 可配合 `toolActivation: "none"`，仅通过 codemode / tool_search 发现工具，不自动改配置。
- 更新 Hono 锁定版本，修复运行时依赖审计发现的静态路径重复解码漏洞。

### 保留的社区 0.42.0 能力

- 新增 DeepSeek 搜索渠道，按成功请求计费，必须显式选择或加入路由；`auto` 和 `all` 不会自动使用。
- 页面问答和搜索摘要通过 `streamSimple` 调用虚拟模型，避免绕过宿主路由。
- 可用 `toolExposure: "deferred"` 按需暴露大型 Web 工具；默认仍直接提供，不自动修改本机设置。
- Windows 的 `!command` 凭据来源支持 Git Bash；Gemini ADC 在显式配置后支持 GCE 机器服务账号。
- 继续保留直接抓取 User-Agent 校验、SearXNG 同源回环限制和 fork 搜索诊断；不自动变更凭据、搜索路由、浏览器或付费服务授权。

## 搜索路由改进

本维护版保留社区能力，并增加以下可靠性处理：

- 区分“搜索成功但没有结果”和“上游响应无法解析”；
- 配置有序路由时，Exa 无效响应可回退到 AnySearch；
- 鉴权错误、配置错误和取消操作仍然 fail-closed，不静默切换；
- 配置式有序路由（`searchRouting`）的备用渠道成功时，保留前一个渠道的失败原因；
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
