import { z } from "zod";
import { createDeck, rollDice } from "../engine/games";
import { tournamentSchema } from "../engine/tournament";
import { calendarDay } from "../engine/calendar";
import { initialLaboratory } from "../models/laboratory";

const text = z.string().trim().min(1).max(500);
const canonicalCards = new Map(createDeck(true).map((c) => [c.id, c]));
const card = z
  .object({
    id: z.string().max(30),
    rank: z.string().max(3),
    suit: z.enum(["spades", "hearts", "diamonds", "clubs", "joker"]),
    label: z.string().max(40),
    red: z.boolean(),
  })
  .refine((c) => {
    const original = canonicalCards.get(c.id);
    return (
      !!original &&
      original.rank === c.rank &&
      original.suit === c.suit &&
      original.label === c.label &&
      original.red === c.red
    );
  }, "Carta inválida.");
const diceSetup = z
  .object({
    count: z.number().int().min(1).max(30),
    sides: z.number().int().min(2).max(1000),
    modifier: z.number().int().min(-10000).max(10000),
    mode: z.enum(["normal", "advantage", "disadvantage"]),
  })
  .refine((d) => d.mode === "normal" || (d.count === 1 && d.sides === 20));
const die = z.number().int().min(1).max(1000);
const dice = z
  .object({
    rolls: z.array(die).min(1).max(30),
    selected: z.array(die).min(1).max(30),
    subtotal: z.number().int().min(1).max(30000),
    total: z.number().int().min(-9999).max(40000),
    expression: z.string().min(1).max(100),
  })
  .refine((d) => {
    const remaining = [...d.rolls];
    return (
      d.subtotal === d.selected.reduce((a, b) => a + b, 0) &&
      Math.abs(d.total - d.subtotal) <= 10000 &&
      d.selected.every((n) => {
        const i = remaining.indexOf(n);
        if (i < 0) return false;
        remaining.splice(i, 1);
        return true;
      })
    );
  }, "Resultado dos dados inconsistente.");
const secret = z
  .array(
    z.object({
      giverIndex: z.number().int().min(0).max(199),
      receiverIndex: z.number().int().min(0).max(199),
      giver: text,
      receiver: text,
    }),
  )
  .max(200)
  .refine((items) => {
    if (!items.length) return true;
    return (
      items.length >= 2 &&
      new Set(items.map((p) => p.receiverIndex)).size === items.length &&
      items.every(
        (p, i) =>
          p.giverIndex === i &&
          p.receiverIndex < items.length &&
          p.receiverIndex !== i &&
          items[p.receiverIndex]!.giver === p.receiver,
      )
    );
  }, "Pares do amigo secreto inválidos.");
const date = z.string().refine((s) => {
  try {
    calendarDay(s);
    return true;
  } catch {
    return false;
  }
});
export const laboratorySchema = z
  .object({
    diceSetup,
    dice: dice.nullable(),
    deck: z.array(card).max(54),
    hand: z.array(card).max(54),
    deckStarted: z.boolean(),
    jokers: z.boolean(),
    order: z.array(text).max(5000),
    secret,
    tournament: tournamentSchema.nullable(),
    dateSetup: z
      .object({
        start: date,
        end: date,
        weekdays: z
          .array(z.number().int().min(0).max(6))
          .min(1)
          .max(7)
          .refine((v) => new Set(v).size === v.length),
        quantity: z.number().int().min(1).max(100),
      })
      .refine((v) => v.start <= v.end),
    dates: z
      .array(date)
      .max(100)
      .refine((v) => new Set(v).size === v.length),
    timer: z
      .object({
        durationMs: z.number().int().min(1000).max(86400000),
        remainingMs: z.number().int().min(0).max(86400000),
        endsAt: z
          .number()
          .int()
          .nonnegative()
          .max(Number.MAX_SAFE_INTEGER)
          .nullable(),
      })
      .refine((t) => t.remainingMs <= t.durationMs),
  })
  .refine((lab) => {
    const cards = [...lab.deck, ...lab.hand];
    return (
      cards.length <= 54 &&
      new Set(cards.map((c) => c.id)).size === cards.length &&
      (lab.deckStarted || !cards.length)
    );
  }, "O baralho contém cartas repetidas ou estado inválido.")
  .refine((lab) => {
    if (!lab.dice) return true;
    try {
      // Replay the recorded faces through the same rules used by the game.
      let index = 0;
      const recorded = lab.dice;
      const expected = rollDice(lab.diceSetup, () => [
        0,
        (recorded.rolls[index++] ?? 1) - 1,
      ]);
      return (
        expected.rolls.length === recorded.rolls.length &&
        expected.rolls.every((n, i) => n === recorded.rolls[i]) &&
        expected.selected.length === recorded.selected.length &&
        expected.selected.every((n, i) => n === recorded.selected[i]) &&
        expected.subtotal === recorded.subtotal &&
        expected.total === recorded.total &&
        expected.expression === recorded.expression
      );
    } catch {
      return false;
    }
  }, "A jogada não corresponde à configuração dos dados.")
  .default(initialLaboratory);
