# Asteria / 星识 UI Interaction Guidelines

本文档是 Asteria / 星识 桌面端 UI 和交互设计的统一约束文件。任何修改 `apps/desktop` 的任务，都应先阅读本文件，并在最终回复中说明改动如何符合本规范。

本文件约束页面结构、交互模型、状态表达、视觉语言和 AI 生成 UI 的边界；它不替代 `docs/PRD.md`、`docs/ARCHITECTURE.md` 或 `docs/API_CONTRACT.md`。

## Product UI Principle

Asteria / 星识 是 desktop-first、AI-native、本地优先的个人知识工作台，不是 Web-first SaaS，也不是营销型页面集合。

UI 应满足：

- 清晰：用户始终知道自己在哪个页面、正在操作哪个对象、当前对象属于哪个 project 或上下文。
- 安静：界面避免过度装饰、强营销感、夸张 hero、炫技动画和大面积渐变。
- 密度适中：优先支持反复使用、扫描、编辑和比较，不追求空洞留白。
- 可回溯：AI 输出必须能回到知识来源、检索片段、模型上下文和本地数据对象。
- 本地感：界面应强调 local API、local database、provider configuration 和 desktop workflow，而不是账号、团队、云同步或 SaaS onboarding。

## Scientific UI Scheme

Asteria 的优秀交互应用应围绕三个稳定工作流组织，而不是围绕技术模块堆页面。

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

可访问性规则：

- 所有表单字段必须有 label。
- 按钮必须使用语义化 `button`，并有清楚文案。
- 焦点状态必须可见。
- 错误信息应与字段或区域关联，不能只靠颜色表达。
- 长文本、URL、ID 和 source snippets 必须可换行，不能撑破容器。

## AI-Native Knowledge UX

AI 在 Asteria 中是知识查询、回溯和生成层，不是独立聊天娱乐功能。

必须遵守：

- Chat UI 不直接调用 OpenAI、OpenAI-compatible endpoint 或任何 Provider SDK。
- Assistant answer 和 source references 只渲染后端返回的数据。
- RAG source references 应靠近对应 assistant answer，至少展示 title、score、chunk text 和 knowledge unit identity。
- Provider/model/embedding metadata 是上下文状态，应帮助用户判断回答来源和可靠性。
- Provider failures 必须以可操作错误展示，不暴露 Provider-specific raw payload。
- 不伪造 sources、embedding 状态、provider health 或 model metadata。

## Agent Workflow For UI Changes

任何 agent 修改 `apps/desktop` 前必须：

1. 阅读 `docs/PRD.md`、`docs/DESKTOP_APP.md`、`docs/API_CONTRACT.md` 和本文档。
2. 明确本次任务对应哪个 Page Archetype。
3. 明确本次任务涉及哪些 Interaction State。
4. 确认不会改变 desktop-first 架构边界。
5. 确认不引入 Web-first、SaaS-first、multi-user、login、cloud sync 或 plugin marketplace 语义。

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
- UI 规范符合性：说明符合的 Page Archetype、Interaction State 和 Action Rules。
- 未覆盖的后续 UI 改造建议。

## Acceptance Checklist

任意 UI 任务完成前，应能回答：

- 这个页面是否仍然符合规定的 Page Archetype？
- 用户是否能明确区分 empty、loading、error、selected、creating、editing、saving 和 success feedback？
- 主动作、次动作和危险动作是否层级清楚？
- RAG sources、provider context 和 local API 状态是否展示在正确位置？
- UI 是否仍然像本地知识工作台，而不是 SaaS 营销页面？
- 前端是否仍然只通过本地 FastAPI 访问应用数据和 AI 行为？
