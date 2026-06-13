import { WidgetType } from '@codemirror/view'
import type { EditorView } from '@codemirror/view'
import { highlightCode } from './code-highlighter'

/**
 * 图片 Widget — 用真实 `<img>` 元素替换 `![alt](url)` 语法。
 *
 * ## 设计要点
 * - `eq()`: CM6 通过比较决定是否复用 DOM。两个同 src+alt 的 Widget 视为等价，
 *   编辑器重新渲染时会保留已有 `<img>`，避免闪烁或重新请求图片。
 * - `ignoreEvent()`: 返回 false，让 `<img>` 能响应点击、拖拽等鼠标事件。
 */
export class ImageWidget extends WidgetType {
    constructor(
        private readonly src: string,
        private readonly alt: string,
        private readonly title?: string,
    ) {
        super()
    }

    /** CM6 通过此方法判断两个 Widget 实例是否等价（决定是否复用 DOM） */
    eq(other: ImageWidget): boolean {
        return other.src === this.src
            && other.alt === this.alt
            && other.title === this.title
    }

    /** 创建实际 `<img>` DOM 元素 */
    toDOM(): HTMLElement {
        const img = document.createElement('img')
        img.src = this.src
        img.alt = this.alt
        if (this.title) img.title = this.title
        img.className = 'cm-image-widget'
        return img
    }

    /** 返回 false 让图片能响应鼠标事件 */
    ignoreEvent(): boolean {
        return false
    }
}

/**
 * 分割线 Widget — 用 `<hr>` 元素替换 `---` / `***` / `___` 整行语法。
 *
 * 配合 `Decoration.replace({ widget, block: true })` 使用，
 * `block: true` 告诉 CM6 这是一个块级元素，整行替换。
 */
export class HorizontalRuleWidget extends WidgetType {
    /** 所有分割线 Widget 都一样，始终返回 true */
    eq(_other: HorizontalRuleWidget): boolean {
        return true
    }

    /** 创建 `<hr>` DOM 元素 */
    toDOM(): HTMLElement {
        const hr = document.createElement('hr')
        hr.className = 'cm-hr'
        return hr
    }

    /** 分割线不需要响应事件，默认返回 true 即可 */
}

/**
 * 无序列表圆点 Widget — 用 `•` 符号替换 `- ` / `* ` / `+ ` 列表标记。
 *
 * 配合 `Decoration.replace({ widget })` 使用，置于行首隐藏原始标记。
 */
export class BulletWidget extends WidgetType {
    /** 所有圆点都一样，始终返回 true */
    eq(_other: BulletWidget): boolean {
        return true
    }

    /** 创建包含圆点字符和空格的 span */
    toDOM(): HTMLElement {
        const span = document.createElement('span')
        span.className = 'cm-list-bullet'
        span.textContent = '• '
        return span
    }
}

/**
 * 任务列表勾选框 Widget — 用可点击的 `<input type="checkbox">` 替换 `[ ]` / `[x]`。
 *
 * ## 交互
 * - 点击勾选框 → 调度 CM6 Transaction，将文档中的 `[ ]` ↔ `[x]` 切换
 * - `e.stopPropagation()` 防止点击事件冒泡触发其他 CM6 行为（如光标移动）
 *
 * ## 参数
 * @param checked - 当前是否已勾选（`[ ]` → false, `[x]` → true）
 * @param view     - 编辑器视图引用，用于 dispatch 修改
 * @param docFrom  - `[` 在文档中的位置（用于替换）
 * @param docTo    - `]` 之后的位置（用于替换）
 */
export class CheckboxWidget extends WidgetType {
    constructor(
        private readonly checked: boolean,
        private readonly view: EditorView,
        private readonly docFrom: number,
        private readonly docTo: number,
    ) {
        super()
    }

    /** 选中状态变化了才重建 DOM */
    eq(other: CheckboxWidget): boolean {
        return other.checked === this.checked
    }

    /** 创建 `<input type="checkbox">` 并绑定点击切换逻辑 */
    toDOM(): HTMLElement {
        const input = document.createElement('input')
        input.type = 'checkbox'
        input.checked = this.checked
        input.className = 'cm-task-checkbox'
        input.addEventListener('click', (e) => {
            e.stopPropagation()
            this.view.dispatch({
                changes: {
                    from: this.docFrom,
                    to: this.docTo,
                    insert: this.checked ? '[ ]' : '[x]',
                },
            })
        })
        return input
    }

    /** 勾选框需要响应点击，返回 false */
    ignoreEvent(): boolean {
        return false
    }
}

/**
 * 代码块 Widget — 用带语言标签和基础高亮的代码容器替换 ` ```lang\ncode\n``` `。
 *
 * ## 结构
 * ```
 * ┌─ header ─────────┐   ← 语言标签
 * │  javascript      │
 * ├─ pre/code ───────┤
 * │  const x = 1;    │   ← 带语法高亮的代码
 * └──────────────────┘
 * ```
 */
export class CodeBlockWidget extends WidgetType {
    constructor(
        private readonly language: string,
        private readonly code: string,
    ) {
        super()
    }

    /** 语言或代码内容变化才重建 DOM */
    eq(other: CodeBlockWidget): boolean {
        return other.language === this.language && other.code === this.code
    }

    /** 创建代码块 DOM 结构：header + pre/code */
    toDOM(): HTMLElement {
        const container = document.createElement('div')
        container.className = 'cm-code-block'

        const header = document.createElement('div')
        header.className = 'cm-code-block-header'
        header.textContent = this.language || 'code'
        container.appendChild(header)

        const pre = document.createElement('pre')
        const code = document.createElement('code')
        code.innerHTML = highlightCode(this.code, this.language)
        pre.appendChild(code)
        container.appendChild(pre)

        return container
    }

    /** 代码块内部允许选中文本 */
    ignoreEvent(): boolean {
        return false
    }
}

/**
 * 表格 Widget — 用 HTML `<table>` 替换 GFM 表格语法。
 *
 * ## 结构
 * ```
 * | Header1 | Header2 |
 * | :-----  | -----:  |   ← 分隔行（可选对齐标记）
 * | Data1   | Data2   |
 * ```
 *
 * ## 对齐规则（从分隔行解析）
 * - `:---`  → left
 * - `:---:` → center
 * - `---:`  → right
 * - `---`   → left（默认）
 */
export class TableWidget extends WidgetType {
    constructor(
        private readonly headers: string[],
        private readonly rows: string[][],
        private readonly alignments: string[],
    ) {
        super()
    }

    /** 表头、数据、对齐任一变化才重建 DOM */
    eq(other: TableWidget): boolean {
        return stringArraysEqual(other.headers, this.headers)
            && rowsEqual(other.rows, this.rows)
            && stringArraysEqual(other.alignments, this.alignments)
    }

    /** 创建 HTML `<table>` 结构 */
    toDOM(): HTMLElement {
        const table = document.createElement('table')
        table.className = 'cm-table'

        // thead
        const thead = document.createElement('thead')
        const headerRow = document.createElement('tr')
        for (let i = 0; i < this.headers.length; i++) {
            const th = document.createElement('th')
            th.textContent = this.headers[i].trim()
            if (this.alignments[i]) th.style.textAlign = this.alignments[i]
            headerRow.appendChild(th)
        }
        thead.appendChild(headerRow)
        table.appendChild(thead)

        // tbody
        const tbody = document.createElement('tbody')
        for (const row of this.rows) {
            const tr = document.createElement('tr')
            for (let i = 0; i < Math.max(row.length, this.headers.length); i++) {
                const td = document.createElement('td')
                td.textContent = (row[i] || '').trim()
                if (this.alignments[i]) td.style.textAlign = this.alignments[i]
                tr.appendChild(td)
            }
            tbody.appendChild(tr)
        }
        table.appendChild(tbody)

        return table
    }
}

/** 比较两个字符串数组是否相等 */
function stringArraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false
    }
    return true
}

/** 比较二维字符串数组是否相等 */
function rowsEqual(a: string[][], b: string[][]): boolean {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
        if (!stringArraysEqual(a[i], b[i])) return false
    }
    return true
}

/**
 * 从分隔行解析对齐方式。
 * 例如 `| :--- | ---: | :---: | --- |` → `['left', 'right', 'center', 'left']`
 */
export function parseAlignments(separatorLine: string): string[] {
    return splitCells(separatorLine).map((cell) => {
        const t = cell.trim()
        if (t.startsWith(':') && t.endsWith(':')) return 'center'
        if (t.endsWith(':')) return 'right'
        return 'left'
    })
}

/**
 * 将 `||` 分隔的行拆为单元格数组。
 * 去掉首尾可能存在的空单元格（由首尾 `|` 产生）。
 */
export function splitCells(line: string): string[] {
    let cells = line.split('|')
    // 行首 `|` 会产生第一个空元素
    if (cells[0]?.trim() === '') cells = cells.slice(1)
    // 行尾 `|` 会产生最后一个空元素
    if (cells[cells.length - 1]?.trim() === '') cells = cells.slice(0, -1)
    return cells
}

/**
 * 判断一行是否为表格分隔行。
 * 包含至少一个 `-` 且单元格只含 `-`, `:`, 空格。
 */
export function isTableSeparator(line: string): boolean {
    const trimmed = line.trim()
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return false
    const cells = splitCells(trimmed)
    if (cells.length === 0) return false
    return cells.every((c) => /^:?-+:?$/.test(c.trim()))
}
