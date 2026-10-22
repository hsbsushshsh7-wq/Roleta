import { uniformIndex, type RandomWords } from "./draw";
const DAY = 86400000;
export function calendarDay(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error("Use datas no formato AAAA-MM-DD.");
  const n = Date.parse(`${value}T00:00:00.000Z`);
  if (
    !Number.isFinite(n) ||
    new Date(n).toISOString().slice(0, 10) !== value ||
    value < "1900-01-01" ||
    value > "2100-12-31"
  )
    throw new Error("Use uma data válida entre 1900 e 2100.");
  return n / DAY;
}
export function drawDates(
  start: string,
  end: string,
  weekdays: number[],
  quantity: number,
  random: RandomWords,
): string[] {
  const first = calendarDay(start),
    last = calendarDay(end);
  if (first > last)
    throw new Error("A data inicial deve vir antes ou ser igual à final.");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100)
    throw new Error("Sorteie de 1 a 100 datas.");
  if (
    !weekdays.length ||
    weekdays.some((n) => !Number.isInteger(n) || n < 0 || n > 6)
  )
    throw new Error("Escolha ao menos um dia da semana.");
  const days: number[] = [];
  const allowed = new Set(weekdays);
  for (let d = first; d <= last; d++)
    if (allowed.has((((d + 4) % 7) + 7) % 7)) days.push(d);
  if (quantity > days.length)
    throw new Error(`Há ${days.length} datas disponíveis com esses filtros.`);
  // Partial Fisher–Yates: uniform samples without replacement, independent of device timezone.
  for (let i = 0; i < quantity; i++) {
    const j = i + uniformIndex(days.length - i, random);
    [days[i], days[j]] = [days[j]!, days[i]!];
  }
  return days
    .slice(0, quantity)
    .map((d) => new Date(d * DAY).toISOString().slice(0, 10));
}
export function displayDate(value: string): string {
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}
