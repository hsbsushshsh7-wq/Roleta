import { describe, expect, it } from "vitest";
import {
  createDeck,
  drawCards,
  rollDice,
  secretSanta,
  shuffle,
  type DiceOptions,
} from "../src/engine/games";
import type { RandomWords } from "../src/engine/draw";

const zero: RandomWords = () => [0, 0];
const dice: DiceOptions = { count: 3, sides: 6, modifier: 2, mode: "normal" };
function values(...words: number[]): RandomWords {
  let index = 0;
  return () => [0, words[index++ % words.length]!];
}

describe("RPG dice", () => {
  it("keeps every independent roll and applies the modifier once", () => {
    const result = rollDice(dice, values(0, 2, 5));
    expect(result).toEqual({
      rolls: [1, 3, 6],
      selected: [1, 3, 6],
      subtotal: 10,
      total: 12,
      expression: "3D6 + 2",
    });
    expect(rollDice({ ...dice, modifier: -12 }, zero).total).toBe(-9);
    expect(rollDice({ ...dice, modifier: 0 }, zero).expression).toBe("3D6");
  });
  it.each(["advantage", "disadvantage"] as const)(
    "selects the proper die for %s",
    (mode) => {
      const result = rollDice(
        { count: 1, sides: 20, modifier: -1, mode },
        values(3, 19),
      );
      expect(result.rolls).toEqual([4, 20]);
      expect(result.selected).toEqual([mode === "advantage" ? 20 : 4]);
      expect(result.total).toBe(mode === "advantage" ? 19 : 3);
    },
  );
  it("supports limits and rejects fractional, nonfinite or inappropriate combinations", () => {
    expect(
      rollDice(
        { ...dice, count: 30, sides: 1000, modifier: 10000 },
        values(999),
      ).total,
    ).toBe(40000);
    for (const invalid of [
      { count: 0 },
      { count: 31 },
      { count: 1.5 },
      { sides: 1 },
      { sides: 1001 },
      { sides: Infinity },
      { modifier: -10001 },
      { modifier: NaN },
      { modifier: 0.1 },
      { mode: "advantage" as const },
      { count: 1, mode: "disadvantage" as const },
    ])
      expect(() => rollDice({ ...dice, ...invalid }, zero)).toThrow();
    expect(() =>
      rollDice({ ...dice, mode: "unknown" as DiceOptions["mode"] }, zero),
    ).toThrow();
  });
});

describe("cards and random order", () => {
  it("builds all standard cards with distinct identities and optional jokers", () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((card) => card.id)).size).toBe(52);
    expect(deck.filter((card) => card.red)).toHaveLength(26);
    for (const suit of ["spades", "hearts", "diamonds", "clubs"])
      expect(deck.filter((card) => card.suit === suit)).toHaveLength(13);
    expect(createDeck(true)).toHaveLength(54);
    expect(
      createDeck(true).filter((card) => card.suit === "joker"),
    ).toHaveLength(2);
  });
  it("draws without replacement, preserves the shuffled sequence, and never mutates input", () => {
    const original = createDeck(true);
    const deck = shuffle(original, zero);
    const first = drawCards(deck, 10);
    const second = drawCards(first.remaining, 44);
    expect(second.remaining).toEqual([]);
    expect([...first.drawn, ...second.drawn]).toEqual(deck);
    expect(
      new Set([...first.drawn, ...second.drawn].map((card) => card.id)).size,
    ).toBe(54);
    expect(deck).toHaveLength(54);
    expect(original).toEqual(createDeck(true));
    expect(() => drawCards(second.remaining, 1)).toThrow("Restam 0");
  });
  it("rejects overdraws and malformed decks atomically", () => {
    const deck = createDeck();
    for (const quantity of [0, 53, 55, 1.5, NaN])
      expect(() => drawCards(deck, quantity)).toThrow();
    expect(() => drawCards([deck[0]!, deck[0]!], 1)).toThrow(
      "Baralho inválido",
    );
    expect(() => drawCards([{ ...deck[0]!, rank: "99" }], 1)).toThrow(
      "Baralho inválido",
    );
    expect(deck).toHaveLength(52);
  });
  it("preserves duplicates by position and permits every Fisher–Yates permutation", () => {
    const names = ["Ana", "Ana", "Bia", "Caio"];
    expect(shuffle(names, zero).sort()).toEqual([...names].sort());
    expect(names).toEqual(["Ana", "Ana", "Bia", "Caio"]);
    const outcomes = new Set<string>();
    for (let first = 0; first < 3; first++)
      for (let second = 0; second < 2; second++)
        outcomes.add(shuffle([0, 1, 2], values(first, second)).join(""));
    expect(outcomes.size).toBe(6);
    expect(shuffle([], zero)).toEqual([]);
    expect(shuffle(["A"], zero)).toEqual(["A"]);
    expect(() => shuffle(Array(5001).fill("A"), zero)).toThrow();
  });
});

describe("secret Santa", () => {
  it.each([2, 3, 4, 200])(
    "assigns all %i participants once, excluding themselves",
    (count) => {
      const names = Array.from({ length: count }, (_, i) => `Pessoa ${i}`);
      const pairs = secretSanta(names, zero);
      expect(pairs).toHaveLength(count);
      expect(new Set(pairs.map((pair) => pair.receiverIndex)).size).toBe(count);
      expect(
        pairs.every((pair) => pair.giverIndex !== pair.receiverIndex),
      ).toBe(true);
      expect(pairs.map((pair) => pair.giver)).toEqual(names);
      expect(pairs.map((pair) => pair.receiver).sort()).toEqual(
        [...names].sort(),
      );
    },
  );
  it("rejects a self-pairing and samples a fresh full permutation without repairs", () => {
    const pairs = secretSanta(["Ana", "Bia", "Caio"], values(2, 1, 0, 0));
    expect(pairs.map((pair) => pair.receiverIndex)).toEqual([1, 2, 0]);
  });
  it("keeps participants with equal names distinct", () => {
    expect(
      secretSanta(["Ana", "Ana"], zero).map((pair) => [
        pair.giverIndex,
        pair.receiverIndex,
      ]),
    ).toEqual([
      [0, 1],
      [1, 0],
    ]);
  });
  it("stops a broken random stream rather than hanging, and validates input", () => {
    let calls = 0;
    expect(() =>
      secretSanta(["A", "B"], () => {
        calls++;
        return [0, 1];
      }),
    ).toThrow("Tente novamente");
    expect(calls).toBe(1000);
    for (const names of [
      [],
      ["A"],
      ["A", " "],
      Array(201).fill("A"),
      ["A", "B".repeat(501)],
    ])
      expect(() => secretSanta(names, zero)).toThrow();
  });
});
