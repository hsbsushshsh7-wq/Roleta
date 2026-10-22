import type { WheelAppearance } from "../models/types";
import { palette } from "../theme/palette";
export const PALETTES = {
  classic: { name: "Original", colors: [...palette] },
  pastel: {
    name: "Macaron",
    colors: ["#F5AAC2", "#F3C28D", "#F5E29B", "#A7DAC4", "#9FCFE5", "#C3B0ED"],
  },
  neon: {
    name: "Neon",
    colors: ["#F53780", "#FA8A38", "#C5E541", "#27D8AA", "#2D9BEF", "#9E55F5"],
  },
  ocean: {
    name: "Oceano",
    colors: ["#244F8D", "#59B8CE", "#507FE0", "#84DDCF", "#446BBC", "#A8E2ED"],
  },
  sunset: {
    name: "Pôr do sol",
    colors: ["#C95282", "#EE8A63", "#F4C576", "#B472B9", "#F1AA99", "#8F6CC0"],
  },
};
export const DEFAULT_APPEARANCE: WheelAppearance = {
  palette: "classic",
  overrides: {},
  showLabels: true,
  title: "",
};
export function sliceColor(
  index: number,
  count: number,
  appearance: WheelAppearance = DEFAULT_APPEARANCE,
): string {
  const colors = PALETTES[appearance.palette].colors;
  const position =
    index === count - 1 && index % colors.length === 0 && count > 1
      ? 1
      : index % colors.length;
  return appearance.overrides[String(index)] ?? colors[position]!;
}
export function contrastText(hex: string): string {
  const channels = [1, 3, 5].map((i) => {
    const s = parseInt(hex.slice(i, i + 2), 16) / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const luminance =
    0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
  return luminance > 0.179 ? "#191827" : "#FFFFFF";
}
export function normalizeHex(value: string): string | null {
  const clean = value.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(clean))
    return (
      "#" +
      [...clean]
        .map((c) => c + c)
        .join("")
        .toUpperCase()
    );
  return /^[0-9a-f]{6}$/i.test(clean) ? "#" + clean.toUpperCase() : null;
}
export function visualColors(
  count: number,
  displayCount: number,
  appearance: WheelAppearance,
): string[] {
  const result = Array.from({ length: displayCount }, (_, i) =>
    sliceColor(i, displayCount, { ...appearance, overrides: {} }),
  );
  for (const [key, color] of Object.entries(appearance.overrides)) {
    const i = Number(key);
    if (i < 0 || i >= count) continue;
    const bin = Number((BigInt(i) * BigInt(displayCount)) / BigInt(count));
    result[bin] = color;
  }
  return result;
}
