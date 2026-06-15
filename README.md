# Asteria

[English](./README.en.md)

轻量级 Markdown 编辑器，基于 Tauri v2 + Vue 3 + TypeScript 构建，核心精简，通过插件系统扩展功能（规划中）。

## 特性

- 文件树：创建、重命名、删除文件/文件夹
- 多标签页编辑
- Markdown 编辑器，支持语法高亮与实时预览
- 全目录搜索与替换
- 自定义 `asteria://` 协议渲染本地图片
- 窗口状态与打开的标签页持久化

## 技术栈

- **前端**：Vue 3 + TypeScript + CodeMirror 6
- **后端**：Tauri v2 (Rust)
- **构建**：Vite + Bun

## 快速开始

```bash
# 安装依赖
bun install

# 开发模式运行
bun run tauri dev

# 生产构建
bun run tauri build
```

## 项目结构

```
asteria/
  src/                  # Vue 前端
    components/         # UI 组件
    composables/        # Vue 组合式函数
    editor/             # CodeMirror 扩展
    parser/             # Markdown 词法/语法解析器
  src-tauri/            # Rust 后端
    src/commands/       # Tauri IPC 命令
    capabilities/       # 权限配置
```

## 路线图

- 插件系统（类似 Obsidian 扩展机制）

## 许可证

MIT