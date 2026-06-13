# create-tauri-app 脚手架 - Learning Session

> **Date:** 2026-06-10
> **Topic:** tauri
> **Path:** 项目结构与开发环境/create-tauri-app 脚手架
> **Level:** beginner

---

## Positioning

**create-tauri-app 脚手架** 位于 Tauri 知识树的 **项目结构与开发环境** 分支，是学习 Tauri 开发的第一个实操概念。前面你已经理解了 Tauri 的架构原理（系统 WebView + Rust 后端 + IPC），现在要动手：**如何从零开始创建一个 Taurii 项目？**

create-tauri-app 是 Tauri 官方提供的脚手架工具，帮你快速生成项目骨架，省去手动配置的麻烦。

## Analogy

把创建 Tauri 应用想象成**开一家新餐厅**。

你可以从零开始：自己找店面、装修、买设备、办执照、招聘……这当然可以，但耗时且容易遗漏。

create-tauri-app 就像**加盟连锁品牌**：总部（脚手架工具）给你一套标准方案——店面布局（目录结构）、基础设备（依赖配置）、操作流程（构建脚本）、品牌标识（默认配置）。你拿到手就能开业（开发），后续再根据自己的特色做调整（自定义）。

脚手架不是限制你，而是给你一个**经过验证的起点**。

## Core Mechanism

### 一、create-tauri-app 是什么

create-tauri-app 是 Tauri 团队维护的脚手架工具，类似于：
- React 的 `create-react-app` / `vite create`
- Vue 的 `create-vue`
- Rust 的 `cargo new`

它的作用是：**交互式引导你创建一个新的 Tauri 项目**，自动生成：
- 目录结构
- 依赖配置（package.json、Cargo.toml）
- Tauri 配置（tauri.conf.json）
- 基础代码模板（根据你选择的前端框架）
- 构建脚本

### 二、使用方式

**方式 1：npm/pnpm/yarn（推荐）**

```bash
# npm
npm create tauri-app

# pnpm
pnpm create tauri-app

# yarn
yarn create tauri-app
```

**方式 2：cargo（纯 Rust 项目，不用前端框架）**

```bash
cargo create-tauri-app
```

**方式 3：指定项目名直接创建**

```bash
npm create tauri-app my-tauri-app
cd my-tauri-app
```

### 三、交互式选项

运行 `npm create tauri-app` 后，你会被引导选择：

**1. 项目名称**
```
✔ What is your project name? … my-tauri-app
```

**2. 包名（通常与项目名相同）**
```
✔ What should the package name be? … my-tauri-app
```

**3. 前端框架选择**
```
✔ Choose which language to use for your frontend ›
  ❯ TypeScript
    JavaScript
```

**4. 前端框架/模板**
```
✔ Choose your frontend framework ›
  ❯ Vanilla (纯 HTML/CSS/JS)
    React
    Vue
    Svelte
    Solid
    Preact
```

**5. 包管理器**
```
✔ Choose your package manager ›
  ❯ pnpm
    npm
    yarn
```

**6. Tauri 插件选择（v2 新增）**
```
✔ Choose Tauri plugins ›
  ◉ @tauri-apps/plugin-http (HTTP 请求)
  ◉ @tauri-apps/plugin-fs (文件系统)
  ◉ @tauri-apps/plugin-dialog (对话框)
  ◉ @tauri-apps/plugin-shell (Shell 执行)
```

### 四、生成的项目结构

以 React + TypeScript 为例：

```
my-tauri-app/
├── src/                        # 前端源码
│   ├── main.tsx               # React 入口
│   ├── App.tsx                # 主组件
│   ├── styles.css             # 全局样式
│   └── assets/                # 静态资源
├── src-tauri/                 # Rust 后端
│   ├── src/
│   │   ├── main.rs            # 应用入口
│   │   └── lib.rs             # Tauri 命令注册
│   ├── icons/                 # 应用图标
│   ├── Cargo.toml             # Rust 依赖
│   ├── tauri.conf.json        # Tauri 配置
│   ├── build.rs               # 构建脚本
│   └── capabilities/          # 权限配置（v2）
│       └── default.json
├── public/                    # 前端静态资源
├── package.json               # 前端依赖
├── tsconfig.json              # TypeScript 配置
├── vite.config.ts             # Vite 配置
└── README.md
```

### 五、关键文件说明

**package.json（前端依赖）**
```json
{
  "name": "my-tauri-app",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri"
  },
  "dependencies": {
    "@tauri-apps/api": "^2.0.0",
    "@tauri-apps/plugin-http": "^2.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.6.3",
    "vite": "^6.0.0"
  }
}
```

**src-tauri/Cargo.toml（Rust 依赖）**
```toml
[package]
name = "my-tauri-app"
version = "0.1.0"
description = "A Tauri App"
authors = ["you"]
edition = "2021"

[lib]
name = "my_tauri_app_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2.0.0", features = [] }

[dependencies]
tauri = { version = "2.0.0", features = [] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tauri-plugin-http = "2.0.0"
```

### 六、开发命令

脚手架生成项目后，常用命令：

```bash
# 安装前端依赖
npm install

# 启动开发模式（前端热更新 + Rust 自动重编译）
npm run tauri dev

# 构建生产版本
npm run tauri build

# 仅构建前端（不打包 Tauri）
npm run build

# 仅启动前端开发服务器（不启动 Tauri）
npm run dev
```

### 七、脚手架的设计哲学

**1. 约定优于配置**
脚手架生成的结构遵循 Tauri 的最佳实践，你不需要从零思考"文件应该放哪里"。

**2. 前端框架无关**
Tauri 不绑定特定前端框架。脚手架提供 React/Vue/Svelte/Solid 等模板，但底层 Tauri 配置是相同的。

**3. 渐进式复杂度**
生成的项目是"最小可运行"的。你可以根据需要逐步添加插件、配置、命令，而不是一开始就被复杂配置淹没。

**4. 可 ejected**
脚手架生成的代码都是普通代码，你可以随时修改。没有"魔法"或"黑盒"。

### 八、手动创建 vs 脚手架

| 方式 | 优点 | 缺点 |
|------|------|------|
| 脚手架 | 快速、标准、不易出错 | 灵活性稍低 |
| 手动创建 | 完全控制、理解每个文件 | 耗时、易遗漏配置 |

**建议**：新手用脚手架，老手也可以用手架快速起步，然后根据需要调整。

## Code Example

```bash
# 创建项目的完整流程

# 1. 运行脚手架
npm create tauri-app

# 2. 按提示选择：
#    - 项目名: my-first-tauri-app
#    - 前端语言: TypeScript
#    - 前端框架: React
#    - 包管理器: pnpm
#    - Tauri 插件: http, fs, dialog

# 3. 进入项目目录
cd my-first-tauri-app

# 4. 安装依赖
pnpm install

# 5. 启动开发模式
pnpm tauri dev
```

**项目创建后，修改前端代码：**

```tsx
// src/App.tsx
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const [greeting, setGreeting] = useState("");

  async function handleGreet() {
    // 调用 Rust 后端的 greet 命令
    const result = await invoke<string>("greet", { name: "Tauri" });
    setGreeting(result);
  }

  return (
    <div className="container">
      <h1>Welcome to Tauri!</h1>
      
      <div className="row">
        <button onClick={handleGreet}>Say Hello</button>
      </div>
      
      {greeting && <p className="greeting">{greeting}</p>}
    </div>
  );
}

export default App;
```

**Rust 后端（脚手架已生成）：**

```rust
// src-tauri/src/lib.rs

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

运行 `pnpm tauri dev` 后，你会看到：
1. 前端开发服务器启动（Vite，通常 http://localhost:5173）
2. Tauri 窗口打开，显示前端页面
3. 点击 "Say Hello" 按钮，调用 Rust 命令，显示问候语

## Common Misconceptions

**误解 1：create-tauri-app 只能创建 React 项目。**
纠正：脚手架支持多种前端框架：Vanilla（纯 HTML/CSS/JS）、React、Vue、Svelte、Solid、Preact。你也可以选择 JavaScript 或 TypeScript。

**误解 2：用脚手架创建的项目不能自定义。**
纠正：脚手架生成的只是起点代码。你可以随时修改任何文件、添加依赖、调整配置。没有"锁定"或"不能改"的限制。

**误解 3：必须用脚手架才能创建 Tauri 项目。**
纠正：脚手架是便利工具，不是必须。你也可以手动创建：`cargo new` + 手动添加 Tauri 依赖和配置。但脚手架能帮你避免配置错误。

**误解 4：脚手架生成的项目结构是固定的，不能改。**
纠正：目录结构是约定俗成的最佳实践，但你可以调整。例如，可以把 Rust 代码移到其他目录（需要相应修改 Cargo.toml），可以重命名 src-tauri（需要修改 tauri.conf.json）。

**误解 5：create-tauri-app 和 create-vite 是同一个东西。**
纠正：create-vite 只创建前端项目（React/Vue/Svelte 等），不包含 Tauri 部分。create-tauri-app 创建的是完整的 Tauri 项目（前端 + Rust 后端 + Tauri 配置）。

## Socratic Check

**检验问题 1：**
如果你已经有一个用 Vite 创建的 React 项目，想把它变成 Tauri 项目，应该怎么做？

答案：有两种方式：(1) 在项目根目录运行 `npm install @tauri-apps/cli @tauri-apps/api`，然后运行 `npx tauri init`，按提示配置，这会在项目中添加 src-tauri 目录和必要配置；(2) 用 create-tauri-app 创建一个新的 Tauri 项目，然后把现有代码复制过去。第一种方式更适合已有项目迁移。

**检验问题 2：**
运行 `pnpm tauri dev` 后，修改前端代码和修改 Rust 代码，热更新行为有什么不同？

答案：前端代码（React/Vue 等）修改后，Vite 会热更新（HMR），WebView 中的界面会即时刷新，不需要重启应用。Rust 代码修改后，Tauri 会重新编译 Rust 部分（可能需要几秒到几十秒），然后重启应用窗口。这是因为 Rust 是编译型语言，不能像 JavaScript 那样热更新。

---

## Quick Summary

- create-tauri-app 是 Tauri 官方脚手架工具，用于快速生成项目骨架
- 支持多种前端框架：React、Vue、Svelte、Solid、Preact、Vanilla
- 生成的项目包含前端（src/）和 Rust 后端（src-tauri/）两部分
- 开发命令：`npm run tauri dev` 启动开发模式，`npm run tauri build` 构建生产版本
- 脚手架生成的代码完全可修改，是起点而非限制
- 已有项目可以通过 `npx tauri init` 添加 Tauri 支持

## Next Steps

脚手架帮你生成了项目结构，但你可能还不太清楚每个文件的作用。下一步学习「src-tauri 目录结构」，深入了解 Rust 后端的组织方式。

## References

- create-tauri-app: https://v2.tauri.app/start/create-project/
- Tauri CLI: https://v2.tauri.app/reference/cli/
- Vite: https://vitejs.dev/
