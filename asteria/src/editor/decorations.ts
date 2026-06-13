import { EditorView, ViewPlugin, Decoration, DecorationSet } from '@codemirror/view'
import { Text, EditorState, StateField, RangeSetBuilder } from '@codemirror/state'
import { getCursorLines } from './cursor-tracker'
import { ImageWidget, HorizontalRuleWidget, BulletWidget, CheckboxWidget, CodeBlockWidget, TableWidget, parseAlignments, isTableSeparator, splitCells } from './widgets'

// ============================================================================
// 类型定义
// ============================================================================

/** Viewport 范围：只处理可见区域附近的文本 */
interface ViewportRange {
  from: number
  to: number
}

// ============================================================================
// 性能优化：光标移动节流
// ============================================================================

let lastSelectionTime = 0
const SELECTION_THROTTLE_MS = 50

// ============================================================================
// buildDecorations — 核心构建函数（视口优化 + RangeSetBuilder）
// ============================================================================

/**
 * 根据文档内容和光标位置，生成 WYSIWYG Decoration 集合。
 *
 * 视口优化：只扫描 viewport 附近的文本行（含前后各 5 行缓冲），
 * 视口外的内容保持不变（通过增量映射保留已有 decoration）。
 *
 * @param state        - 编辑器状态
 * @param cursorLines  - 光标所在行号集合（1-based）
 * @param view         - 编辑器视图（用于获取 visibleRanges）
 * @param viewport     - 可选：只构建此范围内的 decoration
 * @returns 已排序的 DecorationSet
 */
function buildDecorations(
  state: EditorState,
  cursorLines: Set<number>,
  view: EditorView | null,
  viewport?: ViewportRange,
  base?: DecorationSet,
): DecorationSet {
  const doc = state.doc
  const builder = new RangeSetBuilder<Decoration>()

  // 空文档：无需 decoration
  if (doc.length === 0) return builder.finish()

  // 确定扫描范围
  let scanFrom = 0
  let scanTo = doc.length

  if (viewport) {
    const firstLine = doc.lineAt(Math.max(0, viewport.from))
    const lastLine = doc.lineAt(Math.min(doc.length, viewport.to))
    const bufferedFirst = Math.max(1, firstLine.number - 5)
    const bufferedLast = Math.min(doc.lines, lastLine.number + 5)
    scanFrom = doc.line(bufferedFirst).from
    scanTo = doc.line(bufferedLast).to
  }

  // 保留扫描范围前的已有 decoration
  if (base && viewport) {
    const cursor = base.iter()
    while (cursor.value) {
      if (cursor.from < scanFrom) {
        builder.add(cursor.from, cursor.to, cursor.value)
      }
      cursor.next()
    }
  }

  const text = doc.toString()
  let i = scanFrom
  const MAX_ITERATIONS = text.length * 2 + 1000
  let iterations = 0
  while (i < text.length && i < scanTo) {
    if (++iterations > MAX_ITERATIONS) break

    const prev = i
    if (tryCodeFence(text, i, doc, cursorLines, builder))       { i = advanceCodeFence(text, i, doc); }
    else if (tryInlineCode(text, i, doc, cursorLines, builder))     { i = advanceInlineCode(text, i); }
    else if (tryImage(text, i, doc, cursorLines, builder))           { i = advanceImage(text, i); }
    else if (tryLink(text, i, doc, cursorLines, builder))            { i = advanceLink(text, i); }
    else if (tryHorizontalRule(text, i, doc, cursorLines, builder))  { i = advanceHorizontalRule(text, i, doc); }
    else if (tryHeading(text, i, doc, cursorLines, builder))         { i = advanceHeading(text, i, doc); }
    else if (tryTable(text, i, doc, cursorLines, builder))          { i = advanceTable(text, i, doc); }
    else if (tryBlockquote(text, i, doc, cursorLines, builder))      { i = advanceBlockquote(text, i, doc); }
    else if (tryTaskList(text, i, doc, view, cursorLines, builder))   { i = advanceTaskList(text, i, doc); }
    else if (tryOrderedList(text, i, doc, cursorLines, builder))     { i = advanceOrderedList(text, i, doc); }
    else if (tryUnorderedList(text, i, doc, cursorLines, builder))   { i = advanceUnorderedList(text, i, doc); }
    else if (tryBoldItalic(text, i, doc, cursorLines, builder))     { i = advanceBoldItalic(text, i); }
    else if (tryBold(text, i, doc, cursorLines, builder))           { i = advanceBold(text, i); }
    else if (tryItalic(text, i, doc, cursorLines, builder))         { i = advanceItalic(text, i); }
    else if (tryStrikethrough(text, i, doc, cursorLines, builder))  { i = advanceStrikethrough(text, i); }
    else { i++ }

    // 安全保护：确保每次迭代都前进
    if (i <= prev) i = prev + 1
  }

  // 保留扫描范围后的已有 decoration
  if (base && viewport) {
    const cursor = base.iter()
    while (cursor.value) {
      if (cursor.from >= scanTo) {
        builder.add(cursor.from, cursor.to, cursor.value)
      }
      cursor.next()
    }
  }

  return builder.finish()
}

// ============================================================================
// 光标判断辅助
// ============================================================================

function hasCursorInRange(doc: Text, from: number, to: number, cursorLines: Set<number>): boolean {
  const fromLine = doc.lineAt(from).number
  const toLine = doc.lineAt(to < from ? from : to).number
  for (let l = fromLine; l <= toLine; l++) {
    if (cursorLines.has(l)) return true
  }
  return false
}

// ============================================================================
// 各行内语法匹配函数（改用 RangeSetBuilder）
// ============================================================================

// ----- 1. 行内代码 `code` -----

function tryInlineCode(text: string, pos: number, doc: Text, cursorLines: Set<number>, builder: RangeSetBuilder<Decoration>): boolean {
  if (text[pos] !== '`') return false
  if (text[pos + 1] === '`') return false

  const openFrom = pos
  const closing = text.indexOf('`', pos + 1)
  if (closing === -1) return false

  const contentFrom = pos + 1
  const contentTo = closing
  const closeFrom = closing
  const closeTo = closing + 1

  if (!hasCursorInRange(doc, openFrom, closeTo - 1, cursorLines)) {
    builder.add(openFrom, openFrom + 1, Decoration.replace({}))
    builder.add(contentFrom, contentTo, Decoration.mark({ class: 'cm-inline-code' }))
    builder.add(closeFrom, closeTo, Decoration.replace({}))
  }

  return true
}

function advanceInlineCode(_text: string, pos: number): number {
  const closing = _text.indexOf('`', pos + 1)
  return closing === -1 ? pos + 1 : closing + 1
}

// ----- 2. 链接 [text](url) -----

function tryLink(text: string, pos: number, doc: Text, cursorLines: Set<number>, builder: RangeSetBuilder<Decoration>): boolean {
  if (text[pos] !== '[') return false

  const match = text.slice(pos).match(/^\[([^\]]*)\]\(([^)\s]+)\)/)
  if (!match) return false

  const openFrom = pos
  const textFrom = pos + 1
  const textTo = pos + 1 + match[1].length
  const closeFrom = textTo
  const closeTo = pos + match[0].length

  if (!hasCursorInRange(doc, openFrom, closeTo - 1, cursorLines)) {
    builder.add(openFrom, openFrom + 1, Decoration.replace({}))
    builder.add(textFrom, textTo, Decoration.mark({ class: 'cm-link' }))
    builder.add(closeFrom, closeTo, Decoration.replace({}))
  }

  return true
}

function advanceLink(text: string, pos: number): number {
  const match = text.slice(pos).match(/^\[([^\]]*)\]\(([^)\s]+)\)/)
  return match ? pos + match[0].length : pos + 1
}

// ----- 2.5. 图片 ![alt](url) -----

function tryImage(text: string, pos: number, doc: Text, cursorLines: Set<number>, builder: RangeSetBuilder<Decoration>): boolean {
  if (text[pos] !== '!') return false

  const match = text.slice(pos).match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/)
  if (!match) return false

  const from = pos
  const to = pos + match[0].length

  if (!hasCursorInRange(doc, from, to - 1, cursorLines)) {
    builder.add(from, to, Decoration.replace({
      widget: new ImageWidget(match[2], match[1], match[3]),
    }))
  }

  return true
}

function advanceImage(text: string, pos: number): number {
  const match = text.slice(pos).match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/)
  return match ? pos + match[0].length : pos + 1
}

// ----- 2.6. 分割线 --- / *** / ___ -----

function tryHorizontalRule(_text: string, pos: number, doc: Text, cursorLines: Set<number>, builder: RangeSetBuilder<Decoration>): boolean {
  const line = doc.lineAt(pos)
  if (pos !== line.from) return false
  if (!/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.text)) return false

  if (!hasCursorInRange(doc, line.from, line.to, cursorLines)) {
    builder.add(line.from, line.from + line.text.length, Decoration.replace({
      widget: new HorizontalRuleWidget(),
      block: true,
    }))
  }

  return true
}

function advanceHorizontalRule(_text: string, pos: number, doc: Text): number {
  return doc.lineAt(pos).to
}

// ----- 2.7. 标题 # ~ ###### -----

function tryHeading(_text: string, pos: number, doc: Text, cursorLines: Set<number>, builder: RangeSetBuilder<Decoration>): boolean {
  const line = doc.lineAt(pos)
  if (pos !== line.from) return false

  const match = line.text.match(/^(#{1,6})\s/)
  if (!match) return false

  const level = match[1].length
  const markerEnd = line.from + match[0].length

  if (!hasCursorInRange(doc, line.from, line.to, cursorLines)) {
    builder.add(line.from, line.from, Decoration.line({ class: `cm-heading-${level}` }))
    builder.add(line.from, markerEnd, Decoration.replace({}))
  }

  return true
}

function advanceHeading(_text: string, pos: number, doc: Text): number {
  return doc.lineAt(pos).to
}

// ----- 2.8. 围栏代码块 ```lang ... ``` -----

function tryCodeFence(_text: string, pos: number, doc: Text, cursorLines: Set<number>, builder: RangeSetBuilder<Decoration>): boolean {
  const line = doc.lineAt(pos)
  if (pos !== line.from) return false
  if (!line.text.startsWith('```')) return false

  const openFrom = line.from
  const language = line.text.slice(3).trim()
  let codeLines: string[] = []
  let closeLineNum = line.number + 1

  while (closeLineNum <= doc.lines) {
    const cl = doc.line(closeLineNum)
    if (cl.text.startsWith('```')) break
    codeLines.push(cl.text)
    closeLineNum++
  }

  if (closeLineNum > doc.lines) return false

  const closeLine = doc.line(closeLineNum)
  const closeTo = closeLine.to
  const code = codeLines.join('\n')

  if (!hasCursorInRange(doc, openFrom, closeTo - 1, cursorLines)) {
    builder.add(openFrom, closeTo, Decoration.replace({
      widget: new CodeBlockWidget(language, code),
      block: true,
    }))
  }

  return true
}

function advanceCodeFence(_text: string, pos: number, doc: Text): number {
  let lineNum = doc.lineAt(pos).number + 1
  while (lineNum <= doc.lines) {
    if (doc.line(lineNum).text.startsWith('```')) return doc.line(lineNum).to
    lineNum++
  }
  return doc.lineAt(pos).to
}

// ----- 2.9. 表格 | Header | ... -----

function tryTable(_text: string, pos: number, doc: Text, cursorLines: Set<number>, builder: RangeSetBuilder<Decoration>): boolean {
  const line = doc.lineAt(pos)
  if (pos !== line.from) return false

  const trimmed = line.text.trimStart()
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return false
  if (line.number + 1 > doc.lines) return false

  const nextLine = doc.line(line.number + 1)
  if (!isTableSeparator(nextLine.text)) return false

  const tableStart = line.from
  const headers = splitCells(line.text)
  const alignments = parseAlignments(nextLine.text)
  const rows: string[][] = []

  let dataLineNum = line.number + 2
  while (dataLineNum <= doc.lines) {
    const dl = doc.line(dataLineNum)
    const dt = dl.text.trimStart()
    if (!dt.startsWith('|') || !dt.endsWith('|')) break
    rows.push(splitCells(dl.text))
    dataLineNum++
  }

  const tableEnd = doc.line(dataLineNum - 1).to

  if (!hasCursorInRange(doc, tableStart, tableEnd - 1, cursorLines)) {
    builder.add(tableStart, tableEnd, Decoration.replace({
      widget: new TableWidget(headers, rows, alignments),
      block: true,
    }))
  }

  return true
}

function advanceTable(_text: string, pos: number, doc: Text): number {
  let lineNum = doc.lineAt(pos).number + 2
  while (lineNum <= doc.lines) {
    const dt = doc.line(lineNum).text.trimStart()
    if (!dt.startsWith('|') || !dt.endsWith('|')) break
    lineNum++
  }
  return doc.line(lineNum - 1).to
}

// ----- 2.10. 引用 > text -----

function tryBlockquote(_text: string, pos: number, doc: Text, cursorLines: Set<number>, builder: RangeSetBuilder<Decoration>): boolean {
  const line = doc.lineAt(pos)
  if (pos !== line.from) return false

  const match = line.text.match(/^>\s?/)
  if (!match) return false

  const markerEnd = line.from + match[0].length

  if (!hasCursorInRange(doc, line.from, line.to, cursorLines)) {
    builder.add(line.from, line.from, Decoration.line({ class: 'cm-blockquote' }))
    builder.add(line.from, markerEnd, Decoration.replace({}))
  }

  return true
}

function advanceBlockquote(_text: string, pos: number, doc: Text): number {
  return doc.lineAt(pos).to
}

// ----- 2.9. 任务列表 - [ ] / - [x] -----

function tryTaskList(_text: string, pos: number, doc: Text, view: EditorView | null, cursorLines: Set<number>, builder: RangeSetBuilder<Decoration>): boolean {
  const line = doc.lineAt(pos)
  if (pos !== line.from) return false

  const match = line.text.match(/^[-*+]\s\[([ x])\]\s/)
  if (!match) return false

  const listMarkerEnd = line.from + 2
  const checkboxFrom = line.from + match[0].indexOf('[')
  const checkboxTo = checkboxFrom + 3

  if (!hasCursorInRange(doc, line.from, line.to, cursorLines)) {
    builder.add(line.from, line.from, Decoration.line({ class: 'cm-task-line' }))
    builder.add(line.from, listMarkerEnd, Decoration.replace({}))
    if (view) {
      builder.add(checkboxFrom, checkboxTo, Decoration.replace({
        widget: new CheckboxWidget(match[1] === 'x', view, checkboxFrom, checkboxTo),
      }))
    }
  }

  return true
}

function advanceTaskList(_text: string, pos: number, doc: Text): number {
  return doc.lineAt(pos).to
}

// ----- 2.10. 有序列表 1. text -----

function tryOrderedList(_text: string, pos: number, doc: Text, cursorLines: Set<number>, builder: RangeSetBuilder<Decoration>): boolean {
  const line = doc.lineAt(pos)
  if (pos !== line.from) return false

  const match = line.text.match(/^\d+\.\s/)
  if (!match) return false

  const markerEnd = line.from + match[0].length

  if (!hasCursorInRange(doc, line.from, line.to, cursorLines)) {
    builder.add(line.from, line.from, Decoration.line({ class: 'cm-list-line' }))
    builder.add(line.from, markerEnd, Decoration.replace({}))
  }

  return true
}

function advanceOrderedList(_text: string, pos: number, doc: Text): number {
  return doc.lineAt(pos).to
}

// ----- 2.11. 无序列表 - / * / + text -----

function tryUnorderedList(_text: string, pos: number, doc: Text, cursorLines: Set<number>, builder: RangeSetBuilder<Decoration>): boolean {
  const line = doc.lineAt(pos)
  if (pos !== line.from) return false

  const match = line.text.match(/^[-*+]\s/)
  if (!match) return false

  const markerEnd = line.from + match[0].length

  if (!hasCursorInRange(doc, line.from, line.to, cursorLines)) {
    builder.add(line.from, line.from, Decoration.line({ class: 'cm-list-line' }))
    builder.add(line.from, markerEnd, Decoration.replace({ widget: new BulletWidget() }))
  }

  return true
}

function advanceUnorderedList(_text: string, pos: number, doc: Text): number {
  return doc.lineAt(pos).to
}

// ----- 3. 粗斜体 ***text*** -----

function tryBoldItalic(text: string, pos: number, doc: Text, cursorLines: Set<number>, builder: RangeSetBuilder<Decoration>): boolean {
  if (pos + 5 >= text.length) return false
  if (text[pos] !== '*' || text[pos + 1] !== '*' || text[pos + 2] !== '*') return false

  const openFrom = pos
  const contentFrom = pos + 3

  const closing = text.indexOf('***', contentFrom)
  if (closing === -1) return false

  const contentTo = closing
  const closeFrom = closing
  const closeTo = closing + 3

  if (!hasCursorInRange(doc, openFrom, closeTo - 1, cursorLines)) {
    builder.add(openFrom, openFrom + 3, Decoration.replace({}))
    builder.add(contentFrom, contentTo, Decoration.mark({ class: 'cm-bold-italic' }))
    builder.add(closeFrom, closeTo, Decoration.replace({}))
  }

  return true
}

function advanceBoldItalic(text: string, pos: number): number {
  const closing = text.indexOf('***', pos + 3)
  return closing === -1 ? pos + 3 : closing + 3
}

// ----- 4. 粗体 **text** -----

function tryBold(text: string, pos: number, doc: Text, cursorLines: Set<number>, builder: RangeSetBuilder<Decoration>): boolean {
  if (pos + 3 >= text.length) return false
  if (text[pos] !== '*' || text[pos + 1] !== '*') return false

  const openFrom = pos
  const contentFrom = pos + 2

  const closing = text.indexOf('**', contentFrom)
  if (closing === -1) return false

  const contentTo = closing
  const closeFrom = closing
  const closeTo = closing + 2

  if (!hasCursorInRange(doc, openFrom, closeTo - 1, cursorLines)) {
    builder.add(openFrom, openFrom + 2, Decoration.replace({}))
    builder.add(contentFrom, contentTo, Decoration.mark({ class: 'cm-bold' }))
    builder.add(closeFrom, closeTo, Decoration.replace({}))
  }

  return true
}

function advanceBold(text: string, pos: number): number {
  const closing = text.indexOf('**', pos + 2)
  return closing === -1 ? pos + 2 : closing + 2
}

// ----- 5. 斜体 *text* -----

function tryItalic(text: string, pos: number, doc: Text, cursorLines: Set<number>, builder: RangeSetBuilder<Decoration>): boolean {
  if (pos + 2 >= text.length) return false
  if (text[pos] !== '*') return false
  if (text[pos + 1] === '*') return false

  const openFrom = pos
  const contentFrom = pos + 1

  let closing = -1
  for (let j = contentFrom; j < text.length; j++) {
    if (text[j] === '*' && text[j + 1] !== '*') {
      closing = j
      break
    }
  }
  if (closing === -1) return false

  const contentTo = closing
  const closeFrom = closing
  const closeTo = closing + 1

  if (!hasCursorInRange(doc, openFrom, closeTo - 1, cursorLines)) {
    builder.add(openFrom, openFrom + 1, Decoration.replace({}))
    builder.add(contentFrom, contentTo, Decoration.mark({ class: 'cm-italic' }))
    builder.add(closeFrom, closeTo, Decoration.replace({}))
  }

  return true
}

function advanceItalic(text: string, pos: number): number {
  for (let j = pos + 1; j < text.length; j++) {
    if (text[j] === '*' && text[j + 1] !== '*') return j + 1
  }
  return pos + 1
}

// ----- 6. 删除线 ~~text~~ -----

function tryStrikethrough(text: string, pos: number, doc: Text, cursorLines: Set<number>, builder: RangeSetBuilder<Decoration>): boolean {
  if (pos + 4 >= text.length) return false
  if (text[pos] !== '~' || text[pos + 1] !== '~') return false

  const openFrom = pos
  const contentFrom = pos + 2

  const closing = text.indexOf('~~', contentFrom)
  if (closing === -1) return false

  const contentTo = closing
  const closeFrom = closing
  const closeTo = closing + 2

  if (!hasCursorInRange(doc, openFrom, closeTo - 1, cursorLines)) {
    builder.add(openFrom, openFrom + 2, Decoration.replace({}))
    builder.add(contentFrom, contentTo, Decoration.mark({ class: 'cm-strikethrough' }))
    builder.add(closeFrom, closeTo, Decoration.replace({}))
  }

  return true
}

function advanceStrikethrough(text: string, pos: number): number {
  const closing = text.indexOf('~~', pos + 2)
  return closing === -1 ? pos + 2 : closing + 2
}

// ============================================================================
// ViewPlugin + StateField 导出
// ============================================================================

let editorView: EditorView | null = null

const viewStorePlugin = ViewPlugin.define((view) => {
  editorView = view
  return {}
})

/**
 * WYSIWYG Decoration StateField（含增量映射 + 视口优化 + 光标节流）。
 */
const decorationField = StateField.define<DecorationSet>({
  create(state) {
    return safeBuildFromState(state)
  },

  update(decos, tr) {
    const mapped = tr.docChanged ? decos.map(tr.changes) : decos

    if (tr.docChanged) {
      return safeBuildFromState(tr.state, mapped)
    }

    if (tr.selection) {
      const now = Date.now()
      if (now - lastSelectionTime >= SELECTION_THROTTLE_MS) {
        lastSelectionTime = now
        return safeBuildFromState(tr.state, mapped)
      }
      return mapped
    }

    return mapped
  },

  provide: (f) => EditorView.decorations.from(f),
})

/**
 * 从 State 安全构建 DecorationSet。
 * 优先使用视口范围，无 view 时全量构建。
 */
function safeBuildFromState(state: EditorState, base?: DecorationSet): DecorationSet {
  try {
    const cursorLines = getCursorLines(state)
    const vp = getViewport(state)
    return buildDecorations(state, cursorLines, editorView, vp, base)
  } catch (e) {
    console.error('WYSIWYG plugin error:', e)
    return base ?? Decoration.none
  }
}

/**
 * 获取当前视口范围（含前后缓冲行）。
 */
function getViewport(state: EditorState): ViewportRange | undefined {
  if (!editorView || editorView.state !== state) return undefined
  const ranges = editorView.visibleRanges
  if (ranges.length === 0) return undefined
  return {
    from: ranges[0].from,
    to: ranges[ranges.length - 1].to,
  }
}

export const wysiwygPlugin = [viewStorePlugin, decorationField]
