import type { ModeRules, OptionSource, WheelLayout } from "../models/types";
import { distributionEntries, optionWeight, validBlocked } from "./rules";
// Events split an arbitrarily large source into O(custom weights + blocked entries) intervals.
export function weightedSegments(
  count: number,
  rules: ModeRules,
): { start: number; length: number; weight: number }[] {
  const base = rules.chance ? rules.distribution.base : 1;
  const overrides = new Map(
    rules.chance ? distributionEntries(rules.distribution, count) : [],
  );
  const blocked = new Set(validBlocked(rules, count));
  const events = [...new Set([...overrides.keys(), ...blocked])].sort(
    (a, b) => a - b,
  );
  const segments: { start: number; length: number; weight: number }[] = [];
  let cursor = 0;
  for (const i of events) {
    if (i > cursor && base > 0)
      segments.push({ start: cursor, length: i - cursor, weight: base });
    const weight = blocked.has(i) ? 0 : (overrides.get(i) ?? base);
    if (weight > 0) segments.push({ start: i, length: 1, weight });
    cursor = i + 1;
  }
  if (cursor < count && base > 0)
    segments.push({ start: cursor, length: count - cursor, weight: base });
  return segments;
}
export function weightedIndex(
  count: number,
  rules: ModeRules,
  unit: number,
): number {
  if (!Number.isFinite(unit) || unit < 0 || unit >= 1)
    throw new Error("A amostra aleatória deve estar entre 0 e 1.");
  const segments = weightedSegments(count, rules);
  const total = segments.reduce((sum, s) => sum + s.length * s.weight, 0);
  if (!(total > 0) || !Number.isFinite(total))
    throw new Error(
      "As opções restantes têm chance 0%. Use RESET ou iguale as chances para continuar.",
    );
  let target = unit * total;
  for (const segment of segments) {
    const mass = segment.length * segment.weight;
    if (target < mass)
      return (
        segment.start +
        Math.min(segment.length - 1, Math.floor(target / segment.weight))
      );
    target -= mass;
  }
  const last = segments[segments.length - 1]!;
  return last.start + last.length - 1;
}
export function createLayout(
  source: OptionSource,
  rules: ModeRules,
  maxSlices = 720,
): WheelLayout {
  const count = Math.min(source.count, maxSlices);
  if (!count) return { count: 0, boundaries: [0] };
  if (!rules.chance)
    return {
      count,
      boundaries: Array.from(
        { length: count + 1 },
        (_, i) => (i * 360) / count,
      ),
    };
  const entries = distributionEntries(rules.distribution, source.count);
  const total =
    rules.distribution.base * (source.count - entries.length) +
    entries.reduce((sum, [, w]) => sum + w, 0);
  if (!(total > 0))
    throw new Error(
      "A distribuição de chances deve conter uma opção positiva.",
    );
  let cursor = 0;
  let customMass = 0;
  const boundaries = Array.from({ length: count + 1 }, (_, bin) => {
    if (bin === count) return 360;
    const end = Number(
      (BigInt(bin) * BigInt(source.count) + BigInt(count) - 1n) / BigInt(count),
    );
    while (cursor < entries.length && entries[cursor]![0] < end) {
      customMass += entries[cursor]![1];
      cursor++;
    }
    return (
      (((end - cursor) * rules.distribution.base + customMass) / total) * 360
    );
  });
  return { count, boundaries };
}
export function pointedSlice(angle: number, layout: WheelLayout): number {
  const position = ((-angle % 360) + 360) % 360;
  for (let i = 0; i < layout.count; i++)
    if (
      position >= layout.boundaries[i]! &&
      position < layout.boundaries[i + 1]!
    )
      return i;
  return layout.count - 1;
}
export function chancePercent(
  index: number,
  rules: ModeRules,
  total: number,
): number {
  return total > 0
    ? (optionWeight(rules.distribution, index) / total) * 100
    : 0;
}
