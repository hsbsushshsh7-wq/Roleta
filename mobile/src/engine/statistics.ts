import type { Draw, Mode } from "../models/types";

export interface HistoryFilter {
  mode: Mode | "all";
  sessionId?: string;
  kind: "all" | "wheel" | "batch";
}

export interface FrequencyRow {
  key: string;
  value: string;
  mode: Mode;
  index: number;
  sessionId?: string;
  count: number;
  frequency: number;
}

export function filterHistory(
  history: readonly Draw[],
  filter: HistoryFilter,
): Draw[] {
  return history.filter(
    (draw) =>
      (filter.mode === "all" || draw.mode === filter.mode) &&
      (filter.sessionId === undefined || draw.sessionId === filter.sessionId) &&
      (filter.kind === "all" ||
        (filter.kind === "batch"
          ? draw.tool === "batch"
          : draw.tool !== "batch")),
  );
}

/** Identity includes the session, mode and option index. Equal labels are not equal slices. */
export function summarizeHistory(draws: readonly Draw[]) {
  const groups = new Map<string, FrequencyRow>();
  for (const draw of draws) {
    // Older imported entries may have no session. Do not infer that their lists were identical.
    const key = JSON.stringify([
      draw.mode,
      draw.sessionId ?? `legacy:${draw.id}`,
      draw.index,
      draw.count,
      draw.value,
    ]);
    const existing = groups.get(key);
    if (existing) existing.count++;
    else
      groups.set(key, {
        key,
        value: draw.value,
        mode: draw.mode,
        index: draw.index,
        sessionId: draw.sessionId,
        count: 1,
        frequency: 0,
      });
  }
  const ranked = [...groups.values()]
    .map((row) => ({
      ...row,
      frequency: draws.length ? (row.count / draws.length) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  const highest = ranked[0]?.count ?? 0;
  return {
    total: draws.length,
    distinct: ranked.length,
    ranked,
    top: ranked[0] ?? null,
    tiedTop: ranked.filter((row) => row.count === highest).length,
    batch: draws.filter((draw) => draw.tool === "batch").length,
  };
}

/** Quote every field, escaping quotes and neutralizing spreadsheet formulas. */
export function csvCell(value: string): string {
  const safe =
    /^[\s\uFEFF]*[=+\-@]/u.test(value) || /^[\t\r\n]/u.test(value)
      ? `'${value}`
      : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function historyCsv(draws: readonly Draw[]): string {
  const rows = [
    [
      "Data (UTC)",
      "Modalidade",
      "Sessão",
      "Origem",
      "Opção (1 a N)",
      "Total de opções",
      "Resultado",
    ],
    ...[...draws]
      .sort((a, b) => a.at.localeCompare(b.at))
      .map((draw) => [
        draw.at,
        draw.mode,
        draw.sessionId ?? "sem identificação",
        draw.tool === "batch" ? "lote" : "roleta",
        String(draw.index + 1),
        String(draw.count),
        draw.value,
      ]),
  ];
  return rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
}
