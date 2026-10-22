import type { AppData } from "../models/types";
import { newId } from "../data/ids";
import { uniformIndex, type RandomWords } from "./draw";
import { MAX_ENTRIES, parseList } from "./options";
import { savePreset } from "./presets";

export type ListMode = "words" | "powers" | "creator";
export type ListOperation = "unique" | "sort" | "reverse" | "shuffle";
export const LIST_LABELS: Record<ListMode, string> = {
  words: "Palavras",
  powers: "Poderes",
  creator: "Elenco",
};

export function cleanList(items: readonly string[]): string[] {
  if (items.length > MAX_ENTRIES) throw new Error("Use até 50.000 opções.");
  const next = items.map((item) => item.trim()).filter(Boolean);
  if (next.some((item) => item.length > 500))
    throw new Error("Cada opção pode ter até 500 caracteres.");
  return next;
}

export function parseStudioList(
  text: string,
  separators: "lines" | "mixed" = "lines",
): string[] {
  return separators === "mixed"
    ? parseList(text)
    : cleanList(text.split(/[\r\n]+/u));
}

export function listStats(items: readonly string[]) {
  const clean = cleanList(items);
  const unique = new Set(clean).size;
  return { count: clean.length, unique, duplicates: clean.length - unique };
}

export function transformList(
  items: readonly string[],
  operation: ListOperation,
  random?: RandomWords,
): string[] {
  const next = cleanList(items);
  if (operation === "unique") return [...new Set(next)];
  if (operation === "sort")
    return next.sort(
      new Intl.Collator("pt-BR", { numeric: true, sensitivity: "variant" })
        .compare,
    );
  if (operation === "reverse") return next.reverse();
  if (operation !== "shuffle" || !random)
    throw new Error("Escolha uma transformação válida.");
  for (let i = next.length - 1; i > 0; i--) {
    const j = uniformIndex(i + 1, random);
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

export function applyList(
  data: AppData,
  mode: ListMode,
  items: readonly string[],
): AppData {
  if (!["words", "powers", "creator"].includes(mode))
    throw new Error("Selecione uma modalidade de lista.");
  const next = cleanList(items);
  if (!next.length)
    throw new Error("Adicione pelo menos uma opção antes de aplicar.");
  const previous = data.lists[mode];
  if (
    next.length === previous.length &&
    next.every((value, i) => value === previous[i])
  )
    return data.mode === mode ? data : { ...data, mode };
  const target = { ...data, mode };
  const backedUp = previous.length
    ? savePreset(
        target,
        `Estúdio · ${LIST_LABELS[mode]} · ${newId("copia").slice(-14)}`,
      )
    : target;
  return { ...backedUp, lists: { ...backedUp.lists, [mode]: next } };
}
