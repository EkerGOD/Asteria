// ============================================================================
// 简易语法高亮引擎
// ============================================================================

type TokenRule = { pattern: RegExp; className: string }

/** 按语言返回高亮规则列表 */
function getRules(lang: string): TokenRule[] {
  const l = lang.toLowerCase();
  if (l === "js" || l === "javascript" || l === "ts" || l === "typescript") {
    return [
      { pattern: /(\/\/.*$)/gm, className: "cm-token-comment" },
      {
        pattern:
          /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g,
        className: "cm-token-string",
      },
      {
        pattern:
          /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|new|this|typeof|instanceof|try|catch|throw)\b/g,
        className: "cm-token-keyword",
      },
      { pattern: /\b(true|false|null|undefined)\b/g, className: "cm-token-atom" },
      { pattern: /\b(\d+(\.\d+)?)\b/g, className: "cm-token-number" },
    ];
  }
  if (l === "py" || l === "python") {
    return [
      { pattern: /(#.*$)/gm, className: "cm-token-comment" },
      {
        pattern:
          /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g,
        className: "cm-token-string",
      },
      {
        pattern:
          /\b(def|class|import|from|return|if|elif|else|for|while|try|except|finally|with|as|in|not|and|or|is|lambda|pass|break|continue|raise|yield|True|False|None)\b/g,
        className: "cm-token-keyword",
      },
      { pattern: /\b(\d+(\.\d+)?)\b/g, className: "cm-token-number" },
    ];
  }
  if (l === "rust" || l === "rs") {
    return [
      { pattern: /(\/\/.*$)/gm, className: "cm-token-comment" },
      { pattern: /("(?:[^"\\]|\\.)*")/g, className: "cm-token-string" },
      {
        pattern:
          /\b(fn|let|mut|const|struct|enum|impl|trait|pub|use|mod|if|else|match|for|while|loop|return|self|super|where|as|in|ref|move|async|await|unsafe|dyn|true|false|Some|None|Ok|Err)\b/g,
        className: "cm-token-keyword",
      },
      {
        pattern: /\b(\d+(\.\d+)?[uif]?(32|64|size)?)\b/g,
        className: "cm-token-number",
      },
    ];
  }
  if (l === "html" || l === "xml") {
    return [
      { pattern: /(<!--[\s\S]*?-->)/g, className: "cm-token-comment" },
      { pattern: /(<\/?)(\w[\w-]*)/g, className: "cm-token-tag" },
      {
        pattern: /(\w[\w-]*)=("[^"]*"|'[^']*')/g,
        className: "cm-token-attr",
      },
    ];
  }
  if (l === "css") {
    return [
      { pattern: /(\/\*[\s\S]*?\*\/)/g, className: "cm-token-comment" },
      { pattern: /("[^"]*"|'[^']*')/g, className: "cm-token-string" },
      { pattern: /\b([a-z-]+)(?=\s*:)/g, className: "cm-token-property" },
      { pattern: /(:)([^;}{]+)/g, className: "cm-token-value" },
      { pattern: /\b([.#@]\w[\w-]*)\b/g, className: "cm-token-selector" },
    ];
  }
  if (l === "json") {
    return [
      {
        pattern: /("(?:[^"\\]|\\.)*")(?=\s*:)/g,
        className: "cm-token-key",
      },
      { pattern: /("(?:[^"\\]|\\.)*")/g, className: "cm-token-string" },
      { pattern: /\b(true|false|null)\b/g, className: "cm-token-atom" },
      {
        pattern: /\b(-?\d+(\.\d+)?([eE][+-]?\d+)?)\b/g,
        className: "cm-token-number",
      },
    ];
  }
  return [];
}

function findHighlightType(
  code: string,
  pos: number,
  rules: TokenRule[]
): string {
  for (const rule of rules) {
    const re = new RegExp(rule.pattern.source, rule.pattern.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(code)) !== null) {
      if (pos >= m.index && pos < m.index + m[0].length) {
        return rule.className;
      }
    }
  }
  return "";
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * 按规则对代码进行语法高亮。
 * 依次应用每个规则的正则，匹配到的文本用 `<span class="...">` 包裹。
 * 已高亮的部分用 null 占位避免重复匹配。
 */
export function highlightCode(code: string, lang: string): string {
  const rules = getRules(lang);
  if (rules.length === 0) return escapeHtml(code);

  const marks: (1 | null)[] = new Array(code.length).fill(1);

  for (const rule of rules) {
    const re = new RegExp(rule.pattern.source, rule.pattern.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(code)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      let overlap = false;
      for (let k = start; k < end && k < marks.length; k++) {
        if (marks[k] === null) {
          overlap = true;
          break;
        }
      }
      if (!overlap) {
        for (let k = start; k < end; k++) marks[k] = null;
      }
    }
  }

  let result = "";
  let i = 0;
  while (i < code.length) {
    if (marks[i] === null) {
      const type = findHighlightType(code, i, rules);
      const start = i;
      while (i < code.length && marks[i] === null) i++;
      result += `<span class="${type}">${escapeHtml(code.slice(start, i))}</span>`;
    } else {
      result += escapeHtml(code[i]);
      i++;
    }
  }
  return result;
}
