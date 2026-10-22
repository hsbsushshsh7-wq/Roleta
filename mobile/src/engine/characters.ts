import type { Category, Character } from "../models/types";
export function nextCategory(character: Character): Category | undefined {
  const explicit = character.categories.find(
    (c) => c.id === character.target && !Object.hasOwn(character.results, c.id),
  );
  return (
    explicit ??
    character.categories.find((c) => !Object.hasOwn(character.results, c.id))
  );
}
export function completedCount(character: Character): number {
  return character.categories.filter((c) =>
    Object.hasOwn(character.results, c.id),
  ).length;
}
export function fillCharacter(
  character: Character,
  categoryId: string,
  value: string,
): Character {
  if (!character.categories.some((c) => c.id === categoryId))
    throw new Error("Categoria inexistente.");
  if (Object.hasOwn(character.results, categoryId))
    throw new Error("A categoria já foi preenchida.");
  const results = { ...character.results, [categoryId]: value };
  return {
    ...character,
    results,
    target:
      character.categories.find((c) => !Object.hasOwn(results, c.id))?.id ??
      null,
  };
}
export function updateCategories(
  character: Character,
  categories: Category[],
): Character {
  // Results remain attached to stable IDs when categories are renamed or reordered.
  const results = Object.fromEntries(
    categories
      .filter((c) => Object.hasOwn(character.results, c.id))
      .map((c) => [c.id, character.results[c.id]!]),
  );
  return {
    ...character,
    categories: categories.map((c) => ({ ...c })),
    results,
    target: categories.find((c) => !Object.hasOwn(results, c.id))?.id ?? null,
  };
}
