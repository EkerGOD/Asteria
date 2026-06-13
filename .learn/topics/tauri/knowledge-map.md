# Tauri Knowledge Map

## 架构与运行模型
- 系统 WebView 与轻量打包
- Rust 后端与前端边界
- IPC 消息传递
- Tauri Runtime 与 WRY/TAO

## 项目结构与开发环境
- create-tauri-app 脚手架
- src-tauri 目录结构
- tauri.conf.json 配置
- 前端框架集成

## 命令与状态管理
- #[tauri::command] 命令
- invoke 调用与类型传递
- AppHandle 与 Manager
- State 托管共享状态
- 事件系统

## 安全模型
- Capabilities 能力配置
- Permissions 权限与 Scope
- CSP 与前端安全
- 文件系统与外部命令边界

## 插件与系统能力
- 官方插件生态
- 文件与对话框插件
- Shell 与系统集成
- 窗口、菜单、托盘

## 构建、发布与维护
- Cargo 与依赖管理
- Bundle 打包配置
- 跨平台差异
- 自动更新
- 调试与日志
