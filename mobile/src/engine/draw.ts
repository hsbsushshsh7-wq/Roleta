import { defaultRules, validBlocked } from "./rules";
import { createLayout, weightedIndex } from "./weighted";
import type { ModeRules, OptionSource, SpinPlan } from "../models/types";
export const MAX_VISUAL_SLICES = 720;
const RANDOM_SPACE = 2 ** 53;
export type RandomWords = () => [number, number];
// Rejection sampling avoids the bias caused by rounding or taking an unchecked modulo.
export function uniformIndex(count: number, random: RandomWords): number {
  if (!Number.isSafeInteger(count) || count < 1)
    throw new Error("Adicione pelo menos uma opção válida.");
  const limit = Math.floor(RANDOM_SPACE / count) * count;
  for (let tries = 0; tries < 1000; tries++) {
    const [hi, lo] = random();
    const sample = (hi & 0x1fffff) * 4294967296 + (lo >>> 0);
    if (sample < limit) return sample % count;
  }
  throw new Error(
    "Não foi possível obter aleatoriedade segura. Tente novamente.",
  );
}
export function normalize(angle: number): number {
  return ((angle % 360) + 360) % 360;
}
export function displayedIndex(
  index: number,
  count: number,
  displayCount: number,
): number {
  if (count === displayCount) return index;
  return Number((BigInt(index) * BigInt(displayCount)) / BigInt(count));
}
export function pointedIndex(angle: number, displayCount: number): number {
  return Math.floor(normalize(-angle) / (360 / displayCount)) % displayCount;
}
export function planSpin(
  source: OptionSource,
  currentAngle: number,
  random: RandomWords,
  exclude?: number | ModeRules,
): SpinPlan {
  const count = source.count;
  if (!Number.isSafeInteger(count) || count < 1)
    throw new Error("Adicione pelo menos uma opção válida.");
  const rules =
    typeof exclude === "number"
      ? { ...defaultRules(), noRepeat: count > 1, drawn: [exclude] }
      : (exclude ?? defaultRules());
  const blocked = validBlocked(rules, count);
  const eligible = count - blocked.length;
  if (count && eligible === 0)
    throw new Error(
      "Todas as opções já foram sorteadas. Toque em RESET para liberar os resultados novamente.",
    );
  let index: number;
  const equalWeights =
    rules.distribution.base > 0 &&
    Object.values(rules.distribution.overrides).every(
      (w) => w === rules.distribution.base,
    );
  if (rules.chance && !equalWeights) {
    const [hi, lo] = random();
    const sample = (hi & 0x1fffff) * 4294967296 + (lo >>> 0);
    index = weightedIndex(count, rules, sample / RANDOM_SPACE);
  } else {
    index = uniformIndex(eligible, random);
    for (const used of blocked) {
      if (used <= index) index++;
      else break;
    }
  }
  const layout = createLayout(source, rules);
  const displayCount = layout.count;
  const visualIndex = displayedIndex(index, count, displayCount);
  const center =
    (layout.boundaries[visualIndex]! + layout.boundaries[visualIndex + 1]!) / 2;
  const target = normalize(-center);
  const angle =
    currentAngle + 360 * 7 + normalize(target - normalize(currentAngle));
  return {
    index,
    value: source.label(index),
    count,
    displayCount,
    visualIndex,
    angle,
  };
}
