import type { Countdown } from "../models/laboratory";
export function remainingTime(timer: Countdown, now: number): number {
  return timer.endsAt === null
    ? timer.remainingMs
    : Math.min(timer.durationMs, Math.max(0, timer.endsAt - now));
}
export function configureTimer(seconds: number): Countdown {
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > 86400)
    throw new Error("Escolha de 1 segundo a 24 horas.");
  return {
    durationMs: seconds * 1000,
    remainingMs: seconds * 1000,
    endsAt: null,
  };
}
export function startTimer(timer: Countdown, now: number): Countdown {
  const remainingMs = remainingTime(timer, now);
  if (!remainingMs)
    return {
      ...timer,
      remainingMs: timer.durationMs,
      endsAt: now + timer.durationMs,
    };
  return { ...timer, remainingMs, endsAt: now + remainingMs };
}
export function pauseTimer(timer: Countdown, now: number): Countdown {
  return { ...timer, remainingMs: remainingTime(timer, now), endsAt: null };
}
export function formatTime(ms: number): string {
  const seconds = Math.ceil(ms / 1000),
    h = Math.floor(seconds / 3600),
    m = Math.floor((seconds % 3600) / 60),
    s = seconds % 60;
  return `${h ? `${h}:` : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
