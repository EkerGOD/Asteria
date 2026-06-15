import { describe, it, expect } from "vitest";
import { InlineLexer } from "../inline-parser";
import { TokenType } from "../types";

describe("InlineLexer", () => {
  const lexer = new InlineLexer();

  function parse(input: string) {
    return lexer.parse(input);
  }

  describe("plain text", () => {
    it("returns Text token for plain input", () => {
      const tokens = parse("hello world");
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.Text);
    });

    it("empty input returns empty array", () => {
      expect(parse("")).toEqual([]);
    });
  });

  describe("escape", () => {
    it("escapes asterisk as plain text", () => {
      const tokens = parse("not \\*italic\\* here");
      const texts = tokens.filter((t) => t.type === TokenType.Text);
      expect(texts.some((t) => t.value.includes("*"))).toBe(true);
    });
  });

  describe("inline code", () => {
    it("parses inline code and suppresses inner formatting", () => {
      const tokens = parse("`**not bold**`");
      const code = tokens.find((t) => t.type === TokenType.InlineCode);
      expect(code).toBeDefined();
      expect(code!.meta?.content).toBe("**not bold**");
    });
  });

  describe("image", () => {
    it("parses image with url", () => {
      const tokens = parse("see ![alt](img.png) here");
      const images = tokens.filter((t) => t.type === TokenType.Image);
      expect(images).toHaveLength(1);
      expect(images[0].meta?.url).toBe("img.png");
      expect(images[0].meta?.alt).toBe("alt");
    });
  });

  describe("link", () => {
    it("parses link with url", () => {
      const tokens = parse("[click here](https://example.com)");
      const link = tokens.find((t) => t.type === TokenType.Link);
      expect(link).toBeDefined();
      expect(link!.meta?.url).toBe("https://example.com");
    });

    it("parses link with nested bold", () => {
      const tokens = parse("[click **here**](url)");
      const link = tokens.find((t) => t.type === TokenType.Link);
      expect(link).toBeDefined();
      expect(link!.children!.some((c) => c.type === TokenType.Bold)).toBe(true);
    });
  });

  describe("bold", () => {
    it("parses bold with double asterisks", () => {
      const tokens = parse("hello **world**!");
      const bold = tokens.find((t) => t.type === TokenType.Bold);
      expect(bold).toBeDefined();
      expect(bold!.children![0].value).toBe("world");
    });

    it("parses bold with double underscores", () => {
      const tokens = parse("hello __world__!");
      const bold = tokens.find((t) => t.type === TokenType.Bold);
      expect(bold).toBeDefined();
    });
  });

  describe("italic", () => {
    it("parses italic with single asterisk", () => {
      const tokens = parse("hello *world*!");
      const italic = tokens.find((t) => t.type === TokenType.Italic);
      expect(italic).toBeDefined();
    });
  });

  describe("bold-italic", () => {
    it("parses bold-italic with triple asterisks", () => {
      const tokens = parse("***all three***");
      const bi = tokens.find((t) => t.type === TokenType.BoldItalic);
      expect(bi).toBeDefined();
    });
  });

  describe("strikethrough", () => {
    it("parses strikethrough with double tildes", () => {
      const tokens = parse("~~old text~~ new");
      const st = tokens.find((t) => t.type === TokenType.Strikethrough);
      expect(st).toBeDefined();
    });
  });

  describe("nesting", () => {
    it("bold contains italic inside", () => {
      const tokens = parse("**bold *italic* end**");
      const bold = tokens.find((t) => t.type === TokenType.Bold);
      expect(bold).toBeDefined();
      expect(bold!.children!.some((c) => c.type === TokenType.Italic)).toBe(true);
    });

    it("handles adjacent bold and italic", () => {
      const tokens = parse("**bold** *italic*");
      expect(tokens.filter((t) => t.type === TokenType.Bold)).toHaveLength(1);
      expect(tokens.filter((t) => t.type === TokenType.Italic)).toHaveLength(1);
    });
  });
});
