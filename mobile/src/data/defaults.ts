import type { AppData, Category, Character } from "../models/types";
import { newId } from "./ids";
import { initialRules } from "../engine/rules";
import { initialLaboratory } from "../models/laboratory";
// Only names readable in 39871.jpg. This is NOT the unavailable 400-name source list.
export const VISIBLE_ROSTER = [
  "Goku",
  "Vegeta",
  "Gohan",
  "Piccolo",
  "Trunks",
  "Goten",
  "Bulma",
  "Kuririn",
  "Freeza",
];
export const CATEGORY_NAMES = [
  "Força",
  "Velocidade",
  "Resistência",
  "Inteligência",
  "QI de batalha",
  "Corpo",
  "Poder 1",
  "Poder 2",
];
export const categories: Category[] = CATEGORY_NAMES.map((name, i) => ({
  id: `category-${i + 1}`,
  name,
}));
export { newId } from "./ids";
export function makeCharacter(
  items: Category[],
  id = newId("character"),
): Character {
  return {
    id,
    categories: items.map((c) => ({ ...c })),
    results: {},
    target: items[0]?.id ?? null,
  };
}
export function initialData(): AppData {
  const character = makeCharacter(categories, "character-1");
  return {
    version: 1,
    lab: initialLaboratory(),
    mode: "numbers",
    ranges: {
      numbers: { min: 1, max: 10, step: 1 },
      percentage: { min: 0, max: 100, step: 1 },
    },
    lists: { words: [], powers: [], creator: [...VISIBLE_ROSTER] },
    defaults: { powers: [], creator: [...VISIBLE_ROSTER] },
    categories: categories.map((c) => ({ ...c })),
    characters: [character],
    activeCharacter: character.id,
    preferences: {
      sound: false,
      resultPopup: true,
      focusMode: false,
      haptics: true,
      duration: 4600,
      repeat: true,
      appearance: "soft",
    },
    history: [],
    rules: initialRules(),
    presets: [],
    toolbox: { batchResults: [], teams: [], generatedAt: null },
  };
}
export const MODE_INFO = {
  numbers: {
    title: "Números",
    description: "Escolha um intervalo",
    icon: "123",
  },
  percentage: {
    title: "Porcentagem",
    description: "Defina um intervalo de 0% a 100%",
    icon: "%",
  },
  words: { title: "Palavras", description: "Monte uma lista", icon: "Aa" },
  powers: {
    title: "Poderes de anime",
    description: "Use ou edite a lista pronta",
    icon: "ϟ",
  },
  creator: {
    title: "Criador de personagem",
    description: "Monte fichas no estilo das trends",
    icon: "OC",
  },
} as const;
