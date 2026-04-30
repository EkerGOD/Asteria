# App Data Directory & Local Model Storage

Asteria v0.10.2 调研报告。本文档为后续实现提供方案参考，不涉及代码变更。

## 概述

Asteria 是 desktop-first 应用（Tauri + FastAPI），需要规划应用数据目录结构用于存放配置、缓存、用户数据以及本地 AI 模型文件。本报告基于 Tauri 2 路径 API 和各平台标准给出推荐方案。

## Tauri 2 路径 API

Tauri 2 通过 `tauri::path::PathResolver` 提供以下路径解析方法：

| 方法 | 用途 | 可清空 |
|------|------|--------|
| `app_data_dir()` | 应用持久化数据 | 否 |
| `app_cache_dir()` | 临时缓存数据 | 是 |
| `app_config_dir()` | 配置文件 | 否 |

应用标识符：`com.asteria.desktop`

## 各平台路径解析

### Windows

| 目录 | 路径 |
|------|------|
| Data | `C:\Users\<User>\AppData\Roaming\com.asteria.desktop` |
| Cache | `C:\Users\<User>\AppData\Local\com.asteria.desktop\cache` |
| Config | `C:\Users\<User>\AppData\Roaming\com.asteria.desktop\config` |

参考：`%APPDATA%`（Roaming）、`%LOCALAPPDATA%`（Local）

### macOS

| 目录 | 路径 |
|------|------|
| Data | `~/Library/Application Support/com.asteria.desktop` |
| Cache | `~/Library/Caches/com.asteria.desktop` |
| Config | `~/Library/Preferences/com.asteria.desktop` |

### Linux

| 目录 | 路径 |
|------|------|
| Data | `$XDG_DATA_HOME/com.asteria.desktop` 或 `~/.local/share/com.asteria.desktop` |
| Cache | `$XDG_CACHE_HOME/com.asteria.desktop` 或 `~/.cache/com.asteria.desktop` |
| Config | `$XDG_CONFIG_HOME/com.asteria.desktop` 或 `~/.config/com.asteria.desktop` |

参考：[XDG Base Directory Specification](https://specifications.freedesktop.org/basedir-spec/latest/)

## 推荐目录布局

```
<app_data_dir>/
├── config/
│   └── settings.json          # UI 偏好、主题、快捷键
├── cache/
│   └── provider_models/       # 缓存的 Provider 模型列表
├── data/
│   ├── conversations/         # 可选：对话导出存储
│   └── knowledge/             # 可选：知识库导入/导出
└── models/
    └── embedding/             # 下载的本地 embedding 模型
        └── bge-m3/
            ├── onnx/          # ONNX 格式模型文件
            ├── tokenizer.json
            └── config.json
```

### 目录职责

- **config/**：UI 设置（主题、语言、快捷键绑定等），由前端管理
- **cache/**：可安全清空的缓存（Provider 模型列表缓存、API 响应缓存等）
- **data/**：用户数据（如导出文件、导入文件），未来可能扩展
- **models/**：本地 AI 模型文件（embedding 模型权重），由 FastAPI sidecar 加载

## 本地模型存储规范

### 选型考量

| 格式 | 体积 | 跨平台 | 性能 | 备注 |
|------|------|--------|------|------|
| PyTorch (.pt) | 2-5 GB | 需 Python runtime | 高 | 不适合 Tauri 打包 |
| ONNX (.onnx) | 500 MB-2 GB | ONNX Runtime | 中-高 | 推荐，Rust/Node.js 均可加载 |
| GGUF (.gguf) | 200 MB-1 GB | llama.cpp | CPU 友好 | 更适合 LLM 而非 embedding |

### 推荐方案

- **格式**：ONNX（通过 ONNX Runtime 加载，Rust 和 Python 均有成熟 binding）
- **存放路径**：`<app_data_dir>/models/embedding/<model_name>/`
- **默认模型**：`bge-m3`（BAAI general embedding，1024 维，多语言支持）
- **下载策略**：首次使用时从 HuggingFace Hub 下载，缓存到本地 models 目录

### HuggingFace 模型下载参考

默认 HuggingFace Hub 缓存路径：`~/.cache/huggingface/hub/`（用户全局）。建议不依赖全局缓存，而是将模型下载到 Asteria 自有 `models/` 目录，保持应用自包含。

## 路径暴露方案

### Tauri → 前端

通过 Tauri Rust command 暴露路径给前端：

```rust
// 示例 command
#[tauri::command]
fn get_app_paths(app: tauri::AppHandle) -> Result<AppPaths, String> {
    let data = app.path().app_data_dir()?;
    let cache = app.path().app_cache_dir()?;
    let config = app.path().app_config_dir()?;
    Ok(AppPaths { data, cache, config })
}
```

前端通过 `invoke("get_app_paths")` 获取路径信息。

### Tauri → FastAPI

FastAPI 作为 sidecar 运行时，路径通过以下方式传递：
- 启动时通过环境变量传入（`ASTERIA_DATA_DIR`、`ASTERIA_MODELS_DIR` 等）
- 或由 Tauri 在启动 sidecar 前写入 `.env` 文件

### FastAPI 端接收

在 `apps/api/app/core/config.py` 中扩展 `Settings` 类：

```python
class Settings(BaseSettings):
    # 现有字段 ...
    app_data_dir: str | None = None   # 由 Tauri sidecar 启动时注入
    models_dir: str | None = None     # 本地模型存放路径
```

## 跨平台注意事项

1. **路径创建**：应用启动时确保上述目录存在，使用 `std::fs::create_dir_all`（Rust）或 `pathlib.Path.mkdir(parents=True)`（Python）
2. **权限**：app_data_dir 和 app_config_dir 通常不需要额外权限；打包时需要处理 macOS 沙盒权限
3. **路径分隔符**：统一使用平台原生分隔符，Rust 和 Python 的标准库均支持
4. **Unicode 路径**：Windows 用户名可能包含非 ASCII 字符，需确保路径处理支持 Unicode
5. **打包**：Tauri bundle 时需配置 `resources` 将模型文件包含在安装包中，或实现首次启动下载逻辑

## 参考资料

- [Tauri 2 Path Plugin](https://v2.tauri.app/plugin/path/)
- [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir-spec/latest/)
- [HuggingFace Hub Cache](https://huggingface.co/docs/huggingface_hub/en/guides/manage-cache)
- [ONNX Runtime](https://onnxruntime.ai/)
