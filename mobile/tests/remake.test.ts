import { describe, it, expect } from "vitest";
import { initialData } from "../src/data/defaults";
import {
  changeChance,
  distributionTotal,
  optionWeight,
  reconcileSources,
} from "../src/engine/rules";
import { decodeData } from "../src/storage/schema";
import {
  chancePercent,
  createLayout,
  pointedSlice,
} from "../src/engine/weighted";
import { planSpin } from "../src/engine/draw";
import { savePreset, loadPreset } from "../src/engine/presets";
import {
  PALETTES,
  visualColors,
  normalizeHex,
  contrastText,
} from "../src/engine/appearance";
import { coloredPaths } from "../src/engine/wheelGeometry";
import {
  drawBatch,
  balancedTeams,
  applyTemplate,
  QUICK_TEMPLATES,
} from "../src/engine/toolbox";
const zero = (): [number, number] => [0, 0];
describe("Remake migration", () => {
  it("migrates v1.1 weights once without changing actual probabilities or snapshots", () => {
    const old = JSON.parse(
      JSON.stringify(savePreset(initialData(), "Anterior")),
    );
    delete old.toolbox;
    delete old.preferences.resultPopup;
    delete old.preferences.focusMode;
    for (const rules of Object.values(old.rules) as {
      appearance?: unknown;
      distribution: unknown;
    }[]) {
      delete rules.appearance;
      rules.distribution = { base: 1, overrides: {} };
    }
    old.rules.numbers.distribution = { base: 0.05, overrides: { 0: 0.55 } };
    delete old.presets[0].config.rules.appearance;
    old.presets[0].config.rules.distribution = {
      base: 0.05,
      overrides: { 0: 0.55 },
    };
    const next = decodeData(JSON.stringify(old));
    expect(next.rules.numbers.distribution.base).toBeCloseTo(5);
    expect(optionWeight(next.rules.numbers.distribution, 0)).toBeCloseTo(55);
    expect(
      chancePercent(
        0,
        next.rules.numbers,
        distributionTotal(next.rules.numbers.distribution, 10),
      ),
    ).toBeCloseTo(55);
    expect(next.preferences.resultPopup).toBe(true);
    expect(next.rules.numbers.appearance.palette).toBe("classic");
    expect(decodeData(JSON.stringify(next))).toEqual(next);
    expect(next.presets[0]!.config.rules.distribution.format).toBe("relative");
  });
  it("preserves independent weights, custom colors, title and labels through backups/presets", () => {
    let d = initialData();
    const rules = d.rules.numbers;
    rules.chance = true;
    rules.distribution = changeChance(rules.distribution, 10, 0, 900);
    rules.appearance = {
      palette: "ocean",
      overrides: { 0: "#AABBCC" },
      title: "Minha escolha",
      showLabels: false,
    };
    d = savePreset(d, "Meu estilo");
    const restored = loadPreset(
      decodeData(JSON.stringify(d)),
      d.presets[0]!.id,
    );
    expect(restored.rules.numbers.appearance).toEqual(rules.appearance);
    expect(optionWeight(restored.rules.numbers.distribution, 0)).toBe(900);
  });
  it("source changes reset custom colors but preserve title and palette", () => {
    const before = initialData();
    before.rules.numbers.appearance = {
      palette: "pastel",
      overrides: { 9: "#000000" },
      title: "Decisão",
      showLabels: false,
    };
    const after = reconcileSources(before, {
      ...before,
      ranges: { ...before.ranges, numbers: { min: 0, max: 2, step: 1 } },
    });
    expect(after.rules.numbers.appearance).toEqual({
      ...before.rules.numbers.appearance,
      overrides: {},
    });
    expect(after.rules.numbers.distribution.format).toBe("relative");
  });
  it("rejects malicious colors, nonexistent indices and excessive team payloads", () => {
    const d = initialData();
    d.rules.numbers.appearance.overrides[0] = "url(http://example.com)";
    expect(() => decodeData(JSON.stringify(d))).toThrow();
    d.rules.numbers.appearance.overrides = { 10: "#FFFFFF" };
    expect(() => decodeData(JSON.stringify(d))).toThrow();
  });
});
describe("colors and geometry", () => {
  it.each(Object.keys(PALETTES) as (keyof typeof PALETTES)[])(
    "groups 400 slices efficiently using %s",
    (palette) => {
      const d = initialData();
      const appearance = { ...d.rules.numbers.appearance, palette };
      const layout = createLayout(
        { count: 400, label: String },
        d.rules.numbers,
      );
      const fills = visualColors(400, 400, appearance);
      expect(fills).toHaveLength(400);
      expect(coloredPaths(layout.boundaries, fills).length).toBeLessThanOrEqual(
        12,
      );
      expect(fills.every((c, i) => i === 0 || c !== fills[i - 1])).toBe(true);
    },
  );
  it("custom colors render on corresponding slices and do not change result alignment", () => {
    const d = initialData();
    const rules = d.rules.numbers;
    rules.chance = true;
    rules.distribution = {
      format: "relative",
      base: 0,
      overrides: { 0: 90, 1: 30 },
    };
    rules.appearance.overrides = { 0: "#FFFFFF", 1: "#000000" };
    const source = { count: 2, label: String },
      layout = createLayout(source, rules);
    expect(layout.boundaries).toEqual([0, 270, 360]);
    expect(visualColors(2, 2, rules.appearance)).toEqual([
      "#FFFFFF",
      "#000000",
    ]);
    for (const lo of [0, 1000000, 4294967295]) {
      const plan = planSpin(source, 0, () => [0x100000, lo], rules);
      expect(pointedSlice(plan.angle, layout)).toBe(plan.visualIndex);
    }
    expect(contrastText("#FFFFFF")).toBe("#191827");
    expect(contrastText("#000000")).toBe("#FFFFFF");
  });
  it("normalizes HEX and maps condensed color overrides without allocating the source", () => {
    expect(normalizeHex("abc")).toBe("#AABBCC");
    expect(normalizeHex("#00ff55")).toBe("#00FF55");
    expect(normalizeHex("red")).toBeNull();
    const a = initialData().rules.numbers.appearance;
    a.overrides = { 999999999: "#123456" };
    expect(visualColors(1000000000, 720, a).at(-1)).toBe("#123456");
  });
});
describe("professional tools", () => {
  it("draws an atomic batch respecting elimination and records all output", () => {
    const d = initialData();
    d.ranges.numbers = { min: 1, max: 4, step: 1 };
    d.rules.numbers.noRepeat = true;
    const next = drawBatch(d, 4, zero);
    expect(next.toolbox.batchResults).toEqual(["1", "2", "3", "4"]);
    expect(new Set(next.rules.numbers.drawn).size).toBe(4);
    expect(next.history.every((h) => h.tool === "batch")).toBe(true);
    expect(d.history).toHaveLength(0);
    expect(() => drawBatch(next, 1, zero)).toThrow();
    expect(() => drawBatch(d, 5, zero)).toThrow();
    expect(decodeData(JSON.stringify(next))).toEqual(next);
  });
  it("weighted batches honor zero weights and keep the same distribution", () => {
    const d = initialData();
    d.rules.numbers.chance = true;
    d.rules.numbers.distribution = {
      format: "relative",
      base: 0,
      overrides: { 3: 900 },
    };
    const next = drawBatch(d, 100, zero);
    expect(new Set(next.toolbox.batchResults)).toEqual(new Set(["4"]));
    expect(next.rules.numbers.distribution).toEqual(
      d.rules.numbers.distribution,
    );
  });
  it("does not bypass character-sheet progression in batch mode", () => {
    const d = initialData();
    d.mode = "creator";
    expect(() => drawBatch(d, 2, zero)).toThrow("criador");
  });
  it("balances teams while preserving every input exactly once, including duplicate names", () => {
    const names = ["Ana", "Ana", "Bia", "Caio", "Duda", "Eva", "Fábio"];
    const teams = balancedTeams(names, 3, zero);
    expect(teams.map((t) => t.length)).toEqual([3, 2, 2]);
    expect(teams.flat().sort()).toEqual([...names].sort());
    expect(names[0]).toBe("Ana");
    for (const count of [0, 1, 8, 21, 2.2])
      expect(() => balancedTeams(names, count, zero)).toThrow();
  });
  it.each(QUICK_TEMPLATES)(
    "applies $title and backs up the displaced mode with its colors/weights",
    (t) => {
      const d = initialData();
      d.mode = "creator";
      d.lists.words = ["Lista pessoal", "Outra"];
      d.rules[t.mode].appearance.title = "Original";
      const next = applyTemplate(d, t);
      expect(next.mode).toBe(t.mode);
      expect(next.rules[t.mode].appearance.title).toBe(t.title);
      expect(next.characters).toBe(d.characters);
      const restored = loadPreset(next, next.presets[0]!.id);
      expect(restored.rules[t.mode].appearance.title).toBe("Original");
      if (t.mode === "words")
        expect(restored.lists.words).toEqual(d.lists.words);
      else expect(restored.ranges.numbers).toEqual(d.ranges.numbers);
    },
  );
});
