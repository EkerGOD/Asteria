import { Token, TokenType, MDNode } from './types'
import { InlineLexer } from './inline-parser'

/**
 * 语法分析器 — 将块级 Token 流转换为树形 AST（MDNode[]）。
 *
 * ## 核心职责
 *
 * 1. **块级组装**：将连续的同类 Token 合并为一个父节点
 *    - 连续 ListItem → 包裹为 List 节点
 *    - 连续 Blockquote → 合并为单个 Blockquote 节点
 * 2. **行内解析**：对包含富文本的块（标题、段落、列表项、引用）
 *    调用 InlineLexer 将内部文本解析为行内 Token 树，
 *    然后转换为 MDNode 的 children。
 * 3. **直通块**：代码块、分割线、表格不需要行内解析，直接映射为 MDNode。
 *
 * ## 输入 → 输出
 *
 * ```
 * BlockLexer.tokenize(markdown) → Token[]
 *                                    │
 *                              Parser.parse(tokens)
 *                                    │
 *                                    ▼
 *                               MDNode[] (AST)
 * ```
 *
 * ## 示例
 *
 * 输入 Token 流：Heading("## Title"), Paragraph("Hello **world**")
 * 输出 AST：
 * ```
 * [
 *   MDNode(Heading, children: [MDNode(Text, "Title")]),
 *   MDNode(Paragraph, children: [MDNode(Text, "Hello "), MDNode(Bold, children: [MDNode(Text, "world")])])
 * ]
 * ```
 */
export class Parser {
    /** 行内解析器实例（复用以避免重复创建） */
    private inlineLexer = new InlineLexer()

    /**
     * 将块级 Token 数组解析为 AST 节点数组。
     */
    parse(tokens: Token[]): MDNode[] {
        const nodes: MDNode[] = []
        let i = 0

        while (i < tokens.length) {
            const token = tokens[i]

            switch (token.type) {
                // ---- 需要行内解析的块级节点 ----
                case TokenType.Heading:
                    nodes.push(this.parseHeading(token))
                    i++
                    break

                case TokenType.Paragraph:
                    nodes.push(this.parseParagraph(token))
                    i++
                    break

                // ---- 连续的 Blockquote 合并为一个节点 ----
                case TokenType.Blockquote: {
                    const result = this.parseBlockquote(tokens, i)
                    nodes.push(result.node)
                    i = result.nextIndex
                    break
                }

                // ---- 连续的 ListItem 包裹为 List 节点 ----
                case TokenType.ListItem: {
                    const result = this.parseList(tokens, i)
                    nodes.push(result.node)
                    i = result.nextIndex
                    break
                }

                // ---- 不需要行内解析的直通块 ----
                case TokenType.CodeFence:
                case TokenType.HorizontalRule:
                case TokenType.Table:
                    nodes.push(this.blockToNode(token))
                    i++
                    break

                default:
                    // 跳过未知类型的 Token
                    i++
            }
        }

        return nodes
    }

    // ========================================================================
    // 单块解析 — 提取内容 → 行内解析 → 组装 MDNode
    // ========================================================================

    /**
     * 解析标题块。
     * 提取 `#` 标记后的文本内容，进行行内解析，组装为 Heading MDNode。
     *
     * 示例："## Hello **world**" → MDNode(Heading, children: [Text("Hello "), Bold(Text("world"))])
     */
    private parseHeading(token: Token): MDNode {
        const content = token.value.replace(/^#{1,6}\s+/, '')
        const inlineTokens = this.inlineLexer.parse(content)
        return {
            type: token.type,
            span: token.span,
            children: this.inlineTokensToNodes(inlineTokens),
            props: token.meta as Record<string, unknown>,
        }
    }

    /**
     * 解析段落块。
     * 段落内容直接进行行内解析。
     *
     * 示例："This is **bold**." → MDNode(Paragraph, children: [Text("This is "), Bold(Text("bold")), Text(".")])
     */
    private parseParagraph(token: Token): MDNode {
        const inlineTokens = this.inlineLexer.parse(token.value)
        return {
            type: token.type,
            span: token.span,
            children: this.inlineTokensToNodes(inlineTokens),
        }
    }

    /**
     * 解析连续的引用块，合并为单个 Blockquote 节点。
     * 每一行引用作为一个 Paragraph 子节点。
     *
     * 示例：
     *   > line 1
     *   > line 2
     * →
     *   MDNode(Blockquote, children: [
     *     MDNode(Paragraph, children: [Text("line 1")]),
     *     MDNode(Paragraph, children: [Text("line 2")]),
     *   ])
     */
    private parseBlockquote(tokens: Token[], startIndex: number): { node: MDNode; nextIndex: number } {
        const children: MDNode[] = []
        let i = startIndex

        while (i < tokens.length && tokens[i].type === TokenType.Blockquote) {
            const content = tokens[i].value.replace(/^>\s?/, '')
            const inlineTokens = this.inlineLexer.parse(content)
            children.push({
                type: TokenType.Paragraph,
                span: tokens[i].span,
                children: this.inlineTokensToNodes(inlineTokens),
            })
            i++
        }

        const node: MDNode = {
            type: TokenType.Blockquote,
            span: {
                start: tokens[startIndex].span.start,
                end: tokens[i - 1].span.end,
            },
            children,
        }

        return { node, nextIndex: i }
    }

    /**
     * 解析连续的列表项，包裹为 List 父节点。
     * 每个列表项独立进行行内解析。
     *
     * 示例：
     *   - Item 1
     *   - Item 2
     * →
     *   MDNode(List, children: [
     *     MDNode(ListItem, children: [Text("Item 1")]),
     *     MDNode(ListItem, children: [Text("Item 2")]),
     *   ])
     */
    private parseList(tokens: Token[], startIndex: number): { node: MDNode; nextIndex: number } {
        const children: MDNode[] = []
        let i = startIndex

        while (i < tokens.length && tokens[i].type === TokenType.ListItem) {
            const content = this.extractListItemContent(tokens[i])
            const inlineTokens = this.inlineLexer.parse(content)
            children.push({
                type: TokenType.ListItem,
                span: tokens[i].span,
                children: this.inlineTokensToNodes(inlineTokens),
                props: tokens[i].meta as Record<string, unknown> | undefined,
            })
            i++
        }

        const node: MDNode = {
            type: TokenType.List,
            span: {
                start: tokens[startIndex].span.start,
                end: tokens[i - 1].span.end,
            },
            children,
        }

        return { node, nextIndex: i }
    }

    /**
     * 不需要行内解析的块（代码块、分割线、表格）直接映射为 MDNode。
     * 元数据从 Token.meta 传递到 MDNode.props。
     */
    private blockToNode(token: Token): MDNode {
        return {
            type: token.type,
            span: token.span,
            props: token.meta as Record<string, unknown> | undefined,
        }
    }

    // ========================================================================
    // 辅助方法
    // ========================================================================

    /**
     * 从列表项 Token 中提取纯文本内容（去除列表标记）。
     *
     * 支持三种格式：
     *   - 无序列表：`- item` → `"item"`
     *   - 有序列表：`1. item` → `"item"`
     *   - 任务列表：`- [ ] item` → `"item"`
     */
    private extractListItemContent(token: Token): string {
        const v = token.value.trimStart()
        // 任务列表（必须先于无序列表判断）
        if (token.meta?.task) {
            return v.replace(/^[-*+]\s\[[ x]\]\s/, '')
        }
        // 有序列表
        if (token.meta?.ordered) {
            return v.replace(/^\d+\.\s/, '')
        }
        // 无序列表
        return v.replace(/^[-*+]\s/, '')
    }

    /**
     * 将行内 Token 树递归转换为 MDNode 树。
     * Token.children（嵌套的行内 Token）→ MDNode.children（嵌套的 MDNode）。
     *
     * 转换规则：
     *   Token.type  → MDNode.type（直通）
     *   Token.span  → MDNode.span（直通）
     *   Token.meta  → MDNode.props（元数据传递）
     *   Token.children → 递归调用本方法
     */
    private inlineTokensToNodes(tokens: Token[]): MDNode[] {
        return tokens.map((t) => ({
            type: t.type,
            span: t.span,
            children: t.children ? this.inlineTokensToNodes(t.children) : undefined,
            props: t.meta as Record<string, unknown> | undefined,
        }))
    }
}
