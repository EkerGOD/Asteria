import { describe, it, expect } from "vitest";
import { BlockLexer } from "../lexer";
import { TokenType } from "../types";

describe("BlockLexer", () => {
  const lexer = new BlockLexer();

  function tokenize(input: string) {
    return lexer.tokenize(input);
  }

  describe("headings", () => {
    it("parses h1 to h6 headings", () => {
      const tokens = tokenize("# H1\n## H2\n###### H6");
      const headings = tokens.filter((t) => t.type === TokenType.Heading);
      expect(headings).toHaveLength(3);
      expect(headings[0].meta?.level).toBe(1);
      expect(headings[1].meta?.level).toBe(2);
      expect(headings[2].meta?.level).toBe(6);
    });

    it("requires space after # markers", () => {
      const tokens = tokenize("#not heading");
      expect(tokens.every((t) => t.type !== TokenType.Heading)).toBe(true);
    });
  });

  describe("paragraphs", () => {
    it("parses plain text as paragraph", () => {
      const tokens = tokenize("Hello world");
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.Paragraph);
      expect(tokens[0].value).toBe("Hello world");
    });

    it("merges consecutive text lines into one paragraph", () => {
      const tokens = tokenize("Line 1\nLine 2\nLine 3");
      const para = tokens.find((t) => t.type === TokenType.Paragraph);
      expect(para).toBeDefined();
      expect(para!.value).toContain("Line 1");
      expect(para!.value).toContain("Line 3");
    });

    it("paragraph stops at empty line", () => {
      const tokens = tokenize("Line 1\n\nLine 2");
      const paras = tokens.filter((t) => t.type === TokenType.Paragraph);
      expect(paras).toHaveLength(2);
    });
  });

  describe("empty lines", () => {
    it("skips empty lines entirely", () => {
      const tokens = tokenize("\n\n\n");
      expect(tokens).toHaveLength(0);
    });
  });

  describe("code fences", () => {
    it("parses fenced code block with language", () => {
      const tokens = tokenize("```ts\nconst x = 1\n```");
      const fence = tokens.find((t) => t.type === TokenType.CodeFence);
      expect(fence).toBeDefined();
      expect(fence!.meta?.language).toBe("ts");
      expect(fence!.meta?.content).toBe("const x = 1");
    });

    it("handles unclosed code fence at end of document", () => {
      const tokens = tokenize("```js\nconst x = 1");
      const fence = tokens.find((t) => t.type === TokenType.CodeFence);
      expect(fence).toBeDefined();
      expect(fence!.meta?.language).toBe("js");
    });

    it("empty code block", () => {
      const tokens = tokenize("```\n```");
      const fence = tokens.find((t) => t.type === TokenType.CodeFence);
      expect(fence).toBeDefined();
      expect(fence!.meta?.content).toBe("");
    });
  });

  describe("horizontal rules", () => {
    it("parses three dashes as horizontal rule", () => {
      const tokens = tokenize("---");
      expect(tokens[0].type).toBe(TokenType.HorizontalRule);
    });

    it("parses three asterisks as horizontal rule", () => {
      const tokens = tokenize("***");
      expect(tokens[0].type).toBe(TokenType.HorizontalRule);
    });

    it("parses three underscores as horizontal rule", () => {
      const tokens = tokenize("___");
      expect(tokens[0].type).toBe(TokenType.HorizontalRule);
    });

    it("parses longer dashes as horizontal rule", () => {
      const tokens = tokenize("--------");
      expect(tokens[0].type).toBe(TokenType.HorizontalRule);
    });
  });

  describe("blockquotes", () => {
    it("parses blockquote line", () => {
      const tokens = tokenize("> quoted text");
      expect(tokens[0].type).toBe(TokenType.Blockquote);
      expect(tokens[0].value).toContain("quoted text");
    });

    it("each blockquote line is a separate token", () => {
      const tokens = tokenize("> line 1\n> line 2");
      expect(tokens).toHaveLength(2);
      expect(tokens.every((t) => t.type === TokenType.Blockquote)).toBe(true);
    });
  });

  describe("task lists", () => {
    it("parses unchecked task with dash", () => {
      const tokens = tokenize("- [ ] incomplete task");
      const item = tokens[0];
      expect(item.type).toBe(TokenType.ListItem);
      expect(item.meta?.task).toBe(true);
      expect(item.meta?.checked).toBe(false);
    });

    it("parses checked task with dash", () => {
      const tokens = tokenize("- [x] complete task");
      const item = tokens[0];
      expect(item.type).toBe(TokenType.ListItem);
      expect(item.meta?.task).toBe(true);
      expect(item.meta?.checked).toBe(true);
    });

    it("parses task with asterisk marker", () => {
      const tokens = tokenize("* [ ] task with star");
      expect(tokens[0].type).toBe(TokenType.ListItem);
      expect(tokens[0].meta?.task).toBe(true);
    });

    it("parses task with plus marker", () => {
      const tokens = tokenize("+ [x] task with plus");
      expect(tokens[0].type).toBe(TokenType.ListItem);
      expect(tokens[0].meta?.checked).toBe(true);
    });
  });

  describe("unordered lists", () => {
    it("parses unordered list with dash", () => {
      const tokens = tokenize("- item 1");
      expect(tokens[0].type).toBe(TokenType.ListItem);
    });

    it("parses unordered list with asterisk", () => {
      const tokens = tokenize("* item 1");
      expect(tokens[0].type).toBe(TokenType.ListItem);
    });

    it("parses unordered list with plus", () => {
      const tokens = tokenize("+ item 1");
      expect(tokens[0].type).toBe(TokenType.ListItem);
    });

    it("task list takes priority over unordered list", () => {
      const tokens = tokenize("- [ ] task");
      expect(tokens[0].meta?.task).toBe(true);
      expect(tokens[0].meta).not.toHaveProperty("ordered");
    });
  });

  describe("ordered lists", () => {
    it("parses ordered list", () => {
      const tokens = tokenize("1. first item");
      expect(tokens[0].type).toBe(TokenType.ListItem);
      expect(tokens[0].meta?.ordered).toBe(true);
    });

    it("parses multi-digit ordered list", () => {
      const tokens = tokenize("123. item");
      expect(tokens[0].type).toBe(TokenType.ListItem);
      expect(tokens[0].meta?.ordered).toBe(true);
    });
  });

  describe("tables", () => {
    it("parses table with header, separator, and data rows", () => {
      const input = "| A |\n| - |\n| 1 |";
      const tokens = tokenize(input);
      const table = tokens.find((t) => t.type === TokenType.Table);
      expect(table).toBeDefined();
    });

    it("single header row without separator is not a table", () => {
      const tokens = tokenize("| A | B |");
      expect(tokens.every((t) => t.type !== TokenType.Table)).toBe(true);
    });
  });

  describe("full document", () => {
    it("parses a mixed document correctly", () => {
      const md = [
        "# Hello World",
        "",
        "This is a paragraph.",
        "",
        "- Item 1",
        "- Item 2",
        "- [x] Done task",
        "",
        "```js",
        "const x = 1",
        "```",
        "",
        "| A | B |",
        "| - | - |",
        "| 1 | 2 |",
      ].join("\n");

      const tokens = tokenize(md);
      const types = tokens.map((t) => t.type);

      expect(types).toContain(TokenType.Heading);
      expect(types).toContain(TokenType.Paragraph);
      expect(types).toContain(TokenType.ListItem);
      expect(types).toContain(TokenType.CodeFence);
    });
  });
});
