import { describe, expect, it } from "vitest";
import type { Draw } from "../src/models/types";
import {
  csvCell,
  filterHistory,
  historyCsv,
  summarizeHistory,
} from "../src/engine/statistics";
const draw = (id: string, overrides: Partial<Draw> = {}): Draw => ({
  id,
  mode: "words",
  value: "Ana",
  index: 0,
  count: 2,
  at: "2026-10-21T12:00:00.000Z",
  sessionId: "one",
  ...overrides,
});
describe("statistics", () => {
  it("keeps duplicate labels, different sessions and modes separate", () => {
    const result = summarizeHistory([
      draw("1"),
      draw("2"),
      draw("3", { index: 1 }),
      draw("4", { sessionId: "two" }),
      draw("5", { mode: "powers" }),
    ]);
    expect(result.total).toBe(5);
    expect(result.distinct).toBe(4);
    expect(result.top?.count).toBe(2);
    expect(result.top?.frequency).toBe(40);
    expect(result.ranked.reduce((n, row) => n + row.frequency, 0)).toBe(100);
  });
  it("does not combine legacy records without session identity", () => {
    expect(
      summarizeHistory([
        draw("1", { sessionId: undefined }),
        draw("2", { sessionId: undefined }),
      ]).distinct,
    ).toBe(2);
  });
  it("filters modes, explicit empty initial sessions, batches and individual spins", () => {
    const history = [
      draw("1"),
      draw("2", { tool: "batch" }),
      draw("3", { mode: "creator" }),
      draw("4", { sessionId: "" }),
    ];
    expect(
      filterHistory(history, {
        mode: "words",
        sessionId: "one",
        kind: "wheel",
      }).map((d) => d.id),
    ).toEqual(["1"]);
    expect(
      filterHistory(history, { mode: "all", kind: "batch" }).map((d) => d.id),
    ).toEqual(["2"]);
    expect(
      filterHistory(history, { mode: "words", sessionId: "", kind: "all" }).map(
        (d) => d.id,
      ),
    ).toEqual(["4"]);
    expect(filterHistory(history, { mode: "all", kind: "all" })).toHaveLength(
      4,
    );
  });
  it("handles empty history and identifies tied leaders without implying significance", () => {
    expect(summarizeHistory([])).toMatchObject({
      total: 0,
      distinct: 0,
      top: null,
      tiedTop: 0,
      ranked: [],
    });
    const summary = summarizeHistory([
      draw("1"),
      draw("2", { index: 1, value: "Bia", tool: "batch" }),
    ]);
    expect(summary.tiedTop).toBe(2);
    expect(summary.batch).toBe(1);
  });
  it("escapes CSV separators, quotes and multiline names", () => {
    expect(csvCell('Ana; "A"\nBia')).toBe('"Ana; ""A""\nBia"');
    expect(csvCell("Nome normal")).toBe('"Nome normal"');
  });
  it.each([
    "=SUM(A1:A2)",
    "+DDE",
    "-1",
    "@formula",
    "  =HYPERLINK(x)",
    "\tformula",
    "\nformula",
  ])("neutralizes spreadsheet formula %s", (value) => {
    expect(csvCell(value)).toBe(`"'${value}"`);
  });
  it("exports filtered raw records in chronological order without mutating input", () => {
    const history = [
      draw("2", {
        at: "2026-10-21T13:00:00.000Z",
        value: "Último",
        tool: "batch",
      }),
      draw("1", { value: "Primeiro" }),
    ];
    const csv = historyCsv(history);
    expect(csv.split("\r\n")).toHaveLength(3);
    expect(csv.indexOf("Primeiro")).toBeLessThan(csv.indexOf("Último"));
    expect(csv).toContain('"lote"');
    expect(history[0]?.id).toBe("2");
    expect(historyCsv([])).toContain('"Resultado"');
  });
});
