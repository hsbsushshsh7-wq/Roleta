import { describe, expect, it } from "vitest";
import { initialData } from "../src/data/defaults";
import { getSource, parseList, rangeCount } from "../src/engine/options";
describe("option sources", () => {
  it("accepts negatives, zero, one value and large lazy ranges", () => {
    const data = initialData();
    data.ranges.numbers = { min: -3, max: 4, step: 1 };
    const s = getSource(data);
    expect(s.count).toBe(8);
    expect(s.label(0)).toBe("-3");
    expect(s.label(7)).toBe("4");
    expect(rangeCount({ min: 0, max: 0, step: 1 })).toBe(1);
    data.ranges.numbers = { min: -1000000000, max: 1000000000, step: 1 };
    expect(getSource(data).count).toBe(2000000001);
    expect(getSource(data).label(2000000000)).toBe("1000000000");
  });
  it("supports exact percentage steps without floating point drift", () => {
    const data = initialData();
    data.mode = "percentage";
    data.ranges.percentage = { min: 0.1, max: 0.5, step: 0.1 };
    const s = getSource(data);
    expect(s.count).toBe(5);
    expect(s.label(4)).toBe("0,5%");
    expect(() => rangeCount({ min: 0, max: 100, step: 3 }, true)).toThrow();
    expect(() => rangeCount({ min: -1, max: 100, step: 1 }, true)).toThrow();
    expect(() => rangeCount({ min: 0, max: 100, step: 0.001 }, true)).toThrow();
  });
  it.each([
    { min: 5, max: 1, step: 1 },
    { min: 0.5, max: 4, step: 1 },
    { min: 0, max: Infinity, step: 1 },
    { min: 0, max: 2 ** 53, step: 1 },
    { min: -Number.MAX_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER, step: 1 },
  ])("rejects an invalid integer interval %j", (range) =>
    expect(() => rangeCount(range)).toThrow(),
  );
  it("parses comma, CRLF, blank entries, semicolon, whitespace and Unicode", () => {
    expect(parseList(" Goku,\n Vegeta ,,;São João\r\nSon Gohan ; ")).toEqual([
      "Goku",
      "Vegeta",
      "São João",
      "Son Gohan",
    ]);
    expect(parseList("Goku,Goku")).toEqual(["Goku", "Goku"]);
  });
  it("handles a 400-name fixture and 50000 entries", () => {
    // Synthetic test fixtures only; production never replaces the original roster with these names.
    expect(
      parseList(
        Array.from({ length: 400 }, (_, i) => `Fixture ${i}`).join(",\n"),
      ),
    ).toHaveLength(400);
    expect(parseList("x,".repeat(50000))).toHaveLength(50000);
    expect(() => parseList("x,".repeat(50001))).toThrow();
  });
  it("keeps lists and ranges independent across all five modes", () => {
    const data = initialData();
    data.lists.words = ["Olá", "Mundo"];
    data.lists.powers = ["Poder importado"];
    expect(getSource(data, "words").label(1)).toBe("Mundo");
    expect(getSource(data, "powers").count).toBe(1);
    expect(getSource(data, "creator").label(0)).toBe("Goku");
    expect(getSource(data, "numbers").count).toBe(10);
    expect(getSource(data, "percentage").count).toBe(101);
  });
});
