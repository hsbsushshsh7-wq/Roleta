import { describe, expect, it } from "vitest";
import { initialData } from "../src/data/defaults";
import { decodeData } from "../src/storage/schema";
import {
  createDeck,
  drawCards,
  rollDice,
  secretSanta,
} from "../src/engine/games";
import {
  createTournament,
  resolveMatch,
  tournamentRounds,
} from "../src/engine/tournament";
import { calendarDay, displayDate, drawDates } from "../src/engine/calendar";
import {
  configureTimer,
  formatTime,
  pauseTimer,
  remainingTime,
  startTimer,
} from "../src/engine/countdown";
const zero = (): [number, number] => [0, 0];
describe("3.0 storage compatibility", () => {
  it("adds empty tools to v2 data without modifying presets, weights, lists or sheets", () => {
    const before = initialData();
    before.lists.words = ["Minha lista", "Preservada"];
    before.rules.words.distribution = {
      format: "relative",
      base: 30,
      overrides: { 0: 90 },
    };
    const old = JSON.parse(JSON.stringify(before));
    delete old.lab;
    expect(decodeData(JSON.stringify(old))).toEqual(before);
  });
  it("round-trips all tools and a tournament in progress", () => {
    const d = initialData();
    d.lab.dice = rollDice(d.lab.diceSetup, zero);
    const cards = drawCards(createDeck(true), 4);
    d.lab.deckStarted = true;
    d.lab.deck = cards.remaining;
    d.lab.hand = cards.drawn;
    d.lab.jokers = true;
    d.lab.secret = secretSanta(["Ana", "Bia", "Caio"], zero);
    d.lab.order = ["Ana", "Ana", "Bia"];
    d.lab.dates = drawDates(
      "2024-02-28",
      "2024-03-02",
      [0, 1, 2, 3, 4, 5, 6],
      3,
      zero,
    );
    let tournament = createTournament(["A", "B", "C"], zero);
    const match = tournamentRounds(tournament)[0]!.find(
      (m) => m.status === "ready",
    )!;
    tournament = resolveMatch(tournament, match.id, match.participants[0]!.id);
    d.lab.tournament = tournament;
    d.lab.timer = startTimer(configureTimer(30), Date.now());
    expect(decodeData(JSON.stringify(d))).toEqual(d);
  });
  it("rejects card corruption, repeated cards and impossible secret assignments atomically", () => {
    const d = initialData();
    d.lab.deckStarted = true;
    d.lab.deck = createDeck();
    d.lab.hand = [d.lab.deck[0]!];
    expect(() => decodeData(JSON.stringify(d))).toThrow();
    d.lab.hand = [];
    d.lab.deck[0]!.label = "forged";
    expect(() => decodeData(JSON.stringify(d))).toThrow();
    d.lab.deck = [];
    d.lab.secret = [
      { giverIndex: 0, receiverIndex: 0, giver: "A", receiver: "A" },
    ];
    expect(() => decodeData(JSON.stringify(d))).toThrow();
  });
  it("rejects inconsistent die subtotals and invalid calendar backups", () => {
    const d = initialData();
    d.lab.dice = rollDice(d.lab.diceSetup, zero);
    d.lab.dice.subtotal = 500;
    expect(() => decodeData(JSON.stringify(d))).toThrow();
    d.lab.dice = null;
    d.lab.dates = ["2025-02-29"];
    expect(() => decodeData(JSON.stringify(d))).toThrow();
  });
});
describe("calendar draws", () => {
  it("includes leap day and draws every eligible day once", () => {
    const dates = drawDates(
      "2024-02-28",
      "2024-03-01",
      [0, 1, 2, 3, 4, 5, 6],
      3,
      zero,
    );
    expect(new Set(dates)).toEqual(
      new Set(["2024-02-28", "2024-02-29", "2024-03-01"]),
    );
    expect(displayDate(dates[1]!)).toBe("29/02/2024");
  });
  it("uses calendar weekdays without timezone shifts", () => {
    expect(drawDates("2026-10-19", "2026-10-25", [1, 5], 2, zero)).toEqual([
      "2026-10-19",
      "2026-10-23",
    ]);
    expect(calendarDay("1900-01-01")).toBe(-25567);
    expect(drawDates("1900-01-01", "1900-01-01", [1], 1, zero)).toEqual([
      "1900-01-01",
    ]);
  });
  it("validates actual dates, ranges, filters and availability", () => {
    for (const s of [
      "2025-02-29",
      "2024-02-30",
      "2101-01-01",
      "1899-12-31",
      "22/10/2026",
    ])
      expect(() => calendarDay(s)).toThrow();
    expect(() => drawDates("2024-01-02", "2024-01-01", [1], 1, zero)).toThrow();
    expect(() => drawDates("2024-01-01", "2024-01-02", [], 1, zero)).toThrow();
    expect(() => drawDates("2024-01-01", "2024-01-02", [3], 1, zero)).toThrow();
    expect(() =>
      drawDates("2024-01-01", "2024-01-02", [1, 2], 3, zero),
    ).toThrow();
  });
  it("supports the full supported span without repeating dates", () => {
    const result = drawDates(
      "1900-01-01",
      "2100-12-31",
      [1, 2, 3, 4, 5],
      100,
      zero,
    );
    expect(result).toHaveLength(100);
    expect(new Set(result).size).toBe(100);
  });
});
describe("persistent timer", () => {
  it("uses a deadline across backgrounding, pause and resume", () => {
    const t = startTimer(configureTimer(60), 10000);
    expect(remainingTime(t, 40000)).toBe(30000);
    const paused = pauseTimer(t, 40000);
    expect(remainingTime(paused, 100000)).toBe(30000);
    const resumed = startTimer(paused, 100000);
    expect(remainingTime(resumed, 120000)).toBe(10000);
    expect(remainingTime(resumed, 200000)).toBe(0);
  });
  it("restarts finished timers, clamps clock changes, formats hours and validates duration", () => {
    const t = startTimer(configureTimer(1), 10000);
    expect(remainingTime(t, 5000)).toBe(1000);
    expect(startTimer(t, 12000).endsAt).toBe(13000);
    expect(formatTime(3600000)).toBe("1:00:00");
    expect(formatTime(1)).toBe("00:01");
    expect(formatTime(0)).toBe("00:00");
    for (const n of [0, -1, 86401, NaN, 1.5])
      expect(() => configureTimer(n)).toThrow();
  });
});
