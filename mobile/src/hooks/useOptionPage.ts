import { useDeferredValue, useMemo, useState } from "react";
import type { AppData } from "../models/types";
import { getSource } from "../engine/options";
const clean = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
export function useOptionPage(data: AppData) {
  const { mode, ranges, lists } = data;
  const source = useMemo(
    () => getSource({ mode, ranges, lists }),
    [mode, ranges, lists],
  );
  const [query, setQuery] = useState("");
  const search = useDeferredValue(query.trim());
  const [page, setPage] = useState(0);
  const matches = useMemo(() => {
    if (!search) return null;
    if (mode === "numbers" || mode === "percentage") {
      const value = Number(search.replace("%", "").replace(",", "."));
      const range = ranges[mode];
      const i =
        mode === "numbers"
          ? value - range.min
          : (Math.round(value * 100) - Math.round(range.min * 100)) /
            Math.round(range.step * 100);
      return Number.isFinite(value) &&
        Number.isSafeInteger(i) &&
        i >= 0 &&
        i < source.count
        ? [i]
        : [];
    }
    const term = clean(search);
    return lists[mode].flatMap((label, i) =>
      clean(label).includes(term) ? [i] : [],
    );
  }, [search, mode, ranges, lists, source.count]);
  const count = matches?.length ?? source.count;
  const pages = Math.max(1, Math.ceil(count / 20));
  const current = Math.min(page, pages - 1);
  const start = current * 20;
  const indices = Array.from(
    { length: Math.min(20, count - start) },
    (_, i) => matches?.[start + i] ?? start + i,
  );
  return {
    source,
    query,
    setQuery: (v: string) => {
      setQuery(v);
      setPage(0);
    },
    count,
    pages,
    current,
    setPage,
    start,
    indices,
  };
}
