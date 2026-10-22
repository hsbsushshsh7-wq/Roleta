import type { AppData, Mode, OptionSource, Range } from "../models/types";
export const MAX_ENTRIES = 50000;
export function parseList(text: string): string[] {
  const items = text
    .split(/[,;\r\n]+/u)
    .map((s) => s.trim())
    .filter(Boolean);
  if (items.length > MAX_ENTRIES)
    throw new Error(`Use até ${MAX_ENTRIES.toLocaleString("pt-BR")} opções.`);
  if (items.some((s) => s.length > 500))
    throw new Error("Cada opção pode ter até 500 caracteres.");
  return items;
}
export function rangeCount(range: Range, percentage = false): number {
  const { min, max, step } = range;
  if (![min, max, step].every(Number.isFinite) || min > max || step <= 0)
    throw new Error(
      "Informe um intervalo válido, com início menor ou igual ao fim.",
    );
  if (percentage) {
    if (
      min < 0 ||
      max > 100 ||
      step < 0.01 ||
      ![min, max, step].every(
        (n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-7,
      )
    )
      throw new Error(
        "Use valores de 0 a 100 e precisão de até duas casas decimais.",
      );
    const span = Math.round(max * 100) - Math.round(min * 100);
    const stride = Math.round(step * 100);
    if (span % stride !== 0)
      throw new Error("O passo deve alcançar exatamente o valor final.");
    return span / stride + 1;
  }
  if (![min, max].every(Number.isSafeInteger) || step !== 1)
    throw new Error("Use números inteiros seguros e passo 1.");
  const count = max - min + 1;
  if (!Number.isSafeInteger(count) || count < 1)
    throw new Error("O intervalo excede a precisão suportada.");
  return count;
}
export function getSource(
  data: Pick<AppData, "mode" | "ranges" | "lists">,
  mode: Mode = data.mode,
): OptionSource {
  if (mode === "numbers" || mode === "percentage") {
    const range = data.ranges[mode];
    return {
      count: rangeCount(range, mode === "percentage"),
      label: (i) =>
        mode === "percentage"
          ? `${((Math.round(range.min * 100) + i * Math.round(range.step * 100)) / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`
          : String(range.min + i),
    };
  }
  const list = data.lists[mode];
  return { count: list.length, label: (i) => list[i] ?? "" };
}
