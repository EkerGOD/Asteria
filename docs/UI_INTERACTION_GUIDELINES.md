# Asteria / 星识 UI Interaction Guidelines

本文档是 Asteria / 星识 桌面端 UI 和交互设计的统一约束文件。任何修改 `apps/desktop` 的任务，都应先阅读本文件，并在最终回复中说明改动如何符合本规范。

本文件约束页面结构、页面 contract、组件行为、状态迁移、视觉语言和 AI 生成 UI 的边界；它不替代 `docs/PRD.md`、`docs/ARCHITECTURE.md`、`docs/DESKTOP_APP.md` 或 `docs/API_CONTRACT.md`。

## Product UI Principle

Asteria / 星识 是 desktop-first、AI-native、local-first 的个人知识工作台，不是 Web-first SaaS，也不是营销型页面集合。

UI 应满足：

- 清晰：用户始终知道自己在哪个页面、正在操作哪个对象、当前对象属于哪个 project 或上下文。
- 安静：界面避免过度装饰、强营销感、夸张 hero、炫技动画和大面积渐变。
- 密度适中：优先支持反复使用、扫描、编辑和比较，不追求空洞留白。
- 可回溯：AI 输出必须能回到知识来源、检索片段、模型上下文和本地数据对象。
- 本地感：界面应强调 local API、local database、provider configuration 和 desktop workflow，而不是账号、团队、云同步或 SaaS onboarding。

硬性边界：

- 前端不得直接访问 PostgreSQL 或执行 SQL。
- 前端不得直接调用 OpenAI、OpenAI-compatible endpoint、Provider SDK 或 Provider HTTP API。
- 前端不得实现 embedding 生成、retrieval、prompt 构造或 RAG orchestration。
- 前端只能通过本地 FastAPI / typed API client 获取应用数据和 AI 行为。

## Core Product Workflows

Asteria 的优秀交互应用应围绕三个稳定产品工作流组织，而不是围绕技术模块堆页面。

### 1. 沉淀知识

用户从 Knowledge 页面创建或编辑 knowledge unit，绑定 project 和 tags，并刷新 embeddings。

设计重点：

- 写作、整理和编辑是主流程。
- Tags、project、source URI、embedding status 是辅助上下文，不应压过正文编辑。
- 创建和编辑状态必须明确区分。
- 保存、归档、刷新 embeddings 必须有清楚反馈。

### 2. 组织上下文

Projects 和 Tags 是 conversations 与 knowledge units 的上下文框架。

设计重点：

- 当前筛选条件应始终可见。
- 用户应能快速判断一个 knowledge unit 或 conversation 属于哪个 project。
- Projects 页面负责管理上下文，不承载聊天、RAG 或 provider 配置。
- Tags 是知识组织工具，不应被设计成社交标签或公开分类体系。

### 3. 基于知识提问

Chat 页面以 message thread 为中心，通过 RAG 基于本地知识库回答问题。

设计重点：

- Message thread 是主视觉中心。
- Source references 必须靠近对应 assistant answer 展示。
- Provider、chat model、embedding model、retrieved chunks 是上下文信息，不应抢占主流程。
- 前端只发送用户问题和筛选条件；answer、sources、model metadata 由后端返回后渲染。

## Page Archetypes

所有 MVP 页面应遵守固定页面原型。除非任务明确要求更新本文件，否则不要发明新的页面结构。

| Page | Required Archetype | Primary Region | Context Region | Must Not |
| --- | --- | --- | --- | --- |
| Chat | 左 conversations，中 message thread，右 context/sources | message thread 和 composer | conversation metadata、RAG sources、provider/model context | 把 sources 放成脱离回答的孤立信息堆；做成通用聊天玩具 |
| Knowledge | 左 filters/list，中 editor/detail，右 tags/embedding/source metadata | knowledge editor/detail | tags、project、source、embedding summary | 让筛选、标签、embedding 动作与正文编辑混成同一层级 |
| Projects | 左 project list，右 detail/editor | project detail/editor | usage summary 或 related context | 混入 knowledge editor、chat 或 provider 设置 |
| Settings | 左 provider list，右 provider form/status | provider configuration form | health check、active provider、local API context | 直接调用 Provider API；暴露 provider-specific payload |
| Diagnostics | 状态总览 + 可刷新检查 | local API/database/provider status | environment、service version、debug hints | 承载业务配置、编辑数据或替代 Settings |

页面可以在窄屏下堆叠，但语义顺序必须保持：导航/列表在前，主工作区居中，详情或上下文在后。

## Page UI Contracts

本节是页面级 contract。AI assistant 修改页面时，应先确定目标页面 contract，并只在该 contract 内设计交互。

### Chat

Purpose:

- 让用户选择或创建 conversation，发送问题，并查看后端 RAG 返回的 answer 和 source references。

Data Source:

- `GET /api/conversations`
- `POST /api/conversations`
- `GET /api/conversations/{id}/messages`
- `POST /api/rag/answer`
- 可选读取 `GET /api/projects` 用于 conversation project context。

Primary Actions:

- Create conversation。
- Select conversation。
- Send RAG question。

Secondary Actions:

- Refresh conversation list。
- Refresh selected message thread。
- View source references and model metadata。
- Adjust supported retrieval filters only when API contract supports them。

Required States:

- no conversations。
- no selected conversation。
- conversation selected。
- loading conversations。
- loading messages。
- sending message。
- answer received。
- source references empty。
- API or Provider error。

Layout Rules:

- Conversation list belongs on the left.
- Message thread and composer are the central work area.
- Sources, provider/model metadata, and conversation context belong near the assistant answer or in the right context region.
- Composer must be disabled until a conversation is selected.

Must Not:

- Do not call Provider SDKs or Provider endpoints directly.
- Do not synthesize assistant messages or fake source references.
- Do not implement RAG orchestration in React.
- Do not make Chat look like a generic social/team chat product.

### Knowledge

Purpose:

- 让用户创建、编辑、过滤、打标签、归档 knowledge units，并触发 embedding refresh。

Data Source:

- `GET /api/knowledge-units`
- `POST /api/knowledge-units`
- `GET /api/knowledge-units/{id}`
- `PUT /api/knowledge-units/{id}`
- `DELETE /api/knowledge-units/{id}`
- `POST /api/knowledge-units/{id}/embeddings/refresh`
- `GET /api/projects`
- Tag endpoints provided by the backend API client.

Primary Actions:

- Create knowledge unit。
- Edit and save knowledge unit。
- Archive knowledge unit。
- Refresh embeddings for selected knowledge unit。

Secondary Actions:

- Filter by project。
- Filter by tag。
- Attach or detach tags。
- Create tag when supported by the current backend API.
- Refresh list。

Required States:

- no knowledge units。
- filter has no results。
- loading list。
- selected knowledge unit。
- creating knowledge unit。
- editing knowledge unit。
- saving。
- archiving。
- refreshing embeddings。
- validation error。
- API or Provider error。
- embedding refresh summary available。

Layout Rules:

- Filters and knowledge list belong on the left.
- Editor/detail belongs in the central primary region.
- Tags, source URI, project metadata, and embedding summary belong in the context region.
- The editor must clearly say whether it is creating a new unit or editing an existing unit.

Must Not:

- Do not hide selected project/tag filters.
- Do not place embedding controls where they compete with the main content editor.
- Do not expose raw embedding vectors.
- Do not create file import, OCR, crawler, or external ingestion UI unless the task explicitly expands the MVP.

### Projects

Purpose:

- 让用户创建、编辑、归档和选择 projects，作为 knowledge units 和 conversations 的工作上下文。

Data Source:

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/{id}`
- `PUT /api/projects/{id}`
- `DELETE /api/projects/{id}`

Primary Actions:

- Create project。
- Select project。
- Edit and save project。
- Archive project。

Secondary Actions:

- Refresh project list。
- View project metadata or usage summary when the API provides it。

Required States:

- no projects。
- loading projects。
- selected project。
- creating project。
- editing project。
- saving。
- archiving。
- validation error。
- API error。

Layout Rules:

- Project list belongs on the left.
- Project detail/editor belongs on the right or central primary region.
- Project identity, color, description, and sort order must be easy to scan.

Must Not:

- Do not add team/workspace/user management semantics.
- Do not mix project editing with knowledge editing or chat.
- Do not imply cloud sync or shared team spaces.

### Settings

Purpose:

- 让用户管理 OpenAI-compatible Provider 配置、active provider selection 和 provider health check。

Data Source:

- `GET /api/providers`
- `POST /api/providers`
- `GET /api/providers/{id}`
- `PUT /api/providers/{id}`
- `DELETE /api/providers/{id}`
- `POST /api/providers/{id}/activate`
- `POST /api/providers/{id}/health-check`

Primary Actions:

- Create provider。
- Edit and save provider。
- Activate provider。
- Run health check。

Secondary Actions:

- Refresh provider list。
- Clear stored API key when supported by the backend contract。
- View local API base URL and provider metadata。

Required States:

- no providers。
- loading providers。
- selected provider。
- creating provider。
- editing provider。
- saving。
- activating。
- health checking。
- health ok。
- health error。
- validation error。
- API error。

Layout Rules:

- Provider list belongs on the left.
- Provider form and status belong in the main region.
- Health result should be close to the provider it belongs to.
- Active provider must be visibly distinct from idle providers.
- API key fields must never reveal stored keys; use `has_api_key` style indicators only.

Must Not:

- Do not store Provider secrets in frontend persistent storage.
- Do not call Provider APIs directly from desktop code.
- Do not expose raw `api_key`, `api_key_ciphertext`, or Provider-specific payloads.
- Do not turn Settings into global account, billing, team, or cloud settings.

### Diagnostics

Purpose:

- 展示本地 API、database configuration、provider connectivity and local service status，帮助用户判断开发期组件是否可用。

Data Source:

- `GET /health`
- Provider status may be displayed only through backend endpoints such as `POST /api/providers/{id}/health-check` when available.

Primary Actions:

- Refresh diagnostics。
- View local API status。

Secondary Actions:

- View environment, service, version, database configuration and provider status hints。
- Link users conceptually to Settings when provider configuration is needed, without duplicating Settings forms。

Required States:

- checking。
- API online。
- API unavailable。
- database configured。
- database missing or unavailable。
- provider unknown。
- provider reachable。
- provider error。

Layout Rules:

- Diagnostics should be a status dashboard, not an editor.
- Status cards must clearly distinguish local API, database, provider, and environment.
- Error detail must be concise and actionable.

Must Not:

- Do not edit provider, project, knowledge, or chat data here.
- Do not directly probe the database or Provider from the frontend.
- Do not duplicate Settings forms.

## Component Interaction Rules

Components should encode repeated interaction contracts. Do not copy inconsistent button, status, and layout behavior page by page.

### AppShell

- Owns global layout: sidebar, page header, and page body.
- Must not own domain data fetching except app-level local service health if explicitly required.
- Must preserve desktop-first navigation and avoid marketing layout patterns.

### Sidebar

- Shows primary app sections only: Chat, Knowledge, Projects, Settings, Diagnostics.
- Active section must be visually clear and keyboard-focusable.
- Must not include account, team, billing, cloud sync, or marketing navigation.

### PageHeader

- Shows current page label, title, and short operational description.
- May show local status summary when useful.
- Must not contain primary object editing forms.

### SplitPane

- Represents list/detail/context layouts.
- Must keep pane semantics stable when responsive stacking occurs.
- Must prevent long content from causing layout overflow.

### ListItem

- Represents one selectable object such as conversation, knowledge unit, project, or provider.
- Must show selected, hover, disabled, and focus states.
- Must include enough metadata for scanning without becoming a full detail view.

### EditorPanel

- Contains create/edit form for one object.
- Must show whether the user is creating or editing.
- Must keep primary save/create action visible near the form.
- Must associate validation errors with fields.

### MetadataPanel

- Shows secondary context such as tags, project, source URI, embedding summary, provider health or model metadata.
- Must not contain the primary editor when an EditorPanel exists.
- Must stay subordinate to the main workflow.

### EmptyState

- Explains why the area is empty and what the next valid action is.
- Must distinguish true empty data from filtered no results.
- Must not use decorative illustration as a substitute for actionable text.

### ErrorState

- Shows what failed and what the user can do next.
- Must be close to the failed region.
- Must not expose Provider-specific raw payloads, stack traces, SQL errors, or secrets.

### LoadingState

- Indicates which region is loading.
- Must avoid shifting stable layout dimensions.
- Must not block unrelated regions when only one list, panel, or action is loading.

### ConfirmDialog

- Required for destructive or hard-to-reverse actions unless an equivalent two-step safeguard exists.
- Must have a clear title, explicit cancel action, explicit confirm action, and close affordance.
- Confirm button must describe the destructive action, such as "Archive knowledge" rather than "OK".

### Toast

- Used only for short-lived success or non-blocking status feedback.
- Must not replace field validation or region-level errors.
- Must not permanently occupy primary workspace.

### SourceReferenceCard

- Displays one RAG source reference from backend data.
- Must include source title, score when provided, chunk text or excerpt, and knowledge unit identity.
- Must appear near the assistant answer it grounds or in a clearly linked source region.
- Must not fabricate missing source data.

### ProviderStatusBadge

- Displays provider state such as active, idle, checking, reachable, or error.
- Must use text plus visual styling; color alone is insufficient.
- Must not reveal API keys or provider raw errors.

## Interaction State Model

对象管理页面必须显式表达以下状态，不允许靠隐含条件让用户猜当前模式。

- `empty`：没有对象或筛选无结果，应说明当前为空的原因和下一步动作。
- `loading`：页面级加载只影响当前数据区域，不应冻结整个 app shell。
- `error`：错误必须靠近出错区域展示，并提供 refresh、retry 或可操作说明。
- `selected`：列表中被选对象必须有明确视觉状态；详情区必须显示对应对象标题或标识。
- `creating`：新建模式必须与编辑模式有不同标题和主按钮文案。
- `editing`：编辑已有对象时，主按钮应表达保存已有对象，而不是笼统提交。
- `saving`：只锁定正在提交的表单和相关动作，按钮文案应变为进行中状态。
- `archiving`：归档或删除类动作必须有防误触设计。
- `success feedback`：成功提示应短暂、低打扰、靠近触发动作，不应长期占据主工作区。

状态命名可以在代码中不同，但 UI 行为必须覆盖以上语义。

## State Transition Rules

### Knowledge create / edit / save / archive flow

1. Page loads projects, tags, and knowledge units through the API client.
2. If the list is empty, show an EmptyState and keep the editor in an explicit creating or idle state.
3. Selecting a knowledge unit moves the detail area to selected + editing state and populates the editor from API data.
4. Clicking New clears selected knowledge and moves the editor to creating state with empty fields.
5. Saving validates required fields before API mutation.
6. During save, disable only the save action and conflicting editor actions.
7. On save success, reload or reconcile the list, select the saved unit, show success feedback near the editor, and keep filters visible.
8. On save failure, preserve unsaved form input and show ErrorState near the editor.
9. Archiving requires confirmation or equivalent safeguard.
10. During archive, disable conflicting actions for that selected unit.
11. On archive success, remove the archived unit from the active list, clear or move selection, and show success feedback.
12. Refresh embeddings is available only for an existing selected unit and must show a summary returned by the backend.

### Chat send message / receive answer / render sources flow

1. Page loads conversations and projects through the API client.
2. If no conversation is selected, composer is disabled and the center region explains that a conversation must be selected or created.
3. Selecting a conversation loads its message thread.
4. Sending validates non-empty content before calling `POST /api/rag/answer`.
5. During send, disable composer submit and show sending state without freezing the conversation list.
6. On success, append or reload the persisted user message and assistant message returned by the backend.
7. Render assistant answer from backend response only.
8. Render source references from backend response or assistant retrieval metadata only.
9. SourceReferenceCard instances must be visually connected to the assistant answer or clearly grouped as sources for the latest answer.
10. On Provider/API failure, preserve the user input when the message was not accepted; if the backend saved the user message before failure, reload messages to reflect persisted state.
11. Do not create a fake assistant placeholder that can be mistaken for persisted backend data.

### Settings provider configuration / health check flow

1. Page loads provider list through the API client.
2. If no provider exists, show EmptyState and keep the form in creating state.
3. Selecting a provider moves form to editing state and clears raw API key input.
4. Saving validates required fields before API mutation.
5. API key field may accept a new key but must never display the stored key.
6. During save, disable save and conflicting provider actions.
7. On save success, reload or reconcile provider list, select the saved provider, and show success feedback near the form.
8. Activating a provider calls the backend activate endpoint; UI must reflect that only one provider is active.
9. Health check calls the backend health-check endpoint and stores the result with that provider.
10. Health result must show reachable/error text and latency when provided.
11. Provider errors must be standardized UI errors and must not expose raw provider payloads or secrets.

## Action Rules

页面动作必须遵守稳定层级。

- 主动作放在详情区或编辑区，例如 Save、Create、Send。
- 列表区只放选择、筛选、刷新和新建入口。
- 新建入口可以在列表区或详情区顶部，但进入后必须清楚切换到 creating 状态。
- Archive、Delete、Clear key 等危险动作必须使用红色语义、二次确认或明确的防误触模式。
- Refresh 只刷新当前区域数据；不要把 refresh 伪装成保存、重新生成或重新配置。
- Disabled 状态必须说明条件：例如未选择 conversation 时不能发送 message。
- 成功和错误反馈必须就近，不要只在页面底部或全局区域出现。

## Visual System

Asteria 的视觉风格应是 restrained、dense、scannable 的桌面工具。

基础规则：

- 使用中性背景、清楚边界、少量强调色。
- 使用现有 Tailwind 配置和本地组件风格，避免为单页任务引入新 UI 框架。
- 页面区块应服务工作流，不做装饰性 section。
- 卡片只用于真实信息单元、表单容器、列表项、状态块或 modal，不做无意义嵌套。
- 避免大面积渐变、装饰性图形、营销 hero、pricing/login/team admin 风格。
- 避免让页面被单一色系支配；强调色用于 active、focus、primary action 和 status。
- 字体层级应克制：页面标题最大，panel 标题紧凑，列表项和表单标签适合扫描。
- 固定格式区域应有稳定尺寸或响应式约束，避免 loading、hover、长文本导致布局跳动。

## Accessibility

Accessibility 是 UI contract 的一部分，不是后期 polish。

- 所有表单字段必须有可见 label。
- 表单错误必须与字段关联，例如通过 `aria-describedby`、错误文本 id 或等价语义结构。
- Icon-only button 必须有 `aria-label`。
- Dialog 必须有明确标题、关闭方式、取消动作和键盘可访问路径。
- 不能只靠颜色表达状态；必须同时使用文本、图标语义或可读标签。
- 列表项、按钮、输入框、select、textarea 和可点击卡片必须有可见 focus 状态。
- 按钮必须使用语义化 `button`，并有清楚文案或可访问名称。
- 错误信息应与字段或区域关联，不能只靠全局 toast 表达。
- 长文本、URL、ID 和 source snippets 必须可换行，不能撑破容器。
- Disabled 控件应有清楚原因或由周围上下文解释。

## AI-Native Knowledge UX

AI 在 Asteria 中是知识查询、回溯和生成层，不是独立聊天娱乐功能。

必须遵守：

- Chat UI 不直接调用 OpenAI、OpenAI-compatible endpoint 或任何 Provider SDK。
- Assistant answer 和 source references 只渲染后端返回的数据。
- RAG source references 应靠近对应 assistant answer，至少展示 title、score、chunk text 和 knowledge unit identity。
- Provider/model/embedding metadata 是上下文状态，应帮助用户判断回答来源和可靠性。
- Provider failures 必须以可操作错误展示，不暴露 Provider-specific raw payload。
- 不伪造 sources、embedding 状态、provider health 或 model metadata。

## Change Scope Control

UI 修改必须小步、可验证、可回滚。不要用一次大重写掩盖交互决策。

- 一次任务只优化一个页面、一个 workflow 或一组明确共享组件。
- 不允许一次性重写所有页面、全局样式、导航和 API wiring。
- 不允许为了单个页面引入新的 UI 框架、状态管理框架、路由方案或设计系统。
- 不允许在 UI 任务中修改 backend schema、RAG logic、Provider adapter 或 database behavior，除非任务明确包含这些范围。
- 不允许重命名大量已有概念来追求视觉统一；术语应跟 PRD 和 API contract 一致。
- 如果需要新增共享组件，先抽取最小公共交互模式，再逐页迁移。
- 如果当前页面存在用户未提交改动，必须保留并顺着现有改动工作，不得回滚。
- 大型 UI 改造应拆为：规范更新、组件抽取、单页迁移、后续页面迁移、验证与 polish。

## Agent Workflow For UI Changes

任何 agent 修改 `apps/desktop` 前必须：

1. 阅读 `docs/PRD.md`、`docs/DESKTOP_APP.md`、`docs/ARCHITECTURE.md`、`docs/API_CONTRACT.md` 和本文档。
2. 明确本次任务对应哪个 Page UI Contract。
3. 明确本次任务涉及哪些 Component Interaction Rules。
4. 明确本次任务涉及哪些 Interaction State 和 State Transition Rules。
5. 确认不会改变 desktop-first、AI-native、local-first 的架构边界。
6. 确认不引入 Web-first、SaaS-first、multi-user、login、cloud sync 或 plugin marketplace 语义。

实现过程中必须：

- 只修改任务范围内的页面、组件或样式。
- 优先复用现有 API client、types、Tailwind token 和本地组件。
- 不在前端增加数据库访问、Provider 调用、RAG orchestration 或 provider-specific payload。
- 不用长期 mock 代替缺失后端业务逻辑；缺失能力应作为后续任务记录。
- 保持 loading、empty、error、disabled、success states 完整。

完成后最终回复必须报告：

- 修改摘要。
- 修改文件。
- 运行的测试命令和结果。
- UI 规范符合性：说明符合的 Page UI Contract、Component Interaction Rules、State Transition Rules 和 Action Rules。
- 未覆盖的后续 UI 改造建议。

## Acceptance Checklist

任意 UI 任务完成前，应能回答：

- 这个页面是否仍然符合规定的 Page Archetype 和 Page UI Contract？
- 用户是否能明确区分 empty、loading、error、selected、creating、editing、saving 和 success feedback？
- 主动作、次动作和危险动作是否层级清楚？
- RAG sources、provider context 和 local API 状态是否展示在正确位置？
- UI 是否仍然像本地知识工作台，而不是 SaaS 营销页面？
- 前端是否仍然只通过本地 FastAPI / API client 访问应用数据和 AI 行为？
- 本次改动是否 page-by-page 或 component-by-component，而不是无边界重写？
- 可访问性规则是否覆盖了 label、focus、aria、dialog、错误关联和非颜色状态表达？
