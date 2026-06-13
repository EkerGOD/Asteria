import { StateField, EditorState } from '@codemirror/state'

/**
 * 光标行号追踪 Field。
 *
 * 在 EditorState 中存储一个 Set<number>，包含所有光标当前所在的行号。
 * 支持多光标：每个光标对应一个行号，去重后存入 Set。
 *
 * ## 为什么用 Set<number>
 * - 多光标时可能多个光标在同一行 → Set 自动去重
 * - O(1) 查找：后续 WYSIWYG 引擎需要快速判断"当前行是否包含光标"
 *
 * ## 为什么放在 StateField 中
 * - CM6 的不可变状态模型：每次编辑产生新 State
 * - StateField 的 update 回调在每次 Transaction 时重新计算
 * - 结果缓存在 State 中，所有 ViewPlugin / Decoration 可以零成本读取
 *
 * ## 行号规则
 * - CodeMirror 6 使用 1-based 行号（lineAt().number 从 1 开始）
 * - 这里也统一使用 1-based，方便与后续 Decoration 的 pos 计算对齐
 */
export const cursorLineField = StateField.define<Set<number>>({
    /** 初始值：空集合（编辑器刚创建时没有光标） */
    create(): Set<number> {
        return new Set()
    },

    /**
     * 每次 Transaction 后重新计算光标行号集合。
     *
     * @param value    - 当前的光标行号集合
     * @param tr       - 触发更新的 Transaction
     * @returns 新的光标行号集合
     */
    update(value: Set<number>, tr): Set<number> {
        // 只有选择变化时才重算（文档变更但光标未动时跳过）
        if (!tr.selection) return value

        const lines = new Set<number>()
        // 遍历所有选区（支持多光标）
        for (const range of tr.state.selection.ranges) {
            // head 是光标的实际位置（选区有方向时 head ≠ from）
            const line = tr.state.doc.lineAt(range.head).number
            lines.add(line)
        }
        return lines
    },
})

/**
 * 从 EditorState 中读取当前光标所在的行号集合。
 *
 * @param state - 编辑器状态
 * @returns 光标行号集合（1-based）
 *
 * @example
 * const cursorLines = getCursorLines(editorView.state)
 * console.log('光标在第', [...cursorLines], '行')
 */
export function getCursorLines(state: EditorState): Set<number> {
    return state.field(cursorLineField)
}
