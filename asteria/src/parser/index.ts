import { BlockLexer } from './lexer'
import { Parser } from './parser'
import { MDNode } from './types'

/**
 * 解析 Markdown 字符串为抽象语法树（AST）。
 *
 * 这是整个解析器的唯一对外入口，内部串联两个阶段：
 *   1. BlockLexer.tokenize(markdown) → Token[]（块级词法分析）
 *   2. Parser.parse(tokens)           → MDNode[]（语法分析 + 行内解析）
 *
 * @param markdown - 原始 Markdown 文本
 * @returns AST 节点数组
 *
 * @example
 * const ast = parse('# Hello\n\nThis is **bold**.')
 * // [
 * //   MDNode(Heading, children: [Text("Hello")]),
 * //   MDNode(Paragraph, children: [Text("This is "), Bold(Text("bold")), Text(".")])
 * // ]
 */
export function parse(markdown: string): MDNode[] {
    const lexer = new BlockLexer()
    const tokens = lexer.tokenize(markdown)

    const parser = new Parser()
    return parser.parse(tokens)
}

// 重新导出，方便外部统一 import
export type { Token, MDNode, Position, SourceSpan } from './types'
export { TokenType } from './types'
export { BlockLexer } from './lexer'
export { InlineLexer } from './inline-parser'
export { Parser } from './parser'

// ============================================================================
// 测试 — 在 App.vue 的 onMounted 中调用 testParser() 查看控制台输出
// ============================================================================

/** 手动测试完整解析管线：markdown 字符串 → AST */
export function testParser() {
    const md = [
        '# Hello World',
        '',
        'This is **bold** and *italic* text.',
        '',
        '- Item 1',
        '- Item 2',
        '- [x] Done task',
        '',
        '> A wise quote',
        '',
        '```ts',
        'const x = 1',
        '```',
        '',
        '---',
        '',
        '| A | B |',
        '| - | - |',
        '| 1 | 2 |',
    ].join('\n')

    const ast = parse(md)

    /** 递归打印 AST，缩进表示嵌套层级 */
    function printNode(node: MDNode, indent = 0) {
        const pad = '  '.repeat(indent)
        const typeStr = node.type.padEnd(16)
        const spanStr = `L${node.span.start.line}-L${node.span.end.line}`
        const propsStr = node.props ? ` props=${JSON.stringify(node.props)}` : ''
        console.log(`${pad}${typeStr} ${spanStr}${propsStr}`)

        if (node.children) {
            for (const child of node.children) {
                printNode(child, indent + 1)
            }
        }
    }

    console.log(`=== Parser AST (共 ${ast.length} 个顶层节点) ===`)
    for (const node of ast) {
        printNode(node)
    }
}
