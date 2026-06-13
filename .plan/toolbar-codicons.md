# 计划：VSCode 风格工具栏 + Codicons 图标替换

## 目标

为 asteria 应用添加 VSCode 风格的顶部工具栏（File / Edit / View / Help 下拉菜单），将面板折叠按钮移至工具栏右侧，并用 `@vscode/codicons` 替换所有 Unicode/Emoji 图标。

---

## 最终架构

```
App.vue  (provide: useAppShell + useEditorActions)
├── Toolbar.vue          ← 新增：菜单栏 + 右侧折叠按钮
│   └── MenuDropdown.vue ← 新增：可复用下拉菜单组件
├── Sidebar.vue          ← 修改：折叠状态由 inject 控制，移除内部 toggle
│   └── FileTree.vue     ← 修改：图标替换为 codicons
├── main-content
│   ├── TabBar.vue       ← 修改：图标替换为 codicons
│   └── MarkdownEditor.vue ← 修改：通过 composable 暴露编辑器操作
```

---

## 新增文件

| 文件 | 用途 |
|---|---|
| `src/components/toolbar/Toolbar.vue` | 菜单栏组件：左侧菜单按钮 + 右侧折叠按钮 |
| `src/components/toolbar/MenuDropdown.vue` | 可复用下拉菜单（v-for 渲染菜单项） |
| `src/composables/useAppShell.ts` | 共享状态：sidebar 折叠、主题切换 |
| `src/composables/useEditorActions.ts` | 编辑器操作接口：undo/redo/cut/copy/paste/selectAll |

---

## 修改文件

| 文件 | 改动 |
|---|---|
| `src/App.vue` | 引入 Toolbar，provide composables，提升 sidebar 状态 |
| `src/components/layout/Sidebar.vue` | 移除内部 toggle 按钮，collapsed 时 width: 0 |
| `src/components/file-tree/FileTree.vue` | Unicode 图标 → codicon SVG |
| `src/components/file-tree/FileTreeNode.vue` | Unicode 图标 → codicon SVG |
| `src/components/tabs/TabBar.vue` | `×` / `·` → codicon SVG |
| `src/components/editor/MarkdownEditor.vue` | 将 editorView 注册到 useEditorActions |
| `asteria/vite.config.ts` | 添加 vitest 配置 |
| `asteria/package.json` | 新增依赖：vitest, @vue/test-utils, jsdom, @vscode/codicons |

---

## Composable 接口定义

```ts
// useAppShell.ts
{
  sidebarCollapsed: Ref<boolean>,
  toggleSidebar: () => void,
  theme: Ref<'light' | 'dark'>,
  toggleTheme: () => void   // 切换 data-theme 属性
}

// useEditorActions.ts
{
  undo: () => void,
  redo: () => void,
  cut: () => void,
  copy: () => void,
  paste: () => void,
  selectAll: () => void,
  registerEditor: (editor: EditorView) => void
}
```

---

## 菜单项 → 行为映射

### File 菜单

| 菜单项 | 行为 | 实现方式 |
|---|---|---|
| Open Folder | 选择目录作为工作区根目录 | `@tauri-apps/plugin-dialog` `open({ directory: true })` |
| Open File | 选择文件并在新 tab 中打开 | `dialog.open()` → `useTabs().openFile()` |
| New File | 在当前目录创建新文件 | Tauri `create_file` 命令 |
| Save | 保存当前 tab 内容 | Tauri `write_file` 命令 |
| Save As | 另存为对话框 | `dialog.save()` → `write_file` |
| Close Tab | 关闭当前活动 tab | `useTabs().closeTab(activeId)` |
| Exit | 退出应用 | `appWindow.close()` from `@tauri-apps/api/window` |

### Edit 菜单

| 菜单项 | 行为 | 实现方式 |
|---|---|---|
| Undo | 编辑器撤销 | `useEditorActions().undo()` → CM6 `undo` |
| Redo | 编辑器重做 | `useEditorActions().redo()` → CM6 `redo` |
| Cut | 剪切 | `useEditorActions().cut()` → CM6 `copy` + `delete` |
| Copy | 复制 | `useEditorActions().copy()` → CM6 `copy` |
| Paste | 粘贴 | `useEditorActions().paste()` → CM6 `paste` |
| Select All | 全选 | `useEditorActions().selectAll()` → CM6 `selectAll` |

### View 菜单

| 菜单项 | 行为 |
|---|---|
| Toggle Sidebar | `useAppShell().toggleSidebar()` |
| Toggle Dark Mode | `useAppShell().toggleTheme()` → 设置 `<html data-theme="dark/light">` |

### Help 菜单

| 菜单项 | 行为 |
|---|---|
| About | `dialog.message("Asteria - Markdown Editor v0.1.0")` |
| Welcome | `dialog.message("Welcome to Asteria! ...")` |

---

## 图标映射表

| 当前位置 | 当前图标 | 替换为 |
|---|---|---|
| Sidebar toggle | `◀` / `▶` (Unicode) | `codicon-chevron-left` / `codicon-chevron-right` |
| FileTree 折叠 | `▶` / `▼` (Unicode) | `codicon-chevron-right` / `codicon-chevron-down` |
| FileTree 文件夹(闭合) | 📁 | `codicon-folder` |
| FileTree 文件夹(展开) | 📂 | `codicon-folder-opened` |
| FileTree 文件 | 📄 | `codicon-file` |
| TabBar 关闭按钮 | `×` | `codicon-close` |
| TabBar 脏标记 | `·` | `codicon-circle-filled` |
| Toolbar 折叠按钮 | (新增) | `codicon-layout-sidebar-left` / `codicon-layout-sidebar-left-off` |

---

## TDD 开发顺序（垂直切片，一次一个）

按顺序执行，每步完成后才可以进入下一步。**当前会话结束后，从第 1 步开始。**

### 第 1 步：安装依赖

安装以下 npm 包（在 `asteria/` 目录下）：

```
bun add -D vitest @vue/test-utils jsdom
bun add @vscode/codicons
```

在 `asteria/vite.config.ts` 中添加 vitest 配置。

**验证**：`bunx vitest run` 能正常运行（即使没有测试文件）。

---

### 第 2 步：useAppShell composable（RED → GREEN → REFACTOR）

**测试行为：**
- `sidebarCollapsed` 默认值为 `false`
- `toggleSidebar()` 翻转 `sidebarCollapsed` 的值
- `theme` 默认值为 `'light'`
- `toggleTheme()` 在 `'light'` 和 `'dark'` 之间切换
- `toggleTheme()` 实际设置 `document.documentElement` 的 `data-theme` 属性

**实现文件**：`src/composables/useAppShell.ts`

---

### 第 3 步：useEditorActions composable（RED → GREEN → REFACTOR）

**测试行为：**
- `registerEditor(editor)` 存储 editor 引用
- 在未注册 editor 时调用 `undo/redo/cut/copy/paste/selectAll` 不抛异常（安全 no-op）
- 注册后，`undo()` 调用 editor 的 CM6 undo 命令
- 注册后，`selectAll()` 全选编辑器内容
- 注册后，`cut/copy/paste` 执行对应剪贴板操作

**实现文件**：`src/composables/useEditorActions.ts`

---

### 第 4 步：MenuDropdown 组件（RED → GREEN → REFACTOR）

**测试行为：**
- 传入 `items` props，正确渲染所有菜单项
- 点击菜单项触发 `@select` 事件，携带对应项数据
- 点击菜单外部区域关闭下拉菜单
- 按下 Escape 键关闭下拉菜单
- 菜单项可显示图标 + 标签 + 快捷键
- 分隔线类型的菜单项渲染为分隔线而非可点击项

**实现文件**：`src/components/toolbar/MenuDropdown.vue`

**菜单项数据结构**：
```ts
interface MenuItem {
  id: string
  label: string
  icon?: string        // codicon class name
  shortcut?: string     // e.g. "Ctrl+S"
  type?: 'normal' | 'separator'
  disabled?: boolean
}
```

---

### 第 5 步：Toolbar 组件（RED → GREEN → REFACTOR）

**测试行为：**
- 渲染 File / Edit / View / Help 四个菜单按钮
- 点击按钮打开对应下拉菜单
- 再次点击同一按钮关闭下拉菜单
- 点击不同按钮切换下拉菜单
- 右侧渲染面板折叠按钮
- 点击折叠按钮调用 `toggleSidebar()`
- 菜单项选中后关闭下拉菜单

**实现文件**：`src/components/toolbar/Toolbar.vue`

---

### 第 6 步：Sidebar 修改（RED → GREEN → REFACTOR）

**测试行为：**
- 接收 `collapsed` prop（由父组件控制）
- `collapsed = true` 时 width 为 0，内容不可见
- `collapsed = false` 时 width 为 260px，内容可见
- 内部 toggle 按钮已移除
- 过渡动画保持（0.15s ease）

**实现文件**：`src/components/layout/Sidebar.vue`

---

### 第 7 步：App.vue 集成（RED → GREEN → REFACTOR）

**测试行为（手动验证为主）：**
- Toolbar 出现在页面顶部
- Sidebar 折叠状态由 Toolbar 右侧按钮控制
- 主题切换修改 `data-theme` 属性
- 编辑器注册到 useEditorActions

**实现文件**：`src/App.vue`

---

### 第 8 步：图标替换（全文件）

**修改文件：**
- `src/components/layout/Sidebar.vue` — toggle 图标（如果还有的话）
- `src/components/file-tree/FileTreeNode.vue` — 文件夹/文件图标 + 折叠图标
- `src/components/tabs/TabBar.vue` — 关闭和脏标记图标
- `src/components/toolbar/Toolbar.vue` — 折叠按钮图标

**验证**：`bunx vue-tsc --noEmit` 类型检查通过，`bun run tauri dev` 视觉确认。

---

### 第 9 步：接入真实行为（RED → GREEN → REFACTOR）

将菜单项连接到真实的 Tauri 命令和 CM6 操作：

- File 菜单各项调用对应的 Tauri 命令和 dialog API
- Edit 菜单通过 useEditorActions 操作 CM6
- View 菜单的 Toggle Dark Mode 实际切换主题

**验证**：在 `bun run tauri dev` 中手动测试每个菜单项。

---

### 第 10 步：重构

- 消除重复代码
- 将组件中的硬编码颜色迁移到 `variables.css` 的 CSS 变量
- 确保 dark mode 下所有组件正确响应
- 检查类型安全：`bunx vue-tsc --noEmit`
- 检查构建：`bun run build`

---

## 验收标准

- [ ] 页面顶部出现 File / Edit / View / Help 菜单栏
- [ ] 每个菜单点击后展开下拉菜单，内容与上述映射表一致
- [ ] 工具栏右侧有面板折叠按钮，点击可完全隐藏/显示 Sidebar
- [ ] 所有 Unicode/Emoji 图标已替换为 codicon SVG 图标
- [ ] Dark Mode 切换正常工作
- [ ] File 菜单项能执行真实的文件操作（Open Folder、Save 等）
- [ ] Edit 菜单项能操作编辑器（Undo、Redo、Copy 等）
- [ ] 类型检查通过，构建成功
- [ ] 所有 Vitest 测试通过
