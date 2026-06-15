/** 文档中的字符位置 */
export interface Position {
    /** 行号（从 0 开始） */
    line: number
    /** 列号（从 0 开始，即本行第几个字符） */
    column: number
    /** 从文档开头算起的字节偏移量 */
    offset: number
}

/** 文档中的一段连续范围 */
export interface SourceSpan {
    /** 范围起点 */
    start: Position
    /** 范围终点 */
    end: Position
}

/** 词法单元类型 */
export enum TokenType {
    // ===== 基础 =====
    Text = 'text',
    Newline = 'newline',
    EOF = 'eof',

    // ===== 块级 ===== 
    Heading = 'heading',
    CodeFence = 'code_fence',
    Blockquote = 'blockquote',
    HorizontalRule = 'horizontal_rule',
    Paragraph = 'paragraph',
    Table = 'table',

    // ===== 列表相关 ===== 
    List = 'list',
    ListItem = 'list_item',
    TaskCheckbox = 'task_checkbox',

    // ===== 行内 ===== 
    Bold = 'bold',
    Italic = 'italic',
    BoldItalic = 'bold_italic',
    InlineCode = 'inline_code',
    Link = 'link',
    Image = 'image',
    Strikethrough = 'strikethrough',
    HardBreak = 'hard_break',

}

/** 词法分析器产出的最小单元 */
export interface Token {
    /** 这个 token 的类型 */
    type: TokenType
    /** 原始文本内容 */
    value: string
    /** 在文档中的位置范围 */
    span: SourceSpan
    /** 子 Token（行内 Token 挂在这里） */
    children?: Token[]
    /** 附加数据，比如标题级别、代码块语言 */
    meta?: Record<string, unknown>
}

/** AST 节点 */
export interface MDNode {
    /** 节点类型 */
    type: TokenType
    /** 在文档中的位置范围 */
    span: SourceSpan
    /** 子节点（树形结构的关键） */
    children?: MDNode[]
    /** 节点属性 */
    props?: Record<string, unknown>
}