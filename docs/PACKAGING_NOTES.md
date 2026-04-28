# Future Packaging Notes

本文档记录 Asteria / 星识 未来桌面打包方向的假设和未决风险。它不是 MVP implementation plan，也不改变当前开发期运行方式。

当前 MVP 仍以开发期流程为准：

1. Docker Compose 启动 PostgreSQL + pgvector。
2. `apps/api` 使用 Alembic 初始化数据库。
3. FastAPI 通过 `uvicorn` 运行本地 API。
4. `apps/desktop` 通过 Vite 提供 React dev server。
5. Tauri 打开桌面窗口并连接本地 API。

## Packaging Assumptions

- Tauri 仍然是桌面 shell，React 仍然只通过 localhost HTTP 调用 FastAPI。
- FastAPI 未来可以作为 Tauri-managed sidecar 分发，但它仍然是业务规则、数据库访问、AI Provider 调用、embedding、retrieval 和 RAG orchestration 的唯一权威层。
- 打包形态可以变化，但架构边界不变：

```text
Tauri + React UI -> Local FastAPI API -> PostgreSQL + AI Provider Abstraction
```

- Tauri commands 只用于桌面原生能力，例如启动/停止 sidecar、窗口生命周期、本地文件选择、系统托盘或未来 OS 集成；不得绕过 FastAPI 访问数据库或 AI Provider。
- 本地 API 打包后仍应默认绑定 `127.0.0.1`，并保持 CORS 和端口暴露最小化。

## Open Questions

- Database strategy: PostgreSQL + pgvector 是 bundled、user-managed，还是在未来切换为其他本地存储策略。
- Database lifecycle: 打包后如何初始化数据库、运行 Alembic migrations、处理升级失败、备份和恢复。
- Provider secrets: Provider API keys 需要 future OS keychain 或 secret-store 设计；生产打包前不应依赖明文数据库字段作为最终方案。
- API sidecar lifecycle: Tauri 如何发现空闲端口、启动 FastAPI、检测健康状态、重启失败进程，以及在退出应用时清理子进程。
- Auto-update: Tauri auto-update、API sidecar、数据库 migrations 和 schema compatibility 需要一起设计。
- Background work: embedding refresh、future indexing、provider health checks 和 long-running jobs 应如何在打包应用里调度和展示状态。
- Observability: logs、crash reports、diagnostic export、local support bundle 和用户可读错误信息需要单独设计。
- Signing and notarization: Windows code signing、macOS notarization、Linux packaging targets 和 release artifacts 需要在正式 packaging task 中确定。

## Risks To Track

- 打包时如果让 React 或 Tauri command 直接访问数据库，会破坏 desktop-first 架构边界。
- 如果 FastAPI sidecar 监听公开网络接口，会扩大本地服务攻击面。
- 如果 Provider secrets 未接入 OS keychain 或等价 secret store，生产打包会有明显安全缺口。
- 如果 migrations 和 auto-update 没有顺序控制，应用升级可能造成 schema drift 或不可恢复的本地数据问题。
- 如果数据库策略没有确定，installer 体积、首次启动体验、备份路径和卸载策略都会不稳定。

## Explicit Non-Goals For MVP

- 不实现 installer、sidecar launcher、auto-update、signing、notarization 或 release pipeline。
- 不改变当前 Docker Compose + uvicorn + Vite/Tauri development workflow。
- 不改变 API、schema、frontend types、环境变量或 runtime architecture。
- 不引入云数据库、托管后端、多用户登录、云同步或团队协作。
