import type { AppData, Mode, ModeRules, Distribution } from "../models/types";
import { MODES } from "../models/types";
import { newId } from "../data/ids";
export function defaultRules(): ModeRules {
  return {
    appearance: {
      palette: "classic",
      overrides: {},
      showLabels: true,
      title: "",
    },
    chance: false,
    noRepeat: false,
    distribution: { format: "relative", base: 100, overrides: {} },
    drawn: [],
    sessionId: "",
  };
}
export function initialRules(): Record<Mode, ModeRules> {
  return Object.fromEntries(
    MODES.map((mode) => [mode, defaultRules()]),
  ) as Record<Mode, ModeRules>;
}
export function distributionEntries(
  distribution: Distribution,
  count: number,
): [number, number][] {
  return Object.entries(distribution.overrides)
    .map(([i, w]) => [Number(i), w] as [number, number])
    .filter(([i]) => Number.isSafeInteger(i) && i >= 0 && i < count)
    .sort((a, b) => a[0] - b[0]);
}
export function distributionTotal(
  distribution: Distribution,
  count: number,
): number {
  const entries = distributionEntries(distribution, count);
  return (
    distribution.base * (count - entries.length) +
    entries.reduce((sum, [, weight]) => sum + weight, 0)
  );
}
export function optionWeight(
  distribution: Distribution,
  index: number,
): number {
  return distribution.overrides[String(index)] ?? distribution.base;
}
export function changeChance(
  distribution: Distribution,
  count: number,
  index: number,
  weight: number,
): Distribution {
  if (
    !Number.isSafeInteger(index) ||
    index < 0 ||
    index >= count ||
    !Number.isFinite(weight) ||
    weight < 0 ||
    weight > 1e9
  )
    throw new Error("Informe um peso entre 0 e 1.000.000.000.");
  const next: Distribution = {
    ...distribution,
    format: "relative",
    overrides: { ...distribution.overrides, [index]: weight },
  };
  if (!(distributionTotal(next, count) > 0))
    throw new Error("Mantenha pelo menos uma opção com peso maior que zero.");
  return next;
}
// Convert v1.1 percentage-oriented data once, preserving its probability ratios.
export function migrateDistribution(
  distribution: Distribution,
  count: number,
): Distribution {
  if (distribution.format === "relative") return distribution;
  const total = distributionTotal(distribution, count);
  const scale = total > 0 ? 100 / total : 1;
  return {
    format: "relative",
    base: distribution.base * scale,
    overrides: Object.fromEntries(
      Object.entries(distribution.overrides).map(([i, w]) => [i, w * scale]),
    ),
  };
}
export function resetPool(rules: ModeRules): ModeRules {
  return { ...rules, drawn: [], sessionId: newId("session") };
}
export function validBlocked(rules: ModeRules, count: number): number[] {
  return rules.noRepeat
    ? [
        ...new Set(
          rules.drawn.filter(
            (i) => Number.isSafeInteger(i) && i >= 0 && i < count,
          ),
        ),
      ].sort((a, b) => a - b)
    : [];
}
export function availableCount(rules: ModeRules, count: number): number {
  const blocked = validBlocked(rules, count);
  if (!rules.chance) return count - blocked.length;
  const entries = distributionEntries(rules.distribution, count);
  const positive =
    (rules.distribution.base > 0 ? count - entries.length : 0) +
    entries.filter(([, w]) => w > 0).length;
  return (
    positive -
    blocked.filter((i) => optionWeight(rules.distribution, i) > 0).length
  );
}
export function reconcileSources(before: AppData, after: AppData): AppData {
  let rules = after.rules;
  for (const mode of MODES) {
    const changed =
      mode === "numbers" || mode === "percentage"
        ? ["min", "max", "step"].some(
            (key) =>
              before.ranges[mode][key as "min" | "max" | "step"] !==
              after.ranges[mode][key as "min" | "max" | "step"],
          )
        : before.lists[mode] !== after.lists[mode] &&
          (before.lists[mode].length !== after.lists[mode].length ||
            before.lists[mode].some((s, i) => s !== after.lists[mode][i]));
    if (changed && after.rules[mode] === before.rules[mode])
      rules = {
        ...rules,
        [mode]: {
          ...resetPool(after.rules[mode]),
          appearance: { ...after.rules[mode].appearance, overrides: {} },
          distribution: { format: "relative", base: 100, overrides: {} },
        },
      };
  }
  return rules === after.rules ? after : { ...after, rules };
}
