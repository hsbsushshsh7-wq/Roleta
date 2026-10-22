import type { AppData, Preset, PresetConfiguration } from "../models/types";
import { newId } from "../data/ids";
export const MAX_PRESETS = 100;
export function presetSnapshot(data: AppData): PresetConfiguration {
  const mode = data.mode;
  const rules = data.rules[mode];
  let config: PresetConfiguration;
  if (mode === "numbers" || mode === "percentage")
    config = { mode, range: data.ranges[mode], rules };
  else if (mode === "creator")
    config = {
      mode,
      options: data.lists.creator,
      rules,
      categories: data.categories,
      characters: data.characters,
      activeCharacter: data.activeCharacter,
    };
  else config = { mode, options: data.lists[mode], rules };
  return JSON.parse(JSON.stringify(config)) as PresetConfiguration;
}
export function savePreset(
  data: AppData,
  rawName: string,
  overwriteId?: string,
): AppData {
  const name = rawName.trim();
  if (!name || name.length > 80)
    throw new Error("Informe um nome de 1 a 80 caracteres.");
  const same = data.presets.find(
    (p) =>
      p.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"),
  );
  if (same && same.id !== overwriteId)
    throw new Error("Já existe uma predefinição com esse nome.");
  if (overwriteId && !data.presets.some((p) => p.id === overwriteId))
    throw new Error("Predefinição não encontrada.");
  if (!overwriteId && data.presets.length >= MAX_PRESETS)
    throw new Error(
      `Você pode manter até ${MAX_PRESETS} predefinições. Exporte um backup antes de excluir alguma.`,
    );
  const preset: Preset = {
    id: overwriteId ?? newId("preset"),
    name,
    createdAt: new Date().toISOString(),
    config: presetSnapshot(data),
  };
  return {
    ...data,
    presets: overwriteId
      ? data.presets.map((p) => (p.id === overwriteId ? preset : p))
      : [preset, ...data.presets],
  };
}
export function loadPreset(data: AppData, id: string): AppData {
  const saved = data.presets.find((p) => p.id === id);
  if (!saved) throw new Error("Predefinição não encontrada.");
  const config = JSON.parse(
    JSON.stringify(saved.config),
  ) as PresetConfiguration;
  const rules = {
    ...data.rules,
    [config.mode]: { ...config.rules, sessionId: newId("session") },
  };
  const next = { ...data, mode: config.mode, rules };
  if (config.mode === "numbers" || config.mode === "percentage")
    return { ...next, ranges: { ...data.ranges, [config.mode]: config.range } };
  if (config.mode === "creator")
    return {
      ...next,
      lists: { ...data.lists, creator: config.options },
      categories: config.categories,
      characters: config.characters,
      activeCharacter: config.activeCharacter,
    };
  return { ...next, lists: { ...data.lists, [config.mode]: config.options } };
}
export function removePreset(data: AppData, id: string): AppData {
  return { ...data, presets: data.presets.filter((p) => p.id !== id) };
}
export function describePreset(preset: Preset): string {
  const c = preset.config;
  const label =
    c.mode === "numbers" || c.mode === "percentage"
      ? `${c.range.min} – ${c.range.max}${c.mode === "percentage" ? "%" : ""}`
      : c.mode === "creator"
        ? `${c.options.length} no elenco · ${c.characters.length} fichas × ${c.categories.length} categorias`
        : `${c.options.length} ${c.mode === "powers" ? "poderes" : "palavras"}`;
  return [
    label,
    c.rules.chance && "chances",
    c.rules.noRepeat && "sem repetição",
  ]
    .filter(Boolean)
    .join(" · ");
}
