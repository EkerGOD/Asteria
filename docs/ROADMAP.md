# Roadmap

基于 `docs/VERSION_NOTES.md` 和 `docs/PRD.md` 生成。每个版本有明确主题、约束和验收标准，按语义化版本和依赖关系排序。

已完成版本归档在 `docs/ROADMAP_ARCHIVE.md`，仅供查阅。

---

## 版本说明

| 字段 | 说明 |
|------|------|
| 版本 | 语义化版本号 vMAJOR.MINOR.PATCH |
| 主题 | 本版本的核心目标，一句话概括 |
| 约束 | 本版本不做什么，防止 scope creep |
| Scope | frontend / backend / full-stack |
| 状态 | planned / in_progress / done |


## v0.15.2 — Chat & UI Bug 修复

Scope：frontend

状态：planned

约束：

- 不新增功能
- 不修改 API 接口
- 不修改数据库 schema

解决的问题：

1. [Bug] 右键菜单弹出的是折叠面板默认内容，而非上下文菜单（Note #4）
2. [Bug] 底部选择 Project 后 Chat 区域出现双滚动条（Note #6a）
3. [Bug] Project 选择器弹出菜单被限制在父容器内，未脱离悬浮（Note #7）
4. [Bug] 等待首个 token 时消息气泡提前显示并展示当前时间，应有 loading 动画（Note #9）
5. [Bug] Chat 面板折叠再展开后输入框自动变为最大尺寸（Note #13）

验收标准：

- [ ] 右键菜单正确显示上下文操作选项
- [ ] Project 选择后 Chat 区域仅有一个滚动条
- [ ] Project 弹出菜单通过 Portal 悬浮于父容器之上
- [ ] 首个 token 到达前显示 loading 动画，token 到达后再显示消息气泡
- [ ] Chat 面板折叠/展开后输入框尺寸不变
- [ ] `cd apps/desktop && npm run typecheck` 通过
- [ ] `cd apps/desktop && npm run lint` 通过

---


## v0.16.0 — Command Palette 与快捷键管理

Scope：frontend

状态：planned

约束：

- 不实现插件市场或第三方命令扩展系统
- 不实现 OS 全局快捷键；首版仅管理 Asteria 应用窗口内快捷键
- 不重构 Settings 全部页面
- 不改变 desktop-first、本地 API 和后端权威边界

解决的问题：

1. [Feature] 需要 Command Palette 集中承载常用命令入口
2. [UX] `Ctrl+P` 触发默认打印行为，与未来命令入口冲突
3. [UX] 缺少统一快捷键管理位置

验收标准：

- [ ] Command Palette 可通过应用内注册快捷键打开
- [ ] `Ctrl+P` 被接管后不触发默认打印
- [ ] Settings 中新增 Shortcuts / Keyboard 页面或等价入口
- [ ] 快捷键设置页面列出命令名称、当前快捷键和可编辑入口
- [ ] 修改快捷键时能检测并阻止冲突
- [ ] 用户可恢复默认快捷键
- [ ] 快捷键配置通过本地设置持久化
- [ ] `cd apps/desktop && npm run typecheck` 通过
- [ ] `cd apps/desktop && npm run lint` 通过

---

## v0.17.0 — UI 中英文切换

Scope：frontend

状态：planned

约束：

- 仅实现 UI 文案层面的 English / 中文切换
- 不改变 AI 输出语言、内容翻译或 prompt 行为
- 不新增账号、云同步或团队级语言偏好
- 不引入大型 i18n 框架，除非评估后确认为最小可维护方案

解决的问题：

1. [Feature] 应用尚未支持多语言 UI
2. [UX] 早期用户需要在 English 和中文之间切换界面语言
3. [Architecture] UI 文案缺少集中资源层

验收标准：

- [ ] 用户可在 English 和中文之间切换 UI 语言
- [ ] 语言偏好本地持久化，重启后保持
- [ ] 默认语言策略明确
- [ ] 缺失翻译有 fallback，不显示空白 key
- [ ] 已存在核心 UI 的用户可见文案使用 i18n 资源
- [ ] UI 语言切换不影响 AI 回复语言或 prompt 行为
- [ ] `cd apps/desktop && npm run typecheck` 通过
- [ ] `cd apps/desktop && npm run lint` 通过

---

## v0.18.0 — File Operations 与文件树体验补强

Scope：full-stack（Tauri Rust + React 前端）

状态：planned

约束：

- 不改变 Knowledge 关联、embedding 状态等文件元数据的 API 路径
- 不实现 PDF/Office/图片/CSV 等非 Markdown 文件预览或解析（留到 v0.20.0）
- 不实现跨仓库文件拖拽或复制
- 不改变文件在磁盘上的存储格式
- 不把 Repository / Vault 与 Project 耦合
- 非 Markdown 文件首版只做能力门控和清晰提示，不进入 Markdown Editor
- 文件元数据（Knowledge 关联、embedding 状态）仍走 FastAPI

解决的问题：

1. [Architecture] 文件树通过 FastAPI 读取本地文件，导致后端不可用时文件树完全无法使用
2. [Feature] 文件树缺少拖拽移动文件功能
3. [Feature] 缺少从文件树拖拽文件到 Editor 打开的能力
4. [UX] 切换仓库时未关闭旧仓库的已打开文件 Tab
5. [UX] 文件系统发生外部变化后，文件树不能主动刷新
6. [Bug + UX] 非 Markdown 文件被 Markdown Editor 打开，可能出现乱码
7. [UX] 文件树视觉层级不清晰，缺少 VS Code / Cursor 风格的 folder chevron、文件类型 icon 和展开缩进线

验收标准：

- [ ] 文件树读取/创建/删除/重命名使用 Tauri Rust command，不依赖 FastAPI
- [ ] 文件树能监听当前 Repository 的外部文件变化，并刷新可见节点
- [ ] 外部变化刷新后保留展开状态、选中文件和可恢复的 loading / error 状态
- [ ] 文件树内支持拖拽移动文件到子文件夹或上级目录
- [ ] 支持从文件树拖拽 Markdown 文件到 Editor 区域以在新 Tab 打开
- [ ] 点击非 Markdown 文件不会进入 Markdown Editor，并显示 unsupported / preview unavailable 状态
- [ ] 文件树使用 folder chevron 表达折叠/展开状态，文件夹展开时显示向下状态
- [ ] 不同文件类型通过 icon 区分，未知类型有 fallback icon
- [ ] 文件夹展开内容有缩进线或等价层级指示
- [ ] 文件树具备 selected、hover、loading、empty、error、disabled 状态
- [ ] 切换仓库时弹出确认对话框，列出未保存文件，支持保存并关闭或放弃更改
- [ ] 确认后关闭所有旧仓库 Tab，Editor 区域重置为空状态
- [ ] 文件元数据（Knowledge 关联状态等）仍通过 FastAPI 获取
- [ ] `cd apps/desktop && npm run typecheck` 通过
- [ ] `cd apps/desktop && npm run lint` 通过

---

## v0.19.0 — Embedding Model Catalog 与模型选择增强

Scope：full-stack

状态：planned

约束：

- 不实现任意模型导入、模型市场或插件市场
- 不把 embedding 模型配置回退到 Provider 页面
- 不改变 chat model role 的远程 Provider 模型选择方式
- 不在前端直接调用模型下载源、Provider SDK 或 embedding 执行逻辑
- 不承诺所有模型都适合当前硬件；首版仅提供可解释的候选和状态

解决的问题：

1. [Feature] 本地 embedding 模型候选过少，用户只能选择一个默认模型
2. [Research] 需要按轻量化、效果、速度等维度调研优秀 embedding 模型
3. [UX] 用户选择模型时缺少维度、体积、下载状态和推荐理由

验收标准：

- [ ] 产出 embedding 模型候选调研，说明来源、维度、体积/资源占用、速度/效果取向和推荐场景
- [ ] 本地模型 registry 至少包含 3 个候选模型，默认模型继续明确标注
- [ ] Model Roles 页面展示模型维度、状态、下载入口、推荐标签（如 lightweight / balanced / quality / fast）
- [ ] 保存 embedding model role 时同步保存 `model_name` 和 `embedding_dimension`
- [ ] 维度不匹配或模型缺失时，Knowledge embedding / RAG 检索给出可恢复错误
- [ ] 模型下载、失败、重试、已下载状态与 v0.13.1 的目录诊断兼容
- [ ] 更新 `docs/API_CONTRACT.md`、`docs/DATABASE_SCHEMA.md` 和模型候选调研文档
- [ ] `cd apps/api && pytest` 通过
- [ ] `cd apps/desktop && npm run typecheck` 通过
- [ ] `cd apps/desktop && npm run lint` 通过

---

## v0.20.0 — Non-Markdown File Preview Adapter Foundation

Scope：frontend（Tauri Rust + React 前端）

状态：planned

约束：

- 不实现 PDF、Office、图片、OCR、音频等完整文件解析流水线
- 不实现 CSV 写回编辑；CSV 编辑另行拆分
- 不把非 Markdown 文件内容写入 Knowledge、embedding 或 RAG ingestion
- 不引入 Web-first 文档管理、云同步或团队协作语义
- 不允许前端直接调用 AI Provider、数据库、SQL、embedding 或 RAG orchestration

解决的问题：

1. [Feature] 非 Markdown 文件目前只能被拒绝或误入 Markdown Editor，缺少安全的预览能力
2. [Feature] 用户希望能查看图片、CSV 表格、PDF / Office 文档等仓库文件
3. [Architecture] 需要在 v0.18.0 的 file type capability routing 之上建立 preview adapter 基础

验收标准：

- [ ] 建立 file capability registry：Markdown editor、read-only preview、open externally、unsupported 四类能力明确区分
- [ ] 图片文件可在中央区域只读预览，并有 loading、error、unsupported 状态
- [ ] CSV 文件可按表格只读预览，并处理空文件、解析失败、超大文件提示
- [ ] PDF / Office 文档至少提供清晰的打开策略：可内置预览则预览，否则提供 open externally 和 unsupported fallback
- [ ] 非 Markdown 文件不会触发 Markdown 保存、Knowledge 提取或 Markdown 状态栏逻辑
- [ ] Tab 标题、文件 icon 和状态栏能反映当前文件类型
- [ ] 文档中记录 CSV 编辑、全文解析、OCR 和 RAG ingestion 为后续版本，不混入本版本
- [ ] `cd apps/desktop && npm run typecheck` 通过
- [ ] `cd apps/desktop && npm run lint` 通过


---

## v0.21.0 — Knowledge UX 重构

Scope：frontend

状态：planned

约束：

- 不改动 Knowledge API 接口
- 不修改数据库 schema
- 不改变 Knowledge 数据模型

解决的问题：

1. [UX] Knowledge 页面所有 CRUD 操作堆在一起，逻辑混乱（Note #5）
2. [UX] Tag 管理缺少独立弹窗，全部堆在 Knowledge 页面

验收标准：

- [ ] Knowledge 主页面仅展示卡片/列表/图谱视图
- [ ] 点击 New 按钮弹出 Modal Dialog 进行新建（title、content、tags 多选/新建）
- [ ] 编辑 Knowledge 通过同一 Modal 模式完成
- [ ] Tag 管理有独立小 Modal
- [ ] `cd apps/desktop && npm run typecheck` 通过
- [ ] `cd apps/desktop && npm run lint` 通过

---

## v0.22.0 — Project 管理增强

Scope：full-stack

状态：planned

约束：

- 不改变 Project 与 Repository 的独立关系
- 不实现多层级 Project 文件夹

解决的问题：

1. [UX] Chat 顶部缺少固定的 Project 上下文指示器（Note #6b）
2. [UX] History 视图平铺所有对话，未按 Project 分组（Note #8）
3. [Feature] Project 只能归档不能删除，缺少完整生命周期管理（Note #11）

验收标准：

- [ ] Chat 顶部有固定定位的 Project 选择器，不随聊天滚动
- [ ] 顶部 Project 选择器与底部工具栏 Project 选择器同步
- [ ] History 视图按 Project 一级文件夹分组显示对话
- [ ] Project 支持删除操作
- [ ] 删除 Project 前弹出确认对话框，告知将删除项目下所有内容
- [ ] 删除 Project 后级联删除关联对话和消息
- [ ] `cd apps/api && pytest` 通过
- [ ] `cd apps/desktop && npm run typecheck` 通过
- [ ] `cd apps/desktop && npm run lint` 通过

---

## v0.23.0 — 编辑器上下文感知

Scope：frontend

状态：planned

约束：

- 不实现多文件同时注入上下文
- 不改变 AI Provider 调用方式
- 上下文注入由后端 RAG 流程处理，本版本只做前端 UI

解决的问题：

1. [Feature] 缺少基于当前 md 文件的大纲视图（Note #3）
2. [Feature] Chat 输入区缺少当前打开文件的上下文指示器（Note #10）

验收标准：

- [ ] 右侧面板 Outline 视图根据当前打开 md 文件加载标题结构
- [ ] 点击 Outline 节点可跳转到 Editor 对应位置
- [ ] 打开 md 文件时 Chat 输入框下方显示当前文件名
- [ ] 文件名右侧有眼睛图标按钮，点击切换是否将文件加入对话上下文
- [ ] 眼睛图标状态明确区分已加入/未加入上下文
- [ ] 切换文件时上下文状态同步更新
- [ ] `cd apps/desktop && npm run typecheck` 通过
- [ ] `cd apps/desktop && npm run lint` 通过

---

## v0.24.0 — LanceDB 向量存储迁移

Scope：full-stack

状态：planned

约束：

- 不迁移业务元数据表（conversations、projects、knowledge 等仍用 PostgreSQL/SQLAlchemy）
- 不改变 API 接口签名
- 不引入新的 AI Provider 依赖
- 迁移期间保持 pgvector 兼容，支持回退

解决的问题：

1. [Architecture] 向量数据与仓库耦合度低，无法按仓库独立存储和迁移（Note #2）
2. [Research] `.asteria` 数据存储结构未明确定义（Note #1）

验收标准：

- [ ] 产出 `.asteria` 文件夹数据存储结构文档
- [ ] 向量数据从 pgvector 迁移到 `.asteria/<repo-id>/vectors.lance`
- [ ] FastAPI 通过 LanceDB Python SDK 读写向量数据
- [ ] 每仓库向量数据完全隔离
- [ ] 嵌入生成和检索路径通过后端统一管理
- [ ] 提供 pgvector → LanceDB 迁移脚本
- [ ] 迁移期间 RAG 检索不受影响
- [ ] `cd apps/api && pytest` 通过
- [ ] `cd apps/desktop && npm run typecheck` 通过
- [ ] `cd apps/desktop && npm run lint` 通过

---

## v0.25.0 — 日志基础设施

Scope：full-stack

状态：planned

约束：

- 不实现远程日志上传或云端日志服务
- 不实现实时日志查看器 UI（留到后续版本）
- 日志文件本地存储，按天轮转

解决的问题：

1. [Infrastructure] 缺少统一的前后端日志，排查问题困难（Note #12）

验收标准：

- [ ] 后端使用 Python logging 输出分级日志到文件
- [ ] 前端 console 日志重定向到 Tauri log 文件
- [ ] 日志按天轮转，保留最近 N 天
- [ ] 日志级别可通过配置调整（DEBUG/INFO/WARN/ERROR）
- [ ] 日志文件路径文档化
- [ ] `cd apps/api && pytest` 通过
- [ ] `cd apps/desktop && npm run typecheck` 通过
- [ ] `cd apps/desktop && npm run lint` 通过
