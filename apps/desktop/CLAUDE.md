# apps/desktop Claude Code Instructions

本文档是 Asteria / 星识 桌面端目录的 Claude Code 协作规则。修改 `apps/desktop` 前，先阅读仓库根目录 `CLAUDE.md`，再按任务范围阅读相关 docs。

`apps/desktop` 是 Asteria / 星识 的 Tauri + React 桌面客户端。它是产品表面和用户交互层，但不是业务、数据库或 AI Provider 的权威层。

## 必读上下文

按任务类型阅读：

- 桌面产品定位和页面范围：`docs/PRD.md`。
- 前后端边界：`docs/ARCHITECTURE.md`。
- Tauri 与本地 FastAPI 协作：`docs/DESKTOP_APP.md`。
- API 调用约定：`docs/API_CONTRACT.md`。
- 任务拆分和验收标准：`docs/MVP_TASKS.md`。

如果文档之间出现冲突，优先保持：

- Asteria / 星识 是 desktop-first，不是 Web-first SaaS。
- 桌面端只通过本地 FastAPI 访问应用数据和 AI 行为。
- `apps/api` 是数据库、Provider、embedding、retrieval 和 RAG 的唯一权威层。

## 技术栈

- Tauri
- React
- Vite
- TypeScript
- Tailwind CSS
- ESLint

当前可用脚本见 `package.json`：

- `npm run dev`
- `npm run build`
- `npm run typecheck`
- `npm run lint`

## 目录职责

`apps/desktop` 负责：

- Tauri 桌面壳、窗口配置和未来桌面原生集成入口。
- React 页面、组件、客户端状态、表单和交互。
- 通过 typed API client 调用本地 FastAPI。
- 渲染 Chat、Knowledge、Knowledge Detail、Projects、Settings、Diagnostics。
- 展示 loading、empty、error、retry 和 disabled states。
- 展示后端返回的 RAG source references、Provider health、数据库/API diagnostics。
- 前端类型检查、lint 和必要的 UI 测试。

`apps/desktop` 不负责：

- 直接连接 PostgreSQL 或执行 SQL。
- SQLAlchemy models、Alembic migrations 或数据库 session。
- 直接调用 OpenAI、OpenAI-compatible endpoint 或任何 AI Provider SDK。
- embedding 生成、semantic search、retrieval、prompt 构造或 RAG orchestration。
- Provider secret 校验、Provider 错误规范化或 Provider-specific payload 处理。
- Web-first 页面、登录、多用户、云同步、团队空间、插件市场或生产发布系统。

## 硬性规则

- 不引入 Next.js 或 full-stack Web 架构。
- 所有应用数据读写都经由本地 FastAPI HTTP API。
- 所有 AI 行为都经由 `apps/api`。
- Tauri commands 只能用于桌面原生能力，例如文件选择、应用生命周期、系统集成；不得用于绕过后端业务逻辑。
- Provider API key 可以在 Settings 表单中输入并提交给 API，但不得作为长期前端持久化数据保存。
- 前端类型不应包含 Provider-specific request payload 细节。
- 开发期 Vite dev server 只是 Tauri 开发工具，不代表 Asteria / 星识 是浏览器优先产品。
- 不为了单个页面任务引入大型状态管理、UI 框架或路由方案，除非任务明确需要。

## UI 和交互规则

- MVP 页面范围来自 `docs/PRD.md`：Chat、Knowledge、Knowledge Detail、Projects、Settings、Diagnostics。
- 不创建 marketing page、pricing page、login page 或 team admin page。
- UI 应服务知识工作台：清晰、密度适中、适合反复使用，而不是 SaaS 营销落地页。
- 表单必须有基础 required-field 校验、提交中状态和错误展示。
- API 请求必须处理 loading、error、empty 和 retry/refresh 场景。
- Chat UI 只发送用户输入和筛选条件；assistant answer 和 source references 由后端返回后渲染。
- Settings UI 只管理后端 Provider 配置；health check 调用后端 endpoint。
- Diagnostics UI 展示本地 API、数据库、Provider 等状态，不自行探测数据库或 Provider。

## API Client 规则

- API base URL 应集中配置，默认面向本地开发地址，例如 `127.0.0.1`。
- API client 应使用明确的 TypeScript request/response types。
- 不在组件里散落重复 fetch 细节；复杂调用应收敛到 client 或 hooks。
- HTTP errors 应转换为 UI 可展示的错误状态。
- 与后端 API contract 不一致时，优先更新或确认 `docs/API_CONTRACT.md`，不要在 UI 中猜测后端行为。

## Tauri 规则

- Tauri 配置和 Rust commands 只处理桌面壳或原生能力。
- 不在 Rust side 直接访问数据库或 Provider。
- 不在 Tauri command 中复制后端业务规则。
- 未来如果 FastAPI 作为 sidecar，由 Tauri 管理启动生命周期，但 UI 仍通过本地 HTTP API 通信。
- Tauri 权限和 capabilities 应保持最小化。

## 样式和代码组织

- 保持 TypeScript 严格、组件小而清晰。
- 优先使用现有 Tailwind 配置、色彩 token 和本地组件风格。
- 共享类型、API client、页面组件和通用 UI 状态应放在清晰目录中；不要在单个文件中堆叠大量无关逻辑。
- 避免无关视觉重写；只改任务 Scope 需要的页面和组件。
- 可访问性基础要到位：语义按钮、label、焦点状态、合理的 aria 文本。

## 测试要求

根据任务范围选择最小有效验证：

- 类型检查：`cd apps/desktop && npm run typecheck`
- Lint：`cd apps/desktop && npm run lint`
- 构建检查：`cd apps/desktop && npm run build`
- 本地开发：`cd apps/desktop && npm run dev`

如果依赖未安装、脚本缺失或后端未 scaffold，最终回复中必须明确说明无法运行的命令和原因。

前端任务优先验证：

- TypeScript 类型正确。
- API client types 和实际调用一致。
- 主要页面的 loading、empty、error 和 success 状态。
- Provider 设置表单、Knowledge CRUD、Projects、Chat 和 Diagnostics 的用户路径。
- 前端没有直接数据库访问或直接 Provider 调用。

## 修改纪律

- 一次只做一个小任务，优先来自 `docs/MVP_TASKS.md`。
- 不把 frontend UI、backend endpoint、schema、RAG logic 混进同一次任务，除非任务明确要求。
- 缺少 API 时，不在前端伪造长期业务逻辑来替代后端；可使用清晰的 placeholder 或 mock，并标明任务边界。
- 不修改 `apps/api` 来适配未确认的 UI 假设，除非任务 Scope 包含 API contract 更新。
- 不重写无关页面、样式系统或 Tauri 配置。
- 完成后报告修改摘要、修改文件、测试命令、测试结果、未运行测试原因和建议后续任务。
