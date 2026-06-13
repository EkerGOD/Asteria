import { Token, TokenType, SourceSpan} from './types'

/**
 * 行内词法分析器 — 逐字符扫描单行文本，将 Markdown 行内语法解析为嵌套 Token 树。
 *
 * ## 设计要点
 *
 * 1. **优先级链**：行内代码 > 图片 > 链接 > 粗斜体 > 粗体 > 斜体 > 删除线 > 纯文本
 *    优先级高的先匹配。比如 `***` 先被粗斜体吃走，不会误判为粗体或斜体。
 *
 * 2. **递归解析**：粗体内部的斜体（`**bold *italic***`）需要递归调用 parseUntilClosing，
 *    生成带 children 的嵌套 Token 树，而不是扁平的 Token 列表。
 *
 * 3. **无歧义区域**：行内代码 `` `code` `` 内部不解析任何格式——`*` 就是星号，不是斜体。
 *    图片 `![alt](url)` 的 alt 文本同理不递归解析。
 *
 * 4. **转义**：`\*` 使 `*` 失去语法含义，变成普通星号字符。
 *
 * 5. **span 计算**：行内解析器输入是单行文本，所有 span 的 `line` 恒为 0。
 *    最终由外层 parser 把块级行号与行内 column/offset 偏移合并为文档级坐标。
 *
 * ## 示例
 *
 * 输入：`"hello **bold *italic***"`
 * 输出：
 * ```
 * Text("hello ")
 * Bold
 *   ├─ Text("bold ")
 *   └─ Italic
 *        └─ Text("italic")
 * ```
 */
export class InlineLexer {
    /** 当前扫描位置（字符索引，0 起始） */
    private pos = 0
    /** 当前正在解析的输入字符串 */
    private input = ''

    // ========================================================================
    // 公共入口
    // ========================================================================

    /** 对外入口：输入一行文本，输出行内 Token 树（带嵌套的 Token[]） */
    parse(input: string): Token[] {
        this.input = input
        this.pos = 0
        return this.parseTokens()
    }

    // ========================================================================
    // 顶层主循环 — 按优先级匹配行内语法
    // ========================================================================

    /**
     * 从当前位置向后扫描，按优先级逐个匹配行内语法模式。
     * 每次循环只生产**一个** Token，然后回到循环头重新判断当前位置。
     *
     * 优先级从高到低：
     *   转义 → 行内代码 → 图片 → 链接 → 粗斜体 → 粗体 → 斜体 → 删除线 → 纯文本
     *
     * 为什么斜体的判断条件是 `!this.match('**')`？
     *   因为 `*` 在两个连起来时是粗体，必须让粗体分支先抢走。
     *   比如 `**bold**` 中的第二个 `*` 如果不做这个判断，会被斜体分支误匹配。
     */
    private parseTokens(): Token[]{
        const tokens: Token[] = []
        while (this.pos < this.input.length) {
            const ch = this.input[this.pos]

            // 1. 转义 — `\*` 使紧随的字符失去语法含义
            //    必须在一切匹配之前处理，否则 `\*italic\*` 会被斜体分支误吃。
            if (ch === '\\' && this.pos + 1 < this.input.length) {
                const t = this.parseEscape()
                if (t) { tokens.push(t); continue }
            }
            // 2. 行内代码 — `` `code` ``，优先级最高
            //    代码内部的 `*` `[` `_` 等全部当作普通字符，不触发任何格式。
            else if (ch === '`') {
                const t = this.parseInlineCode()
                if (t) {tokens.push(t); continue }
            }
            // 3. 图片 — `![alt](url "title")`
            //    必须以 `![` 开头。单独的 `!` 就是普通字符。
            else if (ch === '!' && this.peek() === '[') {
                const t = this.parseImage()
                if (t) { tokens.push(t); continue }
            }
            // 4. 链接 — `[text](url "title")`
            //    注意图片已经在上一步抢走了 `![`，这里匹配的是纯链接。
            else if (ch === '[') {
                const t = this.parseLink()
                if (t) { tokens.push(t); continue}
            }
            // 5. 粗斜体 — `***text***` 或 `___text___`
            //    必须在粗体和斜体之前匹配，否则 `***` 会被粗体先抢走两个 `*`。
            else if (this.match('***') || this.match('___')) {
                const t = this.parseBoldItalic()
                if (t) { tokens.push(t); continue }
            }
            // 6. 粗体 — `**text**` 或 `__text__`
            //    匹配两个连续的 `*` 或 `_`。
            else if (this.match('**') || this.match('__')) {
                const t = this.parseBold()
                if (t) { tokens.push(t); continue }
            }
            // 7. 斜体 — `*text*` 或 `_text_`
            //    条件 `!this.match('**')` 防止单个 `*` 误匹配两个 `*` 中的第一个。
            else if ((ch === '*' || ch === '_') && !this.match('**')) {
                const t = this.parseItalic()
                if (t) { tokens.push(t); continue }
            }
            // 8. 删除线 — `~~text~~`
            else if (this.match('~~')) {
                const t = this.parseStrikethrough()
                if (t) { tokens.push(t); continue }
            }
            // 9. 纯文本 — 兜底
            //    收集连续的不触发任何语法的普通字符，直到遇到特殊字符或结尾。
            else {
                const text = this.collectText()
                if (text) {
                    tokens.push(text)
                } else {
                    // 极端情况：pos 指向特殊字符但前面所有模式都没匹配
                    // （比如行首孤立的下划线），跳过这个字符继续。
                    this.pos++
                }
            }
        }
        return tokens
    }

    // ========================================================================
    // 辅助方法 — 字符级操作
    // ========================================================================

    /** 查看当前位置的字符，但不移动 pos。已到末尾返回空字符串。 */
    private peek(): string {
        return this.input[this.pos] ?? ''
    }

    /** 是否已扫描到输入末尾 */
    private eof(): boolean {
        return this.pos >= this.input.length
    }

    /**
     * 判断当前位置是否以指定分隔符开头。
     * 例如 `this.match('**')` 检查 pos 处是不是 `**`。
     */
    private match(delim: string): boolean {
        return this.input.startsWith(delim, this.pos)
    }

    /**
     * 根据起始位置和当前 pos 构造 SourceSpan。
     * 行内解析器输入是单行文本，所以 line 始终为 0，
     * column 和 offset 等同于字符索引。
     */
    private makeSpan(startPos: number): SourceSpan {
        return {
            start: { line: 0, column: startPos, offset: startPos },
            end: { line: 0, column: this.pos, offset: this.pos },
        }
    }

    // ========================================================================
    // 单模式解析方法
    // ========================================================================

    /**
     * 解析转义字符 `\X`。
     * 跳过 `\`，将紧随的字符作为普通 Text Token 输出。
     * 例如 `\*` → Text("*")，使 `*` 不会触发斜体。
     *
     * 边界情况：
     *   - `\` 在行末（无后续字符）→ 返回 null，由上层当普通字符处理
     */
    private parseEscape(): Token | null {
        const start = this.pos
        this.pos++ // 吃掉反斜杠
        if (this.eof()) return null // 行末孤立反斜杠，不做转义
        this.pos++ // 吃掉被转义的字符本身
        return {
            type: TokenType.Text,
            // 只取转义后的字符（不含反斜杠），例如输入 `\*` → value 为 `*`
            value: this.input.slice(start + 1, this.pos),
            span: this.makeSpan(start),
        }
    }

    /**
     * 解析行内代码 `` `code` ``。
     * 从 pos 处的 `` ` `` 开始，向后找最近的未转义 `` ` `` 作为闭合。
     * 中间内容**不递归解析**，直接包裹为一个 Text child。
     *
     * 如果找不到闭合 `` ` `` → 回退 pos，当作普通 `` ` `` 字符处理。
     *
     * 示例：`` `const x = 1` `` →
     *   InlineCode(value="`const x = 1`", children=[Text("const x = 1")])
     */
    private parseInlineCode(): Token | null {
        const start = this.pos
        this.pos++ // 跳过开头的 `
        // 从当前位置向后找下一个 `
        const closing = this.input.indexOf('`', this.pos)
        if (closing === -1) {
            // 找不到闭合：回退，当普通字符处理
            this.pos = start
            return null
        }
        // 提取 `` `...` `` 之间的纯文本内容
        const content = this.input.slice(this.pos, closing)
        this.pos = closing + 1 // 跳过闭合的 `
        return {
            type: TokenType.InlineCode,
            value: this.input.slice(start, this.pos),
            // 行内代码内部不解析格式，直接包为 Text
            children: [{ type: TokenType.Text, value: content, span: this.makeSpan(start + 1)}],
            span: this.makeSpan(start),
            meta: { content },
        }
    }

    /**
     * 收集连续普通字符，直到遇到特殊字符或行尾。
     * 特殊字符集合：`\` `` ` `` `!` `[` `*` `_` `~`
     * 这些字符会触发后续的语法匹配，所以在此停止收集。
     *
     * 如果没有收集到任何字符（pos 正指向特殊字符）→ 返回 null。
     *
     * 示例：输入 `"hello *world"`，pos=0 →
     *   collectText() 收集 `"hello "`，pos 停在 `*` 处
     */
    private collectText(): Token | null {
        const start = this.pos
        // 所有会触发语法匹配的特殊字符
        const specials = new Set(['\\', '`', '!', '[', '*', '_', '~'])
        while (!this.eof() && !specials.has(this.input[this.pos])) {
            this.pos++
        }
        if (this.pos === start) return null // 一个普通字符都没收集到
        return {
            type: TokenType.Text,
            value: this.input.slice(start, this.pos),
            span: this.makeSpan(start),
        }
    }

    /**
     * 递归解析直到找到指定的闭合分隔符，返回分隔符起始和闭合之间的所有 Token。
     * 这是整个解析器的**核心引擎**——所有包裹类语法（粗体、斜体、删除线等）
     * 都通过此方法解析内部内容。
     *
     * 工作流程：
     *   1. 检查当前位置是否匹配闭合分隔符 → 是则返回已收集的 tokens
     *   2. 否则按优先级尝试匹配行内语法（转义/代码/图片/链接/粗斜体/粗体/斜体/删除线）
     *   3. 都不匹配就收集纯文本
     *   4. 循环直到找到闭合或到达末尾
     *
     * 返回值：
     *   Token[] — 成功找到闭合，返回内部 tokens
     *   null   — 到达末尾仍未找到闭合（未闭合语法，由调用方回退 pos）
     *
     * 示例：解析 `"bold *italic* end"` 时 delim=`"**"`
     *   不断收集 Text("bold ")、Italic([Text("italic")])、Text(" end")
     *   最终遇到 `"**"` 返回
     */
    private parseUntilClosing(delim: string): Token[] | null {
        const tokens: Token[] = []
        while (!this.eof()) {
            // 找到闭合分隔符 → 吃掉它，返回已收集的内部 tokens
            if (this.match(delim)) {
                this.pos += delim.length
                return tokens
            }

            const ch = this.input[this.pos]

            // 以下匹配逻辑与 parseTokens() 完全相同
            // 因为闭合语法内部依然可以嵌套其他格式
            if (ch === '\\' && this.pos + 1 < this.input.length) {
                const t = this.parseEscape()
                if (t) { tokens.push(t); continue }
            } else if (ch === '`') {
                const t = this.parseInlineCode()
                if (t) { tokens.push(t); continue }
            } else if (ch === '!' && this.pos + 1 < this.input.length && this.input[this.pos + 1] === '[') {
                const t = this.parseImage()
                if (t) { tokens.push(t); continue }
            } else if (ch === '[') {
                const t = this.parseLink()
                if (t) { tokens.push(t); continue }
            } else if (this.match('***') || this.match('___')) {
                const t = this.parseBoldItalic()
                if (t) { tokens.push(t); continue }
            } else if (this.match('**') || this.match('__')) {
                const t = this.parseBold()
                if (t) { tokens.push(t); continue }
            } else if (ch === '*' || ch === '_') {
                const t = this.parseItalic()
                if (t) { tokens.push(t); continue }
            } else if (this.match('~~')) {
                const t = this.parseStrikethrough()
                if (t) { tokens.push(t); continue }
            }

            const text = this.collectText()
            if (text) {
                tokens.push(text)
            } else {
                this.pos++
            }
        }
        // 到达输入末尾仍未找到闭合分隔符 → 语法未闭合
        return null
    }

    /**
     * 解析图片 `![alt](url "title")`。
     * 正则捕获三组：
     *   [1] alt 文本（方括号内）
     *   [2] url（圆括号内，空格前的部分）
     *   [3] 可选 title（双引号内的部分）
     *
     * 图片不递归解析 alt 文本——alt 是纯文本描述。
     *
     * 示例：`![logo](https://a.com/1.png "Logo")` →
     *   Image, meta: { url: "https://a.com/1.png", alt: "logo", title: "Logo" }
     */
    private parseImage(): Token | null {
        // 从 pos 开始尝试匹配完整图片语法
        const match = this.input.slice(this.pos).match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/)
        if (!match) return null // 不匹配图片语法，回退
        const start = this.pos
        this.pos += match[0].length // 跳过整个语法
        return {
            type: TokenType.Image,
            value: match[0],
            span: this.makeSpan(start),
            meta: {
                url: match[2],           // 图片地址（捕获组 2）
                alt: match[1],           // 替代文本（捕获组 1）
                title: match[3] ?? null, // 可选 title（捕获组 3）
            },
        }
    }

    /**
     * 解析链接 `[text](url "title")`。
     * 正则与图片相同（但没有前面的 `!`）。
     *
     * 与图片的关键区别：链接文本 `[text]` 内部**递归解析**行内语法。
     * 例如 `[click **here**](url)` → Link 的 children 包含 Bold Token。
     *
     * 实现：new InlineLexer().parse(match[1]) — 创建新实例递归解析链接文本。
     */
    private parseLink(): Token | null {
        const match = this.input.slice(this.pos).match(/^\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/)
        if (!match) return null
        const start = this.pos
        this.pos += match[0].length // 跳过整个链接语法

        // 链接文本内的粗体/斜体需要递归解析
        // 创建新的 InlineLexer 实例避免干扰当前解析状态
        const innerLexer = new InlineLexer()
        const children = innerLexer.parse(match[1])

        return {
            type: TokenType.Link,
            value: match[0],
            children,
            span: this.makeSpan(start),
            meta: {
                url: match[2],           // 链接地址（捕获组 2）
                title: match[3] ?? null, // 可选 title（捕获组 3）
            },
        }
    }

    /**
     * 解析粗体 `**text**` 或 `__text__`。
     * 前进 2 个字符跳过开头分隔符，然后调用 parseUntilClosing 递归解析内部内容。
     * 如果找不到闭合分隔符，回退 pos 并返回 null。
     */
    private parseBold(): Token | null {
        // 判断是 ** 还是 __
        const delim = this.match('**') ? '**' : '__'
        const start = this.pos
        this.pos += 2 // 跳过开头的 ** 或 __

        const children = this.parseUntilClosing(delim)
        if (children === null) {
            // 找不到闭合：还原 pos，让上层当普通字符处理
            this.pos = start
            return null
        }
        return {
            type: TokenType.Bold,
            value: this.input.slice(start, this.pos),
            children,
            span: this.makeSpan(start),
        }
    }

    /**
     * 解析斜体 `*text*` 或 `_text_`。
     * 前进 1 个字符跳过开头分隔符，然后调用 parseUntilClosing 递归解析内部内容。
     * 如果找不到闭合分隔符，回退 pos 并返回 null。
     */
    private parseItalic(): Token | null {
        const delim = this.peek() // 当前字符就是分隔符（* 或 _）
        const start = this.pos
        this.pos += 1 // 跳过开头的 * 或 _

        const children = this.parseUntilClosing(delim)
        if (children === null) {
            this.pos = start
            return null
        }
        return {
            type: TokenType.Italic,
            value: this.input.slice(start, this.pos),
            children,
            span: this.makeSpan(start),
        }
    }

    /**
     * 解析粗斜体 `***text***` 或 `___text___`。
     * 前进 3 个字符跳过开头分隔符。解析逻辑与粗体/斜体相同。
     * 必须在粗体和斜体之前匹配，否则 `***` 会被粗体（`**`）先抢走两个。
     */
    private parseBoldItalic(): Token | null {
        const delim = this.match('***') ? '***' : '___'
        const start = this.pos
        this.pos += 3 // 跳过开头的 *** 或 ___

        const children = this.parseUntilClosing(delim)
        if (children === null) {
            this.pos = start
            return null
        }
        return {
            type: TokenType.BoldItalic,
            value: this.input.slice(start, this.pos),
            children,
            span: this.makeSpan(start),
        }
    }

    /**
     * 解析删除线 `~~text~~`。
     * 前进 2 个字符跳过开头 `~~`，调用 parseUntilClosing 解析内部内容。
     */
    private parseStrikethrough(): Token | null {
        const start = this.pos
        this.pos += 2 // 跳过开头的 ~~

        const children = this.parseUntilClosing('~~')
        if (children === null) {
            this.pos = start
            return null
        }
        return {
            type: TokenType.Strikethrough,
            value: this.input.slice(start, this.pos),
            children,
            span: this.makeSpan(start),
        }
    }
}

// ============================================================================
// 测试 — 在 App.vue 的 onMounted 中调用 testInlineLexer() 查看控制台输出
// ============================================================================

/**
 * 手动测试函数：对多种 Markdown 行内语法调用 parse() 并打印结果。
 * 在浏览器控制台查看每个测试用例的 Token 树结构。
 */
export function testInlineLexer() {
    const lexer = new InlineLexer()

    /** 递归打印 Token 树，嵌套用缩进表示层级 */
    function print(name: string, tokens: Token[], indent = 0) {
        const pad = '  '.repeat(indent)
        console.log(`${pad}--- ${name} ---`)
        for (const t of tokens) {
            console.log(`${pad}${t.type}: "${t.value}"`)
            if (t.children && t.children.length > 0) {
                print('children', t.children, indent + 1)
            }
        }
    }

    print('Basic bold', lexer.parse('hello **world**!'))
    print('Bold with italic inside', lexer.parse('**bold *italic* end**'))
    print('Escape', lexer.parse('not \\*italic\\* here'))
    print('Inline code', lexer.parse('`**not bold**`'))
    print('Link with bold', lexer.parse('[click **here**](url)'))
    print('Strikethrough', lexer.parse('~~old text~~ new'))
    print('Image', lexer.parse('see ![alt](img.png "title") here'))
    print('BoldItalic', lexer.parse('***all three***'))
}
