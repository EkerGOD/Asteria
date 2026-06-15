import { describe, it, expect } from "vitest";
import { parseAlignments, splitCells, isTableSeparator } from "../widgets";

describe("widget utilities", () => {
  describe("splitCells", () => {
    it("splits simple pipe-separated cells", () => {
      expect(splitCells("| A | B | C |")).toEqual([" A ", " B ", " C "]);
    });

    it("handles cells without leading/trailing pipes", () => {
      expect(splitCells("A|B|C")).toEqual(["A", "B", "C"]);
    });

    it("handles empty cells", () => {
      const result = splitCells("| A | | C |");
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it("handles single cell", () => {
      expect(splitCells("| A |")).toEqual([" A "]);
    });
  });

  describe("isTableSeparator", () => {
    it("identifies valid separator line", () => {
      expect(isTableSeparator("| - | - |")).toBe(true);
    });

    it("identifies separator with alignment", () => {
      expect(isTableSeparator("| :--- | ---: | :---: |")).toBe(true);
    });

    it("rejects lines without pipes", () => {
      expect(isTableSeparator("---")).toBe(false);
    });

    it("rejects text lines", () => {
      expect(isTableSeparator("| A | B |")).toBe(false);
    });

    it("rejects separator missing closing pipe", () => {
      expect(isTableSeparator("| - | -")).toBe(false);
    });
  });

  describe("parseAlignments", () => {
    it("returns left alignment for default", () => {
      expect(parseAlignments("| - | - |")).toEqual(["left", "left"]);
    });

    it("returns center for colons on both sides", () => {
      expect(parseAlignments("| :---: |")).toEqual(["center"]);
    });

    it("returns right for colon on right", () => {
      expect(parseAlignments("| ---: |")).toEqual(["right"]);
    });

    it("handles mixed alignments", () => {
      expect(parseAlignments("| :--- | ---: | :---: | --- |")).toEqual([
        "left",
        "right",
        "center",
        "left",
      ]);
    });
  });
});
