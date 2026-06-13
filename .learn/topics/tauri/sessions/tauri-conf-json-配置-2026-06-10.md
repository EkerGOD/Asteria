# tauri.conf.json 配置 - Learning Session

> **Date:** 2026-06-10
> **Topic:** tauri
> **Path:** 项目结构与开发环境/tauri.conf.json 配置
> **Level:** beginner

---

## Positioning

**tauri.conf.json 配置** 位于 Tauri 知识树的 **项目结构与开发环境** 分支，是 src-tauri 目录中最重要的配置文件。你已经知道 src-tauri 的整体结构，现在要深入理解：**这个 JSON 文件里的每个字段是什么意思？怎么配置才能满足你的需求？**

tauri.conf.json 是 Tauri 应用的"身份证 + 说明书"——定义了应用是谁、长什么样、怎么运行、怎么打包。

## Analogy

把 tauri.conf.json 想象成**餐厅的经营许可证**。

许可证上写着：
- 餐厅名字（productName）
- 老板是谁（identifier）
- 餐厅地址（build.frontendDist）
- 营业时间（build.beforeDevCommand）
- 装修风格（app.windows）
- 安全规定（app.security）
- 外卖包装标准（bundle）

没有这个许可证，餐厅开不了业。配置错了，应用可能跑不起来，或者打包后有问题。

## Core Mechanism

### 一、配置文件位置与格式

```
src-tauri/
└── tauri.conf.json    # 主配置文件
```

Tauri v2 支持 JSON 和 JSON5 格式。推荐用 JSON，并在开头加 `$schema` 获得编辑器智能提示：

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  ...
}
```

### 二、完整配置结构

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  
  // 1. 基本信息
  "productName": "My Tauri App",
  "version": "0.1.0",
  "identifier": "com.example.mytauriapp",
  
  // 2. 构建配置
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:5173",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  
  // 3. 应用配置
  "app": {
    "withGlobalTauri": false,
    "windows": [...],
    "security": {...},
    "trayIcon": {...}
  },
  
  // 4. 打包配置
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [...],
    ...
  },
  
  // 5. 插件配置
  "plugins": {...}
}
```

### 三、各部分详解

#### 1. 基本信息

```json
{
  "productName": "My Tauri App",
  "version": "0.1.0",
  "identifier": "com.example.mytauriapp"
}
```

| 字段 | 说明 | 示例 |
|------|------|------|
| `productName` | 应用显示名称（窗口标题、安装程序名） | "My App" |
| `version` | 应用版本号（语义化版本） | "1.0.0" |
| `identifier` | 应用唯一标识符（反向域名格式） | "com.example.app" |

**identifier 规则：**
- 必须用反向域名格式（如 `com.company.appname`）
- 用于 macOS Bundle ID、Windows AppUserModelID、Linux AppID
- 一旦发布，不要更改（会影响更新和系统识别）

#### 2. 构建配置（build）

```json
{
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:5173",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devwatch": false
  }
}
```

| 字段 | 说明 | 默认值 |
|------|------|--------|
| `frontendDist` | 前端构建输出目录（相对于 src-tauri） | `"../dist"` |
| `devUrl` | 开发时前端服务器地址 | `"http://localhost:5173"` |
| `beforeDevCommand` | 启动开发模式前执行的命令 | `"npm run dev"` |
| `beforeBuildCommand` | 构建生产版本前执行的命令 | `"npm run build"` |
| `devwatch` | 是否监听前端文件变化 | `false` |

**开发模式 vs 生产模式：**
- 开发模式（`tauri dev`）：加载 `devUrl`（前端开发服务器），支持热更新
- 生产模式（`tauri build`）：加载 `frontendDist`（构建后的静态文件），嵌入二进制

#### 3. 应用配置（app）

##### 3.1 窗口配置（app.windows）

```json
{
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "My Tauri App",
        "width": 800,
        "height": 600,
        "minWidth": 400,
        "minHeight": 300,
        "resizable": true,
        "fullscreen": false,
        "decorations": true,
        "transparent": false,
        "alwaysOnTop": false,
        "center": true,
        "url": "index.html"
      }
    ]
  }
}
```

**窗口属性说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `label` | string | 窗口唯一标识（用于代码中引用） |
| `title` | string | 窗口标题 |
| `width` / `height` | number | 窗口初始大小（像素） |
| `minWidth` / `minHeight` | number | 窗口最小尺寸 |
| `maxWidth` / `maxHeight` | number | 窗口最大尺寸 |
| `resizable` | boolean | 是否可调整大小 |
| `fullscreen` | boolean | 是否全屏启动 |
| `decorations` | boolean | 是否显示系统标题栏和边框 |
| `transparent` | boolean | 是否透明窗口（需要系统支持） |
| `alwaysOnTop` | boolean | 是否置顶 |
| `center` | boolean | 是否居中显示 |
| `x` / `y` | number | 窗口位置（覆盖 center） |
| `url` | string | 窗口加载的 URL |
| `visible` | boolean | 是否可见（可隐藏启动） |
| `focus` | boolean | 是否获取焦点 |
| `skipTaskbar` | boolean | 是否在任务栏隐藏 |

##### 3.2 安全配置（app.security）

```json
{
  "app": {
    "security": {
      "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
      "dangerousUseHttpScheme": false,
      "dangerousDisableAssetCspModification": false,
      "freezePrototype": false,
      "assetProtocol": {
        "scope": {
          "allow": ["$APPDATA/**", "$DESKTOP/**"],
          "deny": []
        }
      }
    }
  }
}
```

| 字段 | 说明 |
|------|------|
| `csp` | Content Security Policy（内容安全策略） |
| `dangerousUseHttpScheme` | 使用 http:// 而非 tauri:// 协议（开发用） |
| `assetProtocol.scope` | 文件访问范围限制 |

**CSP 说明：**
- 控制 WebView 可以加载哪些资源
- 防止 XSS 攻击
- 生产环境建议严格配置，开发可以设为 `null`（不限制）

##### 3.3 托盘图标（app.trayIcon）

```json
{
  "app": {
    "trayIcon": {
      "iconPath": "icons/icon.png",
      "iconAsTemplate": false,
      "tooltip": "My App",
      "title": "My App",
      "id": "main-tray"
    }
  }
}
```

#### 4. 打包配置（bundle）

```json
{
  "bundle": {
    "active": true,
    "targets": "all",
    "publisher": "My Company",
    "category": "DeveloperTool",
    "shortDescription": "A Tauri App",
    "longDescription": "A longer description...",
    "copyright": "Copyright © 2026",
    "license": "MIT",
    "homepage": "https://example.com",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "resources": ["assets/*", "data/config.json"],
    "externalBin": ["bin/ffmpeg"],
    "windows": {
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256",
      "timestampUrl": "",
      "wix": null,
      "nsis": {
        "installMode": "currentUser"
      }
    },
    "macOS": {
      "frameworks": [],
      "minimumSystemVersion": "10.15",
      "exceptionDomain": "",
      "signing": {
        "identity": null,
        "providerShortName": null
      },
      "entitlements": null
    },
    "linux": {
      "deb": {
        "depends": [],
        "section": "utility"
      },
      "appimage": {
        "bundleMediaFramework": false
      }
    }
  }
}
```

**关键配置说明：**

| 字段 | 说明 |
|------|------|
| `active` | 是否启用打包 |
| `targets` | 打包目标（`"all"` 或数组如 `["msi", "nsis", "app", "dmg", "deb", "appimage"]`） |
| `icon` | 应用图标列表（不同平台需要不同格式） |
| `resources` | 需要打包的额外资源文件 |
| `externalBin` | 需要打包的外部二进制文件 |
| `windows` | Windows 特定配置（安装程序类型、签名等） |
| `macOS` | macOS 特定配置（签名、框架、最低系统版本） |
| `linux` | Linux 特定配置（deb、appimage 选项） |

**打包目标说明：**

| 平台 | 格式 | 说明 |
|------|------|------|
| Windows | `msi` | Windows Installer |
| Windows | `nsis` | NSIS 安装程序（更灵活） |
| macOS | `app` | macOS 应用包 |
| macOS | `dmg` | DMG 磁盘映像 |
| Linux | `deb` | Debian 包 |
| Linux | `rpm` | RPM 包 |
| Linux | `appimage` | AppImage（跨发行版） |

#### 5. 插件配置（plugins）

```json
{
  "plugins": {
    "fs": {
      "scope": {
        "allow": ["$APPDATA/**", "$DESKTOP/**"],
        "deny": ["$HOME/.ssh/**"]
      }
    },
    "http": {
      "scope": {
        "allow": ["https://api.example.com/**"],
        "deny": ["https://*.malicious.com/**"]
      }
    },
    "shell": {
      "scope": [
        {
          "name": "git",
          "cmd": "git",
          "args": ["status", "--porcelain"]
        }
      ]
    }
  }
}
```

**插件配置说明：**
- 每个插件可以有自己的配置项
- 常见的是 `scope`（范围限制），控制插件可以访问什么
- `fs` 插件：控制文件访问路径
- `http` 插件：控制可以请求的 URL
- `shell` 插件：控制可以执行的命令

### 四、配置优先级与环境变量

Tauri 支持多环境配置：

```
src-tauri/
├── tauri.conf.json          # 基础配置
├── tauri.conf.json.dev      # 开发环境覆盖（可选）
└── tauri.conf.prod.json     # 生产环境覆盖（可选）
```

环境变量也可以覆盖配置：

```bash
TAURI_PRODUCT_NAME="My Custom App" npm run tauri dev
```

### 五、配置验证

Tauri CLI 会在启动时验证配置。如果配置有误，会报错提示：

```
error: failed to load tauri.conf.json
  → invalid value for field "app.windows[0].width"
  → expected positive integer, found -100
```

也可以用 JSON Schema 在编辑器中获得实时提示和验证。

## Code Example

**一个完整的生产级 tauri.conf.json 示例：**

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "TaskFlow",
  "version": "1.0.0",
  "identifier": "com.taskflow.app",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:5173",
    "beforeDevCommand": "pnpm dev",
    "beforeBuildCommand": "pnpm build"
  },
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "TaskFlow",
        "width": 1024,
        "height": 768,
        "minWidth": 800,
        "minHeight": 600,
        "resizable": true,
        "center": true,
        "decorations": true,
        "transparent": false
      },
      {
        "label": "settings",
        "title": "Settings",
        "width": 600,
        "height": 400,
        "resizable": false,
        "center": true,
        "visible": false,
        "url": "settings.html"
      }
    ],
    "security": {
      "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' asset: https://asset.localhost data:;"
    },
    "trayIcon": {
      "iconPath": "icons/icon.png",
      "tooltip": "TaskFlow - Task Manager"
    }
  },
  "bundle": {
    "active": true,
    "targets": ["msi", "nsis", "app", "dmg", "deb", "appimage"],
    "publisher": "TaskFlow Inc.",
    "category": "Productivity",
    "shortDescription": "A beautiful task manager",
    "longDescription": "TaskFlow is a modern, cross-platform task management application built with Tauri.",
    "copyright": "Copyright © 2026 TaskFlow Inc.",
    "license": "MIT",
    "homepage": "https://taskflow.app",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "resources": [
      "assets/templates/*",
      "data/default-config.json"
    ],
    "windows": {
      "nsis": {
        "installMode": "currentUser",
        "displayLanguageSelector": true
      }
    },
    "macOS": {
      "minimumSystemVersion": "10.15",
      "signing": {
        "identity": null
      }
    },
    "linux": {
      "deb": {
        "depends": ["libwebkit2gtk-4.1-0", "libgtk-3-0"]
      }
    }
  },
  "plugins": {
    "fs": {
      "scope": {
        "allow": ["$APPDATA/**", "$DOCUMENT/**"],
        "deny": ["$HOME/.ssh/**", "$HOME/.gnupg/**"]
      }
    },
    "http": {
      "scope": ["https://api.taskflow.app/**", "https://*.taskflow.app/**"]
    },
    "shell": {
      "scope": [
        {
          "name": "git",
          "cmd": "git",
          "args": true
        }
      ]
    }
  }
}
```

## Common Misconceptions

**误解 1：tauri.conf.json 修改后需要重启开发服务器。**
纠正：取决于修改的内容。修改 `app.windows` 等运行时配置需要重启应用（`tauri dev` 会自动检测并重启）。修改 `bundle` 配置只影响打包，不影响开发。

**误解 2：devUrl 和 frontendDist 可以同时使用。**
纠正：不能。开发模式用 `devUrl`（加载开发服务器），生产模式用 `frontendDist`（加载构建产物）。Tauri 根据运行模式自动选择。

**误解 3：identifier 可以随便写。**
纠正：identifier 必须用反向域名格式（如 `com.example.app`），且一旦发布不能更改。它用于系统识别应用（更新、数据目录、进程管理等）。

**误解 4：CSP 设为 null 是最佳实践。**
纠正：`csp: null` 表示不限制，适合开发环境。生产环境应该设置严格的 CSP，防止 XSS 攻击。例如：`"default-src 'self'; script-src 'self'"`。

**误解 5：bundle.targets 设为 "all" 会打包所有格式。**
纠正：`"all"` 会尝试打包当前平台支持的所有格式。Windows 上打包 `msi` 和 `nsis`，macOS 上打包 `app` 和 `dmg`，Linux 上打包 `deb`、`rpm` 和 `appimage`。跨平台打包需要在对应平台上运行。

## Socratic Check

**检验问题 1：**
如果你的前端项目用 Vite 构建，但输出目录不是 `dist` 而是 `build`，应该怎么配置？

答案：修改 `build.frontendDist` 为 `"../build"`（相对于 src-tauri 目录）。同时确保 `vite.config.ts` 中的 `build.outDir` 也是 `"build"`。

**检验问题 2：**
如果你想让应用启动时不显示窗口，而是显示系统托盘图标，用户点击托盘图标才显示窗口，应该怎么配置？

答案：在 `app.windows` 中设置 `"visible": false`，让主窗口启动时隐藏。然后在 `app.trayIcon` 中配置托盘图标。在 Rust 代码中监听托盘点击事件，调用 `window.show()` 显示窗口。

---

## Quick Summary

- tauri.conf.json 是 Tauri 应用的核心配置文件
- 基本信息：productName、version、identifier（反向域名格式）
- 构建配置：frontendDist（生产）、devUrl（开发）、beforeDevCommand/beforeBuildCommand
- 窗口配置：大小、位置、是否可调整、装饰、透明等
- 安全配置：CSP、文件访问范围
- 打包配置：目标格式、图标、资源、平台特定选项
- 插件配置：各插件的 scope 和选项

## Next Steps

掌握了 tauri.conf.json 配置后，「项目结构与开发环境」分支的最后一个概念是「前端框架集成」，学习如何将 Tauri 与 React/Vue/Svelte 等前端框架配合使用。

## References

- Tauri Configuration: https://v2.tauri.app/reference/config/
- Tauri Security: https://v2.tauri.app/security/
- Tauri Bundle: https://v2.tauri.app/distribute/
- CSP: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
