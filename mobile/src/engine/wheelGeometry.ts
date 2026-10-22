import { palette } from "../theme/palette";
const R = 150;
export function point(angle: number, radius = R) {
  const rad = (angle * Math.PI) / 180;
  return [R + radius * Math.cos(rad), R + radius * Math.sin(rad)];
}
export function wheelPaths(count: number, boundaries?: number[]): string[] {
  const groups: string[] = palette.map(() => "");
  for (let i = 0; i < count; i++) {
    const a = boundaries?.[i] ?? (i * 360) / count;
    const b = boundaries?.[i + 1] ?? ((i + 1) * 360) / count;
    const span = b - a;
    if (span <= 0) continue;
    const start = point(a);
    const end = point(b);
    const color =
      i === count - 1 && i % palette.length === 0 && count > 1
        ? 1
        : i % palette.length;
    groups[color] +=
      span >= 360 - 1e-10
        ? "M150 0A150 150 0 1 1 149.999 0Z"
        : `M150 150L${start[0]} ${start[1]}A150 150 0 ${span > 180 ? 1 : 0} 1 ${end[0]} ${end[1]}Z`;
  }
  return groups;
}

export function segmentPath(a: number, b: number): string {
  const span = b - a;
  if (span <= 0) return "";
  if (span >= 360 - 1e-10) return "M150 0A150 150 0 1 1 149.999 0Z";
  const start = point(a),
    end = point(b);
  return `M150 150L${start[0]} ${start[1]}A150 150 0 ${span > 180 ? 1 : 0} 1 ${end[0]} ${end[1]}Z`;
}
export function coloredPaths(
  boundaries: number[],
  colors: string[],
): { color: string; path: string }[] {
  const groups = new Map<string, string>();
  colors.forEach((color, i) => {
    const path = segmentPath(boundaries[i]!, boundaries[i + 1]!);
    if (path) groups.set(color, (groups.get(color) ?? "") + path);
  });
  return [...groups].map(([color, path]) => ({ color, path }));
}
