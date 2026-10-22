import { describe, expect, it } from "vitest";
import { initialData, makeCharacter, categories } from "../src/data/defaults";
import { MODES } from "../src/models/types";
import {
  defaultRules,
  changeChance,
  distributionTotal,
  availableCount,
  reconcileSources,
  resetPool,
  optionWeight,
} from "../src/engine/rules";
import {
  createLayout,
  pointedSlice,
  weightedIndex,
  chancePercent,
} from "../src/engine/weighted";
import { planSpin } from "../src/engine/draw";
import { wheelPaths } from "../src/engine/wheelGeometry";
import {
  savePreset,
  loadPreset,
  removePreset,
  presetSnapshot,
  describePreset,
} from "../src/engine/presets";
import { decodeData } from "../src/storage/schema";
const words = (unit: number): [number, number] => {
  const n = Math.floor(unit * 2 ** 53);
  return [Math.floor(n / 4294967296), n >>> 0];
};
describe("custom chances", () => {
  it("keeps 90 and 30 independent while calculating actual chances 75/25", () => {
    let distribution = changeChance(defaultRules().distribution, 2, 0, 90);
    distribution = changeChance(distribution, 2, 1, 30);
    expect(optionWeight(distribution, 0)).toBe(90);
    expect(optionWeight(distribution, 1)).toBe(30);
    const rules = { ...defaultRules(), chance: true, distribution };
    const total = distributionTotal(distribution, 2);
    expect(total).toBe(120);
    expect(chancePercent(0, rules, total)).toBe(75);
    expect(chancePercent(1, rules, total)).toBe(25);
    const edited = changeChance(distribution, 2, 1, 900);
    expect(optionWeight(edited, 0)).toBe(90);
    expect(distribution.overrides["1"]).toBe(30);
  });
  it("zero pauses individual options and never changes the others", () => {
    let distribution = changeChance(defaultRules().distribution, 3, 0, 0);
    distribution = changeChance(distribution, 3, 2, 0);
    const rules = { ...defaultRules(), chance: true, distribution };
    for (const unit of [0, 0.1, 0.999999])
      expect(weightedIndex(3, rules, unit)).toBe(1);
    expect(optionWeight(distribution, 1)).toBe(100);
    expect(availableCount(rules, 3)).toBe(1);
    expect(() => changeChance(distribution, 3, 1, 0)).toThrow("pelo menos");
  });
  it("accepts weights above 100 and any positive single-option weight", () => {
    for (const value of [-1, 1e9 + 1, NaN, Infinity])
      expect(() =>
        changeChance(defaultRules().distribution, 4, 0, value),
      ).toThrow();
    const distribution = changeChance(defaultRules().distribution, 1, 0, 30);
    expect(optionWeight(distribution, 0)).toBe(30);
    expect(
      chancePercent(
        0,
        { ...defaultRules(), distribution },
        distributionTotal(distribution, 1),
      ),
    ).toBe(100);
    expect(optionWeight(changeChance(distribution, 1, 0, 10000), 0)).toBe(
      10000,
    );
  });
  it("matches a 20/30/50 distribution on a deterministic uniform sampling grid", () => {
    const rules = {
      ...defaultRules(),
      chance: true,
      distribution: { base: 0, overrides: { "0": 20, "1": 30, "2": 50 } },
    };
    const hits = [0, 0, 0];
    for (let i = 0; i < 10000; i++) {
      const index = weightedIndex(3, rules, (i + 0.5) / 10000);
      hits[index] = hits[index]! + 1;
    }
    expect(hits).toEqual([2000, 3000, 5000]);
  });
  it.each([4, 400, 721, 10000, 2000000001, Number.MAX_SAFE_INTEGER])(
    "stays sparse and aligns weighted results for %s options",
    (count) => {
      const rules = {
        ...defaultRules(),
        chance: true,
        distribution: changeChance(
          defaultRules().distribution,
          count,
          Math.floor(count / 2),
          50,
        ),
      };
      const source = { count, label: String };
      const layout = createLayout(source, rules);
      expect(layout.boundaries).toHaveLength(Math.min(count, 720) + 1);
      expect(Object.keys(rules.distribution.overrides)).toHaveLength(1);
      for (let i = 0; i < 500; i++) {
        const plan = planSpin(
          source,
          317.7,
          () => words((i + 0.5) / 500),
          rules,
        );
        expect(pointedSlice(plan.angle, layout)).toBe(plan.visualIndex);
        expect(plan.value).toBe(String(plan.index));
      }
      expect(layout.boundaries[0]).toBe(0);
      expect(layout.boundaries.at(-1)).toBe(360);
      expect(
        layout.boundaries.every(
          (n, i) => i === 0 || n >= layout.boundaries[i - 1]!,
        ),
      ).toBe(true);
    },
  );
  it("draws a full-circle slice even when all other options have 0%", () => {
    const rules = {
      ...defaultRules(),
      chance: true,
      distribution: { base: 0, overrides: { "2": 1 } },
    };
    const layout = createLayout({ count: 4, label: String }, rules);
    expect(layout.boundaries).toEqual([0, 0, 0, 360, 360]);
    expect(wheelPaths(4, layout.boundaries).filter(Boolean)).toHaveLength(1);
    const plan = planSpin(
      { count: 4, label: String },
      0,
      () => words(0.2),
      rules,
    );
    expect(plan.index).toBe(2);
    expect(pointedSlice(plan.angle, layout)).toBe(2);
  });
  it("equal chances use the exact uniform integer sampler, including a huge range", () => {
    const source = { count: Number.MAX_SAFE_INTEGER, label: String };
    const rules = { ...defaultRules(), chance: true };
    const plan = planSpin(source, 0, () => [0, 4294967295], rules);
    expect(plan.index).toBe(4294967295);
  });
  it("rejects invalid random units and an empty weighted wheel", () => {
    for (const unit of [-0.1, 1, Infinity])
      expect(() => weightedIndex(3, defaultRules(), unit)).toThrow();
    expect(() =>
      planSpin({ count: 0, label: String }, 0, () => words(0), {
        ...defaultRules(),
        chance: true,
      }),
    ).toThrow("Adicione");
  });
});
describe("all previously drawn results are blocked", () => {
  it("exhausts every entry once, even beyond the 200-event history capacity", () => {
    const rules = { ...defaultRules(), noRepeat: true };
    const source = { count: 400, label: String };
    for (let i = 0; i < 400; i++) {
      const plan = planSpin(source, 0, () => [0, 0], rules);
      expect(plan.index).toBe(i);
      rules.drawn.push(plan.index);
    }
    expect(availableCount(rules, 400)).toBe(0);
    expect(() => planSpin(source, 0, () => [0, 0], rules)).toThrow("Todas");
    expect(availableCount(resetPool(rules), 400)).toBe(400);
  });
  it("conditions weighted probabilities on eligible results and never picks zero/blocked options", () => {
    const rules = {
      ...defaultRules(),
      chance: true,
      noRepeat: true,
      drawn: [0],
      distribution: { base: 0, overrides: { "0": 0.6, "1": 0.3, "2": 0.1 } },
    };
    const hits = [0, 0, 0, 0];
    for (let i = 0; i < 1000; i++) {
      const index = weightedIndex(4, rules, (i + 0.5) / 1000);
      hits[index] = hits[index]! + 1;
    }
    expect(hits).toEqual([0, 750, 250, 0]);
    expect(availableCount(rules, 4)).toBe(2);
    expect(() => weightedIndex(4, { ...rules, drawn: [0, 1, 2] }, 0.1)).toThrow(
      "0%",
    );
  });
  it("resets only the changed source while preserving other modes, presets and no-repeat preferences", () => {
    const before = initialData();
    before.rules.numbers.noRepeat = true;
    before.rules.numbers.drawn = [2];
    before.rules.words.drawn = [];
    const next = reconcileSources(before, {
      ...before,
      ranges: { ...before.ranges, numbers: { min: 1, max: 20, step: 1 } },
    });
    expect(next.rules.numbers.drawn).toEqual([]);
    expect(next.rules.numbers.noRepeat).toBe(true);
    expect(next.rules.words).toBe(before.rules.words);
    expect(
      reconcileSources(before, {
        ...before,
        ranges: { ...before.ranges, numbers: { ...before.ranges.numbers } },
      }).rules,
    ).toBe(before.rules);
  });
});
describe("named presets", () => {
  it.each(MODES)(
    "saves and loads %s with chances and repeat rules without changing other sources",
    (mode) => {
      let data = initialData();
      data.mode = mode;
      data.lists.words = ["Sol", "Lua"];
      data.lists.powers = ["A", "B"];
      data.rules[mode].chance = true;
      data.rules[mode].noRepeat = true;
      const saved = savePreset(data, "Minha roleta");
      const id = saved.presets[0]!.id;
      const changed = {
        ...saved,
        mode: "numbers" as const,
        lists: { ...saved.lists, words: ["Outra"] },
      };
      const loaded = loadPreset(changed, id);
      expect(loaded.mode).toBe(mode);
      expect(loaded.rules[mode].chance).toBe(true);
      expect(loaded.rules[mode].noRepeat).toBe(true);
      expect(loaded.rules[mode].sessionId).not.toBe(data.rules[mode].sessionId);
      expect(loaded.lists.powers).toEqual(data.lists.powers);
      expect(decodeData(JSON.stringify(loaded))).toEqual(loaded);
    },
  );
  it("keeps creator sheets and category results independent of later edits", () => {
    let data = initialData();
    data.mode = "creator";
    data.characters.push(makeCharacter(categories));
    data.characters[0]!.results["category-1"] = "Goku";
    data = savePreset(data, "Elenco");
    data.characters[0]!.results["category-1"] = "Vegeta";
    const loaded = loadPreset(data, data.presets[0]!.id);
    expect(loaded.characters[0]!.results["category-1"]).toBe("Goku");
    expect(loaded.characters).toHaveLength(2);
    expect(describePreset(data.presets[0]!)).toContain("2 fichas");
  });
  it("requires explicit duplicate-name replacement and deletes only the selected preset", () => {
    const one = savePreset(initialData(), "Roleta");
    expect(() => savePreset(one, " roleta ")).toThrow();
    const two = savePreset(one, "Segunda");
    const replaced = savePreset(two, "Roleta", one.presets[0]!.id);
    expect(replaced.presets).toHaveLength(2);
    const removed = removePreset(replaced, one.presets[0]!.id);
    expect(removed.presets[0]!.name).toBe("Segunda");
    expect(removed.lists).toBe(replaced.lists);
    expect(() => savePreset(one, " ")).toThrow();
    expect(() => loadPreset(one, "missing")).toThrow();
  });
  it("does not manufacture the presets or names visible in the screenshots", () => {
    expect(initialData().presets).toEqual([]);
    expect(presetSnapshot(initialData()).mode).toBe("numbers");
  });
});
describe("backwards compatible state migration", () => {
  it("loads old JSON without dropping sheets/lists and migrates non-repeat settings", () => {
    const data = initialData();
    data.preferences.repeat = false;
    data.characters[0]!.results["category-1"] = "Goku";
    data.history = [
      {
        id: "d",
        mode: "numbers",
        count: 10,
        index: 3,
        value: "4",
        at: new Date().toISOString(),
      },
    ];
    const old = JSON.parse(JSON.stringify(data));
    delete old.rules;
    delete old.presets;
    const migrated = decodeData(JSON.stringify(old));
    expect(migrated.characters).toEqual(data.characters);
    expect(migrated.rules.numbers.noRepeat).toBe(true);
    expect(migrated.rules.numbers.drawn).toEqual([3]);
    expect(migrated.presets).toEqual([]);
  });
  it("rejects invalid probabilities, unknown indices and broken preset snapshots", () => {
    const data = initialData();
    data.rules.numbers.distribution.overrides = { "99": 1 };
    expect(() => decodeData(JSON.stringify(data))).toThrow();
    data.rules.numbers.distribution = { base: 0, overrides: {} };
    expect(() => decodeData(JSON.stringify(data))).toThrow();
    data.rules.numbers = defaultRules();
    data.rules.numbers.drawn = [10];
    expect(() => decodeData(JSON.stringify(data))).toThrow();
    const saved = savePreset(initialData(), "Correto");
    saved.presets[0]!.config.rules.distribution.base = -1;
    expect(() => decodeData(JSON.stringify(saved))).toThrow();
  });
});
