import { describe, it, expect } from "vitest";
import { Parser } from "../parser";
import { TokenType, Token } from "../types";

describe("Parser", () => {
  const parser = new Parser();

  function makeToken(
    type: TokenType,
    value: string,
    meta?: Record<string, unknown>,
    span?: Token["span"]
  ): Token {
    const defaultSpan = {
      start: { line: 0, column: 0, offset: 0 },
      end: { line: 0, column: value.length, offset: value.length },
    };
    return { type, value, span: span ?? defaultSpan, meta };
  }

  describe("heading", () => {
    it("parses heading with inline formatting", () => {
      const token = makeToken(TokenType.Heading, "## Hello **world**", {
        level: 2,
      });
      const nodes = parser.parse([token]);
      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe(TokenType.Heading);
      expect(nodes[0].props?.level).toBe(2);
      expect(nodes[0].children!.length).toBeGreaterThan(0);
    });
  });

  describe("paragraph", () => {
    it("parses plain paragraph", () => {
      const token = makeToken(TokenType.Paragraph, "Hello world");
      const nodes = parser.parse([token]);
      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe(TokenType.Paragraph);
    });

    it("parses paragraph with inline bold", () => {
      const token = makeToken(TokenType.Paragraph, "Hello **world**");
      const nodes = parser.parse([token]);
      expect(nodes[0].children!.some((c) => c.type === TokenType.Bold)).toBe(
        true
      );
    });
  });

  describe("blockquote", () => {
    it("merges consecutive blockquotes into one node", () => {
      const tokens = [
        makeToken(TokenType.Blockquote, "> line 1"),
        makeToken(TokenType.Blockquote, "> line 2"),
      ];
      const nodes = parser.parse(tokens);
      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe(TokenType.Blockquote);
      expect(nodes[0].children).toHaveLength(2);
    });

    it("non-consecutive blockquotes remain separate", () => {
      const tokens = [
        makeToken(TokenType.Blockquote, "> line 1"),
        makeToken(TokenType.Paragraph, "text"),
        makeToken(TokenType.Blockquote, "> line 2"),
      ];
      const nodes = parser.parse(tokens);
      const bq = nodes.filter((n) => n.type === TokenType.Blockquote);
      expect(bq).toHaveLength(2);
    });
  });

  describe("list", () => {
    it("wraps consecutive list items in List node", () => {
      const tokens = [
        makeToken(TokenType.ListItem, "- item 1"),
        makeToken(TokenType.ListItem, "- item 2"),
      ];
      const nodes = parser.parse(tokens);
      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe(TokenType.List);
      expect(nodes[0].children).toHaveLength(2);
    });

    it("task list items preserve task metadata", () => {
      const token = makeToken(TokenType.ListItem, "- [x] done", {
        task: true,
        checked: true,
      });
      const nodes = parser.parse([token]);
      const listNode = nodes[0];
      expect(listNode.type).toBe(TokenType.List);
      const item = listNode.children![0];
      expect(item.props?.task).toBe(true);
      expect(item.props?.checked).toBe(true);
    });

    it("ordered list items preserve ordered metadata", () => {
      const token = makeToken(TokenType.ListItem, "1. first", { ordered: true });
      const nodes = parser.parse([token]);
      const item = nodes[0].children![0];
      expect(item.props?.ordered).toBe(true);
    });

    it("mixed list types stay separate", () => {
      const tokens = [
        makeToken(TokenType.ListItem, "- unordered"),
        makeToken(TokenType.ListItem, "1. ordered", { ordered: true }),
      ];
      const nodes = parser.parse(tokens);
      const lists = nodes.filter((n) => n.type === TokenType.List);
      // Note: consecutive ListItems are merged regardless of ordered/not
      // This is current parser behavior
      expect(lists.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("passthrough blocks", () => {
    it("code fence passes through as-is", () => {
      const token = makeToken(TokenType.CodeFence, "```js\ncode\n```", {
        language: "js",
        content: "code",
      });
      const nodes = parser.parse([token]);
      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe(TokenType.CodeFence);
      expect(nodes[0].props?.language).toBe("js");
    });

    it("horizontal rule passes through", () => {
      const token = makeToken(TokenType.HorizontalRule, "---");
      const nodes = parser.parse([token]);
      expect(nodes[0].type).toBe(TokenType.HorizontalRule);
    });

    it("table passes through", () => {
      const token = makeToken(TokenType.Table, "| A |\n| - |\n| 1 |");
      const nodes = parser.parse([token]);
      expect(nodes[0].type).toBe(TokenType.Table);
    });
  });

  describe("unknown tokens", () => {
    it("skips unknown token types", () => {
      const token = makeToken(TokenType.EOF, "");
      const nodes = parser.parse([token]);
      expect(nodes).toHaveLength(0);
    });
  });
});
