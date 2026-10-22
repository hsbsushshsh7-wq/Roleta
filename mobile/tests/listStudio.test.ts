import { describe, expect, it } from "vitest";
import { initialData } from "../src/data/defaults";
import {
  applyList,
  cleanList,
  listStats,
  parseStudioList,
  transformList,
} from "../src/engine/listStudio";
import { loadPreset, MAX_PRESETS, savePreset } from "../src/engine/presets";
import { reconcileSources } from "../src/engine/rules";
import { decodeData } from "../src/storage/schema";
const zero = (): [number, number] => [0, 0];

describe("list studio", () => {
  it("parses lines without splitting punctuation in names; mixed separators are explicit", () => {
    expect(parseStudioList("  Nome, sobrenome \r\n\nNome; completo\n")).toEqual(
      ["Nome, sobrenome", "Nome; completo"],
    );
    expect(parseStudioList(" Ana, Bia; Caio\nDuda ", "mixed")).toEqual([
      "Ana",
      "Bia",
      "Caio",
      "Duda",
    ]);
    expect(cleanList([" A ", "", " ", "B"])).toEqual(["A", "B"]);
  });
  it("counts and removes only exact duplicates after trimming", () => {
    const names = ["Ana", " Ana ", "ana", "Ána", "Ana"];
    expect(listStats(names)).toEqual({ count: 5, unique: 3, duplicates: 2 });
    expect(transformList(names, "unique")).toEqual(["Ana", "ana", "Ána"]);
    expect(names).toEqual(["Ana", " Ana ", "ana", "Ána", "Ana"]);
  });
  it("orders Portuguese labels naturally and transforms without mutation", () => {
    const names = ["Zeca", "Ágata", "Opção 10", "Opção 2", "Ana"];
    expect(transformList(names, "sort")).toEqual([
      "Ágata",
      "Ana",
      "Opção 2",
      "Opção 10",
      "Zeca",
    ]);
    expect(transformList(names, "reverse")).toEqual([...names].reverse());
    expect(transformList(names, "shuffle", zero).sort()).toEqual(
      [...names].sort(),
    );
    expect(names[0]).toBe("Zeca");
  });
  it("handles fifty thousand entries and rejects oversized input", () => {
    const list = Array.from({ length: 50000 }, (_, i) => `Opção ${i}`);
    expect(transformList(list, "shuffle", zero)).toHaveLength(50000);
    expect(() => cleanList([...list, "Mais"])).toThrow();
    expect(() => cleanList(["A".repeat(501)])).toThrow();
    expect(() => transformList(["A"], "shuffle")).toThrow();
  });
  it.each(["words", "powers", "creator"] as const)(
    "backs up target %s, preserves other modes and character results",
    (mode) => {
      const d = initialData();
      d.lists[mode] = ["Anterior", "Antes"];
      d.rules[mode].appearance.overrides = { 0: "#123456" };
      d.rules[mode].distribution.overrides = { 0: 90 };
      d.rules[mode].drawn = [0];
      const next = reconcileSources(
        d,
        applyList(d, mode, ["Novo", "Outro", "Último"]),
      );
      expect(next.lists[mode]).toEqual(["Novo", "Outro", "Último"]);
      expect(next.mode).toBe(mode);
      expect(next.characters).toBe(d.characters);
      expect(next.defaults).toBe(d.defaults);
      expect(next.rules[mode].appearance.overrides).toEqual({});
      expect(next.rules[mode].drawn).toEqual([]);
      for (const other of ["words", "powers", "creator"] as const)
        if (other !== mode) expect(next.lists[other]).toBe(d.lists[other]);
      const restored = loadPreset(next, next.presets[0]!.id);
      expect(restored.lists[mode]).toEqual(d.lists[mode]);
      expect(restored.rules[mode].appearance.overrides).toEqual({
        0: "#123456",
      });
      expect(decodeData(JSON.stringify(next)).lists[mode]).toEqual(
        next.lists[mode],
      );
    },
  );
  it("fails atomically if preset storage is full, but does not need a slot for an empty target or a no-op", () => {
    let d = initialData();
    d.lists.words = ["Original"];
    for (let i = 0; i < MAX_PRESETS; i++) d = savePreset(d, `Preset ${i}`);
    expect(() => applyList(d, "words", ["Substituto"])).toThrow(
      "100 predefinições",
    );
    expect(d.lists.words).toEqual(["Original"]);
    expect(applyList(d, "words", ["Original"]).presets).toBe(d.presets);
    d.lists.powers = [];
    expect(applyList(d, "powers", ["Novo"]).presets).toHaveLength(MAX_PRESETS);
    expect(() => applyList(d, "words", [" "])).toThrow();
  });
});
