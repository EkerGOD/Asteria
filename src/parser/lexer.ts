import { Token, TokenType, Position, SourceSpan} from "./types";



export class BlockLexer {
    private insideFence = false // 当前是否在代码块内部

    tokenize(input: string): Token[] {
        const normalized = input.replace(/\r\n/g, '\n')
        const lines = normalized.split('\n')
        const tokens: Token[] = []

        // 预计算每行起始 offset
        const lineOffsets: number[] = []
        let currentOffset = 0
        for (const line of lines) {
            lineOffsets.push(currentOffset)
            currentOffset += line.length + 1 // +1 是 \n
        }

        let i = 0
        this.insideFence = false
        let fenceStart = 0
        let fenceLang = ''
        let fenceContent: string[] = []
        
        while (i < lines.length) {
            const line = lines[i]
            const trimmed = line.trimStart() // 去除字符串开头的空白字符

            // ===== 1. 代码块内部 =====
            if (this.insideFence) {
                if (trimmed.startsWith('```')) {
                    this.insideFence = false
                    tokens.push({
                        type: TokenType.CodeFence,
                        value: lines.slice(fenceStart, i + 1).join('\n'),
                        span: this.makeSpan(fenceStart, i, lines, lineOffsets),
                        meta: { language: fenceLang, content: fenceContent.join('\n')},
                    })
                } else {
                    fenceContent.push(line)
                }
                i++
                continue
            }
            

            // ===== 2. 空行 =====
            if (trimmed === '') {
                i++
                continue
            }

            // ===== 3. 代码块边界（开） =====
            if (trimmed.startsWith('```')) {
                this.insideFence = true
                fenceStart = i
                fenceLang = trimmed.slice(3).trim()
                fenceContent = []
                i++
                continue
            }
            // ===== 模式 4：标题 =====
            const headMatch = line.match(/^(#{1,6})\s+(.*)/)
            if (headMatch) {
                tokens.push({
                    type: TokenType.Heading,
                    value: line,
                    span: this.makeSpan(i, i, lines, lineOffsets),
                    meta: { level: headMatch[1].length} // # 的个数
                })
                i++
                continue
            }

            // ===== 5. 分割线 =====
            if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(trimmed)) {
                tokens.push({
                    type: TokenType.HorizontalRule,
                    value: line,
                    span: this.makeSpan(i, i, lines, lineOffsets),
                })
                i++
                continue
            }
            
            // ===== 6. 引用 =====
            if (trimmed.startsWith('> ')) {
                tokens.push({
                    type: TokenType.Blockquote,
                    value: line,
                    span: this.makeSpan(i, i, lines, lineOffsets)
                })
                i++
                continue
            }
            

            // ===== 7. 任务列表 =====
            const taskMatch = trimmed.match(/^[-*+]\s\[([ x])\]\s/)
            if (taskMatch) {
                tokens.push({
                    type: TokenType.ListItem,
                    value: line,
                    span: this.makeSpan(i, i, lines, lineOffsets),
                    meta: { task: true, checked: taskMatch[1] === 'x' },
                })
                i++
                continue
            }

            // === 模式 8：无序列表 ===
            if (/^[-*+]\s/.test(trimmed)) {
                tokens.push({
                    type: TokenType.ListItem,
                    value: line,
                    span: this.makeSpan(i, i, lines, lineOffsets),
                })
                i++
                continue
            }

            // === 模式 9：有序列表 ===
            if (/^\d+\.\s/.test(trimmed)) {
                tokens.push({
                    type: TokenType.ListItem,
                    value: line,
                    span: this.makeSpan(i, i, lines, lineOffsets),
                    meta: {ordered: true}
                })
                i++
                continue
            }
            
            // === 模式 10：表格（需要向前看） ===
            if (trimmed.startsWith('|') && i + 1 < lines.length) {
                const nextTrimmed = lines[i + 1].trimStart()
                if (/^\|[\s\-:]+\|$/.test(nextTrimmed)) {
                    const tableStart = i
                    i += 2
                    while (i < lines.length && lines[i].trimStart().startsWith('|')) {
                        i++
                    }
                    tokens.push({
                        type: TokenType.Table,
                        value: lines.slice(tableStart, i).join('\n'),
                        span: this.makeSpan(tableStart, i - 1, lines, lineOffsets),
                    })
                    continue
                }
            }

            // === 模式 11：段落（兜底）===
            const paraStart = i
            i++  // 先跳过当前行
            while (i < lines.length) {
                const nextTrimmed = lines[i].trimStart()
                if (this.isBlockBoundary(nextTrimmed)) break
                i++  // 继续收集
            }
            tokens.push({
                type: TokenType.Paragraph,
                value: lines.slice(paraStart, i).join('\n'),
                span: this.makeSpan(paraStart, i - 1, lines, lineOffsets),
            })
        }

        // 处理未闭合的代码块（文档结束时仍在内）
        if (this.insideFence) {
            tokens.push({
                type: TokenType.CodeFence,
                value: lines.slice(fenceStart).join('\n'),
                span: this.makeSpan(fenceStart, lines.length - 1, lines, lineOffsets),
                meta: { language: fenceLang, content: fenceContent.join('\n') },
            })
        }

        return tokens
    }


    private makePos(line: number, col: number, offsets: number[]): Position {
        return {line, column: col, offset: offsets[line] + col}
    }

    private makeSpan(startLine: number, endLine: number, lines: string[], offsets: number[]): SourceSpan {
        return {
            start: this.makePos(startLine, 0, offsets),
            end: this.makePos(endLine, lines[endLine].length, offsets),
        }
    }

    private isBlockBoundary(trimmed: string): boolean {
        if (trimmed === '') return true
        if (trimmed.startsWith('```')) return true
        if (/^#{1,6}\s/.test(trimmed)) return true
        if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(trimmed)) return true
        if (trimmed.startsWith('> ')) return true
        if (/^[-*+]\s/.test(trimmed)) return true
        if (/^\d+\.\s/.test(trimmed)) return true
        if (trimmed.startsWith('|')) return true
        return false
    }  
}

// ===== 测试 =====
export function testLexer() {
  const lexer = new BlockLexer()
  const md = [
    '# Hello World',
    '',
    'This is a paragraph.',
    '',
    '- Item 1',
    '- Item 2',
    '- [x] Done task',
    '',
    '```js',
    'const x = 1',
    '```',
    '',
    '| A | B |',
    '| - | - |',
    '| 1 | 2 |',
  ].join('\n')

  const tokens = lexer.tokenize(md)
  console.log(`=== BlockLexer (共 ${tokens.length} 个 Token) ===`)
  for (const t of tokens) {
    const val = t.value.replace(/\n/g, '\\n')
    console.log(`${t.type.padEnd(16)} L${t.span.start.line}-L${t.span.end.line} | meta=${JSON.stringify(t.meta ?? {})} | "${val}"`)
  }
}