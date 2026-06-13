# Tauri Runtime 与 WRY/TAO - Learning Session

> **Date:** 2026-06-10
> **Topic:** tauri
> **Path:** 架构与运行模型/Tauri Runtime 与 WRY/TAO
> **Level:** beginner

---

## Positioning

**Tauri Runtime 与 WRY/TAO** 是「架构与运行模型」分支的最后一个概念，也是最底层的一个。前面三个概念讲了 Tauri 的"是什么"（系统 WebView + Rust 后端）、"怎么分工"（前后端边界）、"怎么通信"（IPC），这个概念要讲：**Tauri 底层靠什么跑起来？**

理解这一层后，你会明白 Tauri 不是从零造轮子，而是站在 WRY 和 TAO 这两个库的肩膀上。

## Analogy

把构建 Tauri 应用想象成**建造一栋房子**。

你已经知道：
- 房子用系统 WebView 做"窗户"（前端 UI 从这里展示）
- Rust 是"内部结构"（承重墙、管道、电路）
- IPC 是"门和走廊"（连接各个房间）

现在要问：**房子建在什么上面？**

答案是：**地基和框架**。

- **TAO** = 地基和建筑框架（窗口管理、事件循环、输入处理）
- **WRY** = 窗户安装系统（WebView 的创建和管理）
- **Tauri Runtime** = 把 TAO 和 WRY 组装在一起的"建筑规范"（抽象层）
- **Tauri 框架** = 完整的房子（在 Runtime 之上加了命令系统、插件、安全模型等）

你作为 Tauri 开发者，通常不需要直接操作 TAO 和 WRY（就像住在房子里不需要碰地基），但了解它们能帮你理解 Tauri 的能力和限制。

## Core Mechanism

### 一、Tauri 的技术栈分层

```
┌─────────────────────────────────────────────────────┐
│              你的 Tauri 应用                          │
│   (Rust 命令 + 前端 UI + 插件 + 配置)                 │
├─────────────────────────────────────────────────────┤
│              Tauri 框架                              │
│   (命令系统 / 插件系统 / 安全模型 / 构建工具)           │
├─────────────────────────────────────────────────────┤
│              Tauri Runtime                           │
│   (抽象层：定义窗口、事件循环、WebView 的统一接口)       │
├──────────────────────┬──────────────────────────────┤
│        TAO           │           WRY                │
│   窗口与事件循环       │      WebView 管理             │
│   (跨平台抽象)        │     (跨平台抽象)               │
├──────────────────────┴──────────────────────────────┤
│              操作系统 API                             │
│   Windows: Win32 API / WebView2                     │
│   macOS:   Cocoa / WKWebView                        │
│   Linux:   GTK / WebKitGTK                          │
└─────────────────────────────────────────────────────┘
```

### 二、TAO：跨平台窗口与事件循环

**TAO** 是 Tauri 团队维护的 Rust 库，负责：

| 职责 | 说明 |
|------|------|
| 窗口创建 | 创建原生窗口（标题栏、边框、大小调整） |
| 事件循环 | 管理应用的主事件循环（macOS 的 NSApplication、Windows 的消息循环、Linux 的 GTK main loop） |
| 输入处理 | 键盘、鼠标、触摸事件的捕获和分发 |
| 显示器管理 | 多显示器支持、 DPI 感知 |
| 应用生命周期 | 应用启动、激活、挂起、退出 |

**TAO 的底层实现：**
- Windows: Win32 API
- macOS: Cocoa/AppKit
- Linux: GTK3
- Android: android-native-app-glue
- iOS: UIKit

**TAO 之于 Tauri，就像 GLFW/SDL 之于游戏引擎**——提供底层的窗口和事件循环抽象。

### 三、WRY：跨平台 WebView 管理

**WRY**（Web Render librarY）也是 Tauri 团队维护的 Rust 库，负责：

| 职责 | 说明 |
|------|------|
| WebView 创建 | 在窗口中嵌入系统 WebView |
| WebView 控制 | 加载 URL、执行 JavaScript、导航控制 |
| 自定义协议 | 注册 `tauri://` 等自定义协议 |
| DevTools | 开发模式下的调试工具支持 |
| RPC 通信 | WebView 与 Rust 之间的底层通信通道 |

**WRY 的底层实现：**
- Windows: WebView2 (Edge Chromium)
- macOS: WKWebView (WebKit)
- Linux: WebKitGTK
- Android: Android WebView
- iOS: WKWebView

**WRY 之于 Tauri，就像 CEF/Electron 的 WebView 封装层**——但 WRY 更轻量，只负责 WebView 管理，不捆绑 Chromium。

### 四、Tauri Runtime：抽象层

**Tauri Runtime** 是 Tauri 框架内部的一层抽象，它定义了：

- 窗口 trait（Window trait）
- WebView trait
- 事件循环 trait
- 用户事件 trait

这层抽象的好处：
1. **可测试性**：可以用 mock 实现做单元测试
2. **可替换性**：理论上可以替换底层实现（虽然实际上很少这样做）
3. **统一接口**：Tauri 框架代码不直接依赖 TAO/WRY 的具体实现

### 五、为什么你需要了解这些？

作为 Tauri 应用开发者，你通常不需要直接操作 TAO 和 WRY。但了解它们能帮你：

**1. 理解平台差异的来源**

当你在 Windows 上遇到 WebView 行为与 macOS 不同时，你知道这是因为底层分别是 WebView2 和 WKWebView，它们通过 WRY 抽象，但细节差异仍然存在。

**2. 排查底层问题**

如果窗口创建失败、事件循环卡死、WebView 白屏，你知道问题可能出在 TAO 或 WRY 层，而不是你的应用代码。

**3. 使用底层 API（必要时）**

Tauri 允许你在需要时直接访问 TAO/WRY 的能力。例如：
- 自定义窗口装饰（TAO 的窗口属性）
- 拦截 WebView 导航（WRY 的导航 delegate）
- 注入自定义 JavaScript（WRY 的 init script）

**4. 参与 Tauri 生态贡献**

如果你想为 Tauri 核心贡献代码，或者开发需要底层控制的插件，理解 TAO/WRY 是必要的。

### 六、技术栈关系总结

| 库 | 维护者 | 职责 | 你直接使用的频率 |
|---|--------|------|-----------------|
| Tauri | Tauri 团队 | 完整应用框架（命令、插件、安全、构建） | 高（每天都在用） |
| Tauri Runtime | Tauri 团队 | 抽象层（trait 定义） | 低（框架内部使用） |
| TAO | Tauri 团队 | 窗口、事件循环、输入 | 低（偶尔配置窗口属性） |
| WRY | Tauri 团队 | WebView 管理 | 低（偶尔配置 WebView 行为） |
| 系统 WebView | OS 厂商 | 实际的网页渲染 | 不直接使用 |

### 七、事件循环：TAO 的核心

事件循环是桌面应用的"心脏"。TAO 管理的事件循环大致如下：

```
应用启动
    ↓
初始化窗口和 WebView
    ↓
进入事件循环 ←──────────────┐
    ↓                       │
等待事件（用户输入、          │
系统消息、定时器、IPC）       │
    ↓                       │
分发事件给对应的处理器        │
    ↓                       │
处理完毕 ──────────────────→┘
    ↓
应用退出
```

**关键点：**
- 事件循环是单线程的（主线程），所有 UI 操作必须在主线程执行
- Tauri 的命令（`#[tauri::command]`）默认在事件循环线程执行
- 异步命令（`async fn`）在 Tauri 的线程池中执行，但回调仍在主线程
- 长时间阻塞主线程会导致 UI 卡死

## Code Example

```rust
// src-tauri/src/lib.rs
// 示例：使用 Tauri 的高级 API（底层由 TAO/WRY 支持）

use tauri::{
    Manager,           // 提供 window()、app_handle() 等方法
    WindowBuilder,     // 窗口构建器（底层用 TAO）
    WebviewUrl,        // WebView URL 配置（底层用 WRY）
    Emitter,           // 事件发送能力
};

// 示例 1：创建自定义窗口（TAO 能力）
#[tauri::command]
fn create_settings_window(app: tauri::AppHandle) -> Result<(), String> {
    // 检查窗口是否已存在
    if app.get_webview_window("settings").is_some() {
        return Ok(());
    }

    // 创建新窗口（底层调用 TAO 的窗口创建 API）
    let _window = WindowBuilder::new(&app, "settings", tauri::WebviewUrl::App("settings.html".into()))
        .title("Settings")
        .inner_size(800.0, 600.0)
        .resizable(true)
        .center()
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

// 示例 2：在 WebView 加载完成后执行操作（WRY 能力）
fn setup_webview_hooks(app: &tauri::AppHandle) {
    // 监听窗口 ready 事件
    app.once("window-ready", move |event| {
        println!("Window is ready: {:?}", event);
    });
}

// 示例 3：自定义协议（WRY 能力）
// 在 tauri.conf.json 中配置，或在代码中注册
// WRY 允许你注册自定义 URL 协议，如 "myapp://"
// 当 WebView 加载 "myapp://some-path" 时，你可以拦截并返回自定义内容

// 示例 4：异步命令与事件循环的关系
#[tauri::command]
async fn long_running_task(app: tauri::AppHandle) -> Result<String, String> {
    // 这个命令在 Tauri 线程池中执行，不阻塞主事件循环
    // 模拟耗时操作
    for i in 1..=5 {
        tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
        // 向主线程发送进度事件
        app.emit("task-progress", format!("Progress: {}%", i * 20))
            .map_err(|e| e.to_string())?;
    }
    Ok("Task completed!".to_string())
}

// 示例 5：访问底层窗口句柄（TAO 能力，高级用法）
#[tauri::command]
fn get_window_info(window: tauri::Window) -> String {
    // 获取窗口信息（底层通过 TAO 获取平台窗口句柄）
    let scale_factor = window.scale_factor().unwrap_or(1.0);
    let position = window.outer_position().unwrap_or_default();
    let size = window.outer_size();

    format!(
        "Scale: {}, Position: ({}, {}), Size: {}x{}",
        scale_factor, position.x, position.y, size.width, size.height
    )
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            setup_webview_hooks(app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            create_settings_window,
            long_running_task,
            get_window_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

```typescript
// src/main.ts
// 前端：调用使用底层能力的命令

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

// 创建设置窗口
async function openSettings() {
  await invoke("create_settings_window");
}

// 执行耗时任务并监听进度
async function runLongTask() {
  // 先监听进度事件
  const unlisten = await listen<string>("task-progress", (event) => {
    console.log("Progress:", event.payload);
    updateProgressBar(event.payload);
  });

  try {
    // 调用异步命令（不阻塞 UI）
    const result = await invoke<string>("long_running_task");
    console.log("Result:", result);
  } finally {
    unlisten(); // 取消监听
  }
}

// 获取窗口信息
async function showWindowInfo() {
  const info = await invoke<string>("get_window_info");
  alert(info);
}

function updateProgressBar(progress: string) {
  // 更新 UI 进度条...
}

// 绑定按钮
document.querySelector("#settings-btn")?.addEventListener("click", openSettings);
document.querySelector("#task-btn")?.addEventListener("click", runLongTask);
document.querySelector("#info-btn")?.addEventListener("click", showWindowInfo);
```

这段代码展示了 Tauri 底层能力的实际使用：

- **`WindowBuilder`**：创建自定义窗口，底层由 TAO 处理平台差异
- **事件循环**：`long_running_task` 是异步命令，在线程池执行，不阻塞主事件循环
- **事件系统**：通过 `emit` 从 Rust 向主线程/前端发送消息
- **窗口信息**：`get_window_info` 通过 TAO 获取平台窗口属性（缩放因子、位置、大小）

你作为开发者使用的是 Tauri 的高级 API，但底层是 TAO 和 WRY 在处理跨平台差异。

## Common Misconceptions

**误解 1：Tauri 自己实现了 WebView 渲染引擎。**
纠正：Tauri 不实现渲染引擎。它通过 WRY 库调用系统 WebView（WebView2/WKWebView/WebKitGTK）。渲染工作由系统 WebView 完成，Tauri 只负责管理和通信。

**误解 2：TAO 和 WRY 是 Tauri 独有的，不能单独使用。**
纠正：TAO 和 WRY 是独立的 Rust 库，可以脱离 Tauri 单独使用。你可以用 TAO 创建窗口和事件循环，用 WRY 嵌入 WebView，而不使用 Tauri 的命令系统、插件等高级功能。不过，Tauri 是最常用的 TAO+WRY 组合。

**误解 3：了解 TAO/WRY 对日常 Tauri 开发很重要。**
纠正：对于大多数 Tauri 应用开发，你不需要直接操作 TAO/WRY。Tauri 框架已经封装了它们的常用功能。了解它们主要是为了：(1) 理解底层原理；(2) 排查疑难问题；(3) 开发需要底层控制的插件。

**误解 4：Tauri 的事件循环和 Node.js 的事件循环一样。**
纠正：不一样。TAO 的事件循环是原生桌面应用的事件循环（Windows 消息循环、macOS NSApplication 等），而 Node.js 的事件循环是 libuv 实现的异步 I/O 事件循环。Tauri 的 `async` 命令使用 Rust 的 tokio 运行时，与 TAO 的事件循环是独立的。

**误解 5：WRY 会捆绑 Chromium 运行时。**
纠正：WRY 不捆绑任何浏览器运行时。它只调用系统已有的 WebView 组件。Windows 上用 WebView2（Edge 的 Chromium 组件，系统自带或可安装），macOS 上用 WKWebView（系统自带），Linux 上用 WebKitGTK（包管理器安装）。

## Socratic Check

**检验问题 1：**
如果你在 Tauri 应用中执行一个同步的、耗时的 Rust 命令（比如 `std::thread::sleep(10秒)`），会发生什么？怎么避免？

答案：同步命令在 Tauri 的事件循环线程执行。如果命令耗时 10 秒，整个事件循环会被阻塞，UI 会卡死 10 秒（无法响应点击、无法渲染动画）。避免方法：(1) 使用 `async fn` 命令，让耗时操作在 tokio 线程池执行；(2) 在同步命令中使用 `std::thread::spawn` 开新线程，但要注意线程间通信。

**检验问题 2：**
为什么 Tauri 要把 TAO（窗口）和 WRY（WebView）分成两个库，而不是合二为一？

答案：关注点分离。TAO 负责窗口和事件循环（与 WebView 无关），WRY 只负责 WebView 管理。这样：(1) TAO 可以用于不需要 WebView 的原生窗口应用；(2) WRY 可以用于已有窗口系统的场景；(3) 两个库可以独立演进和测试；(4) 符合 Unix 哲学——每个库做好一件事。

---

## Quick Summary

- Tauri 底层依赖 TAO（窗口/事件循环）和 WRY（WebView 管理）两个 Rust 库
- TAO 抽象了跨平台窗口创建和事件循环（Win32/Cocoa/GTK）
- WRY 抽象了跨平台 WebView 管理（WebView2/WKWebView/WebKitGTK）
- Tauri Runtime 是抽象层，定义统一接口，提高可测试性和可替换性
- 日常开发通常不直接操作 TAO/WRY，但了解它们有助于排查底层问题和理解平台差异
- 事件循环是单线程的，耗时操作应使用 async 命令避免阻塞 UI

## Next Steps

恭喜你！「架构与运行模型」分支的 4 个概念全部完成。你已经掌握了 Tauri 的核心架构：
- 系统 WebView 与轻量打包
- Rust 后端与前端边界
- IPC 消息传递
- Tauri Runtime 与 WRY/TAO

下一步建议进入「项目结构与开发环境」分支，学习如何实际搭建和配置 Tauri 项目。

## References

- TAO repository: https://github.com/tauri-apps/tao
- WRY repository: https://github.com/tauri-apps/wry
- Tauri Architecture: https://v2.tauri.app/concept/architecture/
- Tauri Runtime source: https://github.com/tauri-apps/tauri/tree/dev/crates/tauri-runtime
