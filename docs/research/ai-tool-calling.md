# AI Tool / Function Calling 技术探索报告

版本：v0.15.0 配套产出
日期：2026-05-01
状态：draft

## 1. 背景与目标

Asteria 当前 Chat 流程是单轮 LLM 调用：用户提问 → (可选 RAG 检索) → AI 生成回答。未来需要 Agent 能力（多步推理、文件操作、知识管理、外部 API 调用），为此需要评估 Tool / Function Calling 的接入方案。

本报告探索三种主流方案在 Asteria 架构下的可行性，给出推荐路径。

## 2. 方案对比

### 2.1 OpenAI Function Calling（原生工具调用）

**原理**：在 Chat Completion 请求中传入 `tools` 定义，模型返回 `tool_calls`，应用执行后把结果以 `role: "tool"` 消息回传，模型继续生成最终回答。

**优势**：
- 与现有 `OpenAICompatibleProviderAdapter` 架构天然兼容
- 一次请求即可声明多个工具，模型自主选择调用
- 生态成熟，主流兼容 API 均支持（vLLM、Ollama、LM Studio 等）
- 错误处理明确（tool 消息可携带 error 字段）

**劣势**：
- 需要 Provider 支持 `tools` 参数和 `tool_calls` 响应（并非所有兼容 API 都支持）
- 工具执行在应用侧（Python 进程），需处理超时、沙箱、并发
- 每次 tool call 消耗额外 token

**适配工作量**：
- `ChatCompletionRequest` 增加 `tools: list[ToolDefinition]` 字段
- `ChatCompletionResult` 增加 `tool_calls: list[ToolCall]` 字段
- `services/chat.py` 增加 tool call 循环逻辑（调用 LLM → 执行工具 → 回传结果 → 继续生成）
- Message 模型已支持 `role: "tool"`，无需 schema 变更
- 预估改动：200-300 行后端代码

### 2.2 MCP（Model Context Protocol）

**原理**：Anthropic 提出的开放协议，通过 JSON-RPC 2.0 在 Client-Host-Server 架构中暴露工具。Server 声明能力（tools/resources/prompts），Client 在 LLM 调用时注入可用工具，Host 负责任务编排。

**优势**：
- 工具生态可扩展，第三方可提供 MCP Server 供 Asteria 调用
- 协议标准化，不绑定特定 Provider
- 支持资源（Resources）和提示模板（Prompts）等能力

**劣势**：
- 协议仍在快速演进，稳定性和生态尚不成熟
- 需要实现完整的 MCP Client（JSON-RPC 传输、能力协商、生命周期管理）
- 目前主要面向 Claude 模型，OpenAI 兼容 Provider 的支持有限
- 引入额外进程（MCP Server），增加运维复杂度
- 与 Asteria 的 Provider Abstraction 层存在架构冲突（MCP 绑定 Anthropic SDK 语义）

**适配工作量**：
- 实现 MCP Client（stdio/HTTP 传输、工具发现、调用）
- 在 `services/chat.py` 中集成 MCP 工具到 tool call 循环
- 配置管理（注册/管理 MCP Server 端点）
- 预估改动：500-800 行后端 + 新依赖 `mcp`

### 2.3 Custom Tool Registry（自建工具注册表）

**原理**：在 Asteria 后端定义工具注册表，每个工具是一个 Python 函数 + Pydantic schema，由应用侧在 LLM 调用前注入，手动解析模型输出的 tool call 意图。

**优势**：
- 完全可控，无外部依赖
- 工具定义与服务代码在同一进程，调用零延迟
- 适合首版有限的工具集（文件读写、知识搜索、对话管理）

**劣势**：
- 不是标准协议，无法对接第三方工具
- 需要自行解析模型的 tool call 输出（结构化输出不稳定）
- 扩展性受限，新增工具需要代码变更

**适配工作量**：
- 定义 ToolRegistry 和 ToolDefinition
- 构建 prompt 模板注入工具声明
- 解析 LLM 输出中的 tool call 意图
- 预估改动：300-400 行后端代码

## 3. Provider 兼容性矩阵

| Provider 类型 | Function Calling | MCP | 说明 |
|---|---|---|---|
| OpenAI (GPT-4o/4.1) | 完整支持 | 第三方适配 | `tools` 参数原生支持 |
| Anthropic (Claude) | 兼容 API 层 | 原生支持 | 通过 OpenAI-compatible 网关使用 tool_use |
| vLLM / Ollama | 部分支持 | 不支持 | 取决于部署的模型是否支持 tool calling |
| LM Studio | 部分支持 | 不支持 | 本地模型 tool calling 能力有限 |
| DeepSeek | 支持 | 不支持 | API 兼容 OpenAI function calling |
| OpenRouter | 支持 | 不支持 | 透传下游 Provider 能力 |

**结论**：OpenAI Function Calling 在当前 Provider 生态中覆盖面最广，Asteria 的 `openai_compatible` 抽象层天然适配。

## 4. 安全考量

### 4.1 工具执行边界
- 工具在 FastAPI 进程中执行，需限制文件系统访问范围（仅限当前 Repository）
- 禁止网络请求类工具访问 localhost API（防止递归调用）
- 工具执行应有超时机制（建议默认 30s）

### 4.2 输入校验
- 所有 tool call 参数需通过 Pydantic schema 校验
- 文件路径类参数需做路径穿越检查
- 禁止 SQL 拼接，工具查询必须走 ORM

### 4.3 用户确认
- 破坏性操作（文件删除、知识归档）需用户确认
- 工具调用应在 UI 中展示（ChatView 显示 "Running tool: ..."）
- 只读操作可自动执行（搜索、读取）

### 4.4 Token 与成本
- Tool call 多轮循环消耗 token，需设置最大轮数（建议 ≤ 10）
- 每次 tool call 记录 token 用量，纳入 Message.token_count

## 5. 推荐路径

### Phase 1（v0.21.0）：Function Calling 基础
- 在 `ChatCompletionRequest` / `ChatCompletionResult` 中增加 `tools` / `tool_calls`
- 实现单轮 tool call 循环（最多 5 轮）
- 首批工具：`search_knowledge`（语义检索）、`list_files`（文件列表）
- ChatView 中展示 tool call 状态

### Phase 2（v0.22.0）：工具扩展
- 增加文件读写、知识 CRUD、对话摘要工具
- 支持 streaming 中的 tool call 中断和展示
- 用户确认机制（危险操作）

### Phase 3（未来版本）：MCP 可选集成
- 当 MCP 协议和 Python SDK 稳定后，评估以 Optional Add-on 形式引入
- 不替换 Function Calling，作为扩展能力层

## 6. 对当前架构的影响

- `app/ai/types.py`：增加 `ToolDefinition`、`ToolCall`、`ToolResult` 类型
- `app/ai/openai_compatible.py`：适配 tools 参数序列化
- `app/services/chat.py`：增加 tool call 循环
- `app/tools/`（新模块）：工具注册表和内置工具
- `apps/desktop`：ChatView 增加 tool call 状态指示器

## 7. 未解决问题

- 本地模型（Ollama/LM Studio）的 tool calling 可用性需要实测验证
- Tool call 的 SSE streaming 展示方案需进一步设计
- MCP 协议的 Python SDK 成熟度需持续跟踪
