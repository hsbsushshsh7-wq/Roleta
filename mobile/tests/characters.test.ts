import { describe, expect, it } from "vitest";
import { initialData, makeCharacter, categories } from "../src/data/defaults";
import {
  completedCount,
  fillCharacter,
  nextCategory,
  updateCategories,
} from "../src/engine/characters";
describe("character creation", () => {
  it("advances and completes a full independent character sheet", () => {
    const data = initialData();
    let c = data.characters[0]!;
    const second = makeCharacter(categories);
    for (let i = 0; i < c.categories.length; i++) {
      const target = nextCategory(c)!;
      c = fillCharacter(c, target.id, `Name ${i}`);
      expect(completedCount(c)).toBe(i + 1);
    }
    expect(nextCategory(c)).toBeUndefined();
    expect(completedCount(second)).toBe(0);
    expect(completedCount(makeCharacter(c.categories, c.id))).toBe(0);
  });
  it("respects an explicitly selected unfilled category", () => {
    const c = makeCharacter(categories);
    c.target = categories[3]!.id;
    expect(nextCategory(c)?.name).toBe("Inteligência");
    const filled = fillCharacter(c, categories[3]!.id, "Gohan");
    expect(nextCategory(filled)?.name).toBe("Força");
  });
  it("preserves results by ID when renaming, reordering and adding categories", () => {
    const original = fillCharacter(
      makeCharacter(categories),
      categories[0]!.id,
      "Goku",
    );
    const modified = [
      { ...categories[0]!, name: "Força física" },
      ...categories.slice(1),
    ].reverse();
    const updated = updateCategories(original, [
      ...modified,
      { id: "custom", name: "Categoria do usuário" },
    ]);
    expect(updated.results[categories[0]!.id]).toBe("Goku");
    expect(completedCount(updated)).toBe(1);
    expect(original.categories[0]!.name).toBe("Força");
  });
  it("rejects nonexistent categories and accidental overwrites", () => {
    const c = fillCharacter(
      makeCharacter(categories),
      categories[0]!.id,
      "Goku",
    );
    expect(() => fillCharacter(c, categories[0]!.id, "Vegeta")).toThrow();
    expect(() => fillCharacter(c, "missing", "Vegeta")).toThrow();
  });
});
