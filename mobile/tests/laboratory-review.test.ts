import { describe, expect, it } from "vitest";
import { initialData } from "../src/data/defaults";
import { savePreset } from "../src/engine/presets";
import {
  createDeck,
  drawCards,
  rollDice,
  secretSanta,
  shuffle,
} from "../src/engine/games";
import { createTournament, randomMatchWinner } from "../src/engine/tournament";
import {
  configureTimer,
  pauseTimer,
  startTimer,
} from "../src/engine/countdown";
import { initialLaboratory } from "../src/models/laboratory";
import { laboratorySchema } from "../src/storage/laboratorySchema";
import { decodeData } from "../src/storage/schema";

const zero = (): [number, number] => [0, 0];
function seeded(seed: number): () => [number, number] {
  // Mix low bits too: an LCG's short low-bit cycle can produce the same
  // forbidden permutation repeatedly when uniformIndex takes small moduli.
  let word = seed;
  const next = () => {
    word = (word + 0x6d2b79f5) | 0;
    let t = Math.imul(word ^ (word >>> 15), 1 | word);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) >>> 0;
  };
  return () => [next(), next()];
}

describe("Laboratory persistence review", () => {
  it("adds fresh laboratory state to a 2.0 backup without changing its modes or presets", () => {
    const old = savePreset(initialData(), "Salvamento da 2.0");
    old.mode = "words";
    old.lists.words = ["Ana", "Ana", "Bia"];
    old.rules.words.appearance.title = "Meu elenco";
    old.rules.words.appearance.overrides = { 1: "#AABBCC" };
    old.rules.words.distribution.overrides = { 0: 90, 1: 30 };
    const json = JSON.parse(JSON.stringify(old)) as Record<string, unknown>;
    delete json.lab;
    const restored = decodeData(JSON.stringify(json));
    expect(restored).toEqual({ ...old, lab: initialLaboratory() });
    const second = decodeData(JSON.stringify(json));
    restored.lab.order.push("Novo resultado");
    expect(second.lab.order).toEqual([]);
  });

  it("round-trips every new saved tool, including duplicates, paused time and partial brackets", () => {
    const data = initialData();
    const lab = initialLaboratory();
    lab.diceSetup = { count: 1, sides: 20, mode: "advantage", modifier: -2 };
    lab.dice = rollDice(lab.diceSetup, seeded(52));
    const cards = drawCards(shuffle(createDeck(true), seeded(9)), 4);
    lab.deck = cards.remaining;
    lab.hand = cards.drawn;
    lab.deckStarted = true;
    // This switch configures the NEXT deck, so it may differ from existing cards.
    lab.jokers = false;
    lab.order = ["Ana", "Ana", "Caio"];
    lab.secret = secretSanta(lab.order, zero);
    lab.tournament = randomMatchWinner(
      createTournament(lab.order, zero),
      "r1m1",
      zero,
    );
    lab.timer = pauseTimer(startTimer(configureTimer(60), 10000), 25000);
    lab.dates = ["2000-02-29", "2026-12-31"];
    data.lab = lab;
    expect(decodeData(JSON.stringify(data))).toEqual(data);
  });

  it("rejects cards repeated across the hand and remaining deck", () => {
    const lab = initialLaboratory();
    lab.deckStarted = true;
    lab.deck = createDeck();
    lab.hand = [lab.deck[0]!];
    expect(laboratorySchema.safeParse(lab).success).toBe(false);
    lab.hand = [];
    lab.deck[0] = { ...lab.deck[0]!, label: "Carta inventada" };
    expect(laboratorySchema.safeParse(lab).success).toBe(false);
  });

  it("rejects secret assignments with self-pairs, duplicated receivers or wrong names", () => {
    const lab = initialLaboratory();
    lab.secret = secretSanta(["Ana", "Ana", "Bia"], zero);
    expect(laboratorySchema.safeParse(lab).success).toBe(true);
    const original = structuredClone(lab.secret);
    lab.secret[0]!.receiverIndex = 0;
    expect(laboratorySchema.safeParse(lab).success).toBe(false);
    lab.secret = structuredClone(original);
    lab.secret[0]!.receiverIndex = lab.secret[1]!.receiverIndex;
    expect(laboratorySchema.safeParse(lab).success).toBe(false);
    lab.secret = structuredClone(original);
    lab.secret[0]!.receiver = "Outra pessoa";
    expect(laboratorySchema.safeParse(lab).success).toBe(false);
  });

  it("rejects a roll exceeding the number of faces configured for the saved throw", () => {
    const lab = initialLaboratory();
    lab.dice = {
      rolls: [1000],
      selected: [1000],
      subtotal: 1000,
      total: 1000,
      expression: "1D6",
    };
    expect(laboratorySchema.safeParse(lab).success).toBe(false);
  });

  it("rejects a saved throw with fewer rolls than configured", () => {
    const lab = initialLaboratory();
    lab.diceSetup.count = 2;
    lab.dice = {
      rolls: [4],
      selected: [4],
      subtotal: 4,
      total: 4,
      expression: "2D6",
    };
    expect(laboratorySchema.safeParse(lab).success).toBe(false);
  });

  it("rejects a normal throw that silently discards one die", () => {
    const lab = initialLaboratory();
    lab.diceSetup.count = 2;
    lab.dice = {
      rolls: [2, 6],
      selected: [6],
      subtotal: 6,
      total: 6,
      expression: "2D6",
    };
    expect(laboratorySchema.safeParse(lab).success).toBe(false);
  });

  it.each(["advantage", "disadvantage"] as const)(
    "rejects the wrong retained die in %s mode",
    (mode) => {
      const lab = initialLaboratory();
      lab.diceSetup = { count: 1, sides: 20, modifier: 0, mode };
      const wrong = mode === "advantage" ? 1 : 20;
      lab.dice = {
        rolls: [1, 20],
        selected: [wrong],
        subtotal: wrong,
        total: wrong,
        expression: `1D20 · ${mode === "advantage" ? "vantagem" : "desvantagem"}`,
      };
      expect(laboratorySchema.safeParse(lab).success).toBe(false);
    },
  );

  it("rejects a total that ignores the saved modifier", () => {
    const lab = initialLaboratory();
    lab.diceSetup.modifier = 2;
    lab.dice = rollDice(lab.diceSetup, zero);
    lab.dice.total = lab.dice.subtotal;
    expect(laboratorySchema.safeParse(lab).success).toBe(false);
  });

  it("rejects a displayed dice expression inconsistent with its setup", () => {
    const lab = initialLaboratory();
    lab.dice = rollDice(lab.diceSetup, zero);
    lab.dice.expression = "30D1000 + 9999";
    expect(laboratorySchema.safeParse(lab).success).toBe(false);
  });

  it("keeps assignment positions and card conservation across 1,000 deterministic seeds", () => {
    for (let seed = 0; seed < 1000; seed++) {
      const names = ["Ana", "Ana", "Bia", "Caio", "Dani"];
      const pairs = secretSanta(names, seeded(seed));
      expect(new Set(pairs.map((pair) => pair.receiverIndex)).size).toBe(5);
      expect(
        pairs.every(
          (pair, i) =>
            pair.giverIndex === i &&
            pair.receiverIndex !== i &&
            pair.receiver === names[pair.receiverIndex],
        ),
      ).toBe(true);
      const deck = shuffle(createDeck(seed % 2 === 0), seeded(seed));
      const { drawn, remaining } = drawCards(deck, 1 + (seed % 52));
      expect(
        new Set([...drawn, ...remaining].map((card) => card.id)).size,
      ).toBe(deck.length);
      expect([...drawn, ...remaining]).toEqual(deck);
    }
  });
});
