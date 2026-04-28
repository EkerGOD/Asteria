# Desktop App

## 为什么选择桌面端

Asteria / 星识 选择 desktop-first，是因为它的核心任务是支持本地知识工作。

桌面端适合作为 MVP 形态，因为 Asteria / 星识 需要：

- 持久的本地 workspace，用于保存 notes、conversations 和 knowledge units。
- 用户对本地数据和 Provider 配置有更强控制。
- 未来可以自然接入本地文件、全局快捷键、系统托盘、后台索引等桌面能力。
- 专注单用户知识工作流，避免过早引入 Web 账号、团队、权限和 SaaS 复杂度。
- 清晰分离本地 UI、本地后端、本地数据库和外部 AI Provider。

MVP 不是 browser-first 或 hosted SaaS。Vite dev server 只是 Tauri 开发期工具。

## 运行组件

开发期有三个本地组件：

- `apps/desktop`：Tauri shell 和 React UI。
- `apps/api`：FastAPI 本地服务。
- PostgreSQL + pgvector：通过 Docker Compose 启动的开发数据库。

AI Provider 可以是外部或本地 OpenAI-compatible service，但只能由 `apps/api` 调用。

## Tauri 和 FastAPI 如何协作

Tauri 提供原生桌面壳。

React 在 Tauri window 中渲染 UI，并通过 HTTP 调用 FastAPI。开发期通常使用 `127.0.0.1`。

FastAPI 负责：

- 数据库访问。
- 业务规则。
- AI Provider 调用。
- embedding 生成。
- retrieval 和 RAG orchestration。

Tauri 负责：

- 桌面窗口生命周期。
- 原生应用配置。
- 未来桌面集成能力。

桌面前端不应使用 Tauri commands 绕过后端业务逻辑。Tauri commands 应用于原生桌面能力，而不是直接访问数据库或 AI。

## 开发期模式

开发期：

1. Docker Compose 启动 PostgreSQL + pgvector。
2. FastAPI 通过 `uvicorn` 运行。
3. Vite 提供 React dev server。
4. Tauri 打开指向 Vite dev server 的桌面窗口。
5. React 调用本地 FastAPI 服务。

开发期优势：

- UI 快速热更新。
- FastAPI 易于调试。
- Alembic 管理数据库迁移。
- API 和数据库行为容易检查。

开发期限制：

- 服务需要分别启动。
- 应用还不是一个完整安装包。
- 本地端口和环境变量需要开发者配置。

## 未来打包期模式

未来打包时，FastAPI 可能作为 Tauri sidecar 分发。

打包后：

- Tauri 启动桌面 UI。
- Tauri 可以启动或管理本地 API sidecar。
- API 应只绑定 localhost。
- 桌面 UI 仍然调用 API，而不是直接访问数据库。
- Provider 调用仍然只发生在 API 内部。

未决打包问题：

- PostgreSQL、Provider secrets、migrations、sidecar lifecycle、background indexing、auto-update、logs 和 signing/notarization 的具体方案仍未确定。
- 未来打包假设和风险集中记录在 `docs/PACKAGING_NOTES.md`，不要在 MVP implementation 中提前实现。

这些问题应在 MVP 证明 desktop-first 架构后再处理。

## 安全和 localhost 约束

MVP 本地服务应满足：

- 绑定 `127.0.0.1`，不要监听公开网络接口。
- CORS 只允许已知本地开发 origin。
- 不记录 Provider API keys。
- Provider secrets 应加密存储，或在可用时使用系统 secret store。
- 所有 Provider 调用都留在 FastAPI 后端。

## 架构不变量

未来打包细节可以变化，但以下关系不应变化：

```text
Tauri + React UI -> Local FastAPI API -> PostgreSQL + AI Provider Abstraction
```

桌面应用始终是产品表面；后端始终是数据和 AI 行为的权威层。
