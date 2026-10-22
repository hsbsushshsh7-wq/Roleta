import { uniformIndex, type RandomWords } from "./draw";

export interface DiceOptions {
  count: number;
  sides: number;
  modifier: number;
  mode: "normal" | "advantage" | "disadvantage";
}
export interface DiceResult {
  rolls: number[];
  selected: number[];
  subtotal: number;
  total: number;
  expression: string;
}

function integer(value: number, min: number, max: number, message: string) {
  if (!Number.isInteger(value) || value < min || value > max)
    throw new Error(message);
}

export function rollDice(
  options: DiceOptions,
  random: RandomWords,
): DiceResult {
  const { count, sides, modifier, mode } = options;
  integer(count, 1, 30, "Escolha de 1 a 30 dados.");
  integer(sides, 2, 1000, "Cada dado deve ter de 2 a 1.000 faces.");
  integer(
    modifier,
    -10000,
    10000,
    "Use um modificador inteiro entre −10.000 e 10.000.",
  );
  if (!["normal", "advantage", "disadvantage"].includes(mode))
    throw new Error("Modo de dados desconhecido.");
  if (mode !== "normal" && (count !== 1 || sides !== 20))
    throw new Error(
      "Vantagem e desvantagem usam 1D20: role duas vezes e mantenha uma.",
    );
  const rolls = Array.from(
    { length: mode === "normal" ? count : 2 },
    () => uniformIndex(sides, random) + 1,
  );
  const selected =
    mode === "normal"
      ? [...rolls]
      : [mode === "advantage" ? Math.max(...rolls) : Math.min(...rolls)];
  const subtotal = selected.reduce((sum, value) => sum + value, 0);
  const suffix =
    modifier === 0
      ? ""
      : modifier > 0
        ? ` + ${modifier}`
        : ` − ${Math.abs(modifier)}`;
  const modeLabel =
    mode === "normal"
      ? ""
      : mode === "advantage"
        ? " · vantagem"
        : " · desvantagem";
  return {
    rolls,
    selected,
    subtotal,
    total: subtotal + modifier,
    expression: `${count}D${sides}${suffix}${modeLabel}`,
  };
}

/** Every input position remains distinct, including equal names. */
export function shuffle<T>(items: readonly T[], random: RandomWords): T[] {
  if (items.length > 5000) throw new Error("Use no máximo 5.000 entradas.");
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = uniformIndex(i + 1, random);
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

export type CardSuit = "spades" | "hearts" | "diamonds" | "clubs" | "joker";
export interface PlayingCard {
  id: string;
  rank: string;
  suit: CardSuit;
  label: string;
  red: boolean;
}
const SUITS = [
  { suit: "spades", label: "Espadas", symbol: "♠", red: false },
  { suit: "hearts", label: "Copas", symbol: "♥", red: true },
  { suit: "diamonds", label: "Ouros", symbol: "♦", red: true },
  { suit: "clubs", label: "Paus", symbol: "♣", red: false },
] as const;
const RANKS = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

export function createDeck(includeJokers = false): PlayingCard[] {
  const cards: PlayingCard[] = SUITS.flatMap(({ suit, label, symbol, red }) =>
    RANKS.map((rank) => ({
      id: `${suit}-${rank}`,
      rank,
      suit,
      label: `${rank}${symbol} · ${label}`,
      red,
    })),
  );
  if (includeJokers)
    cards.push(
      {
        id: "joker-black",
        rank: "★",
        suit: "joker",
        label: "Coringa preto",
        red: false,
      },
      {
        id: "joker-red",
        rank: "★",
        suit: "joker",
        label: "Coringa vermelho",
        red: true,
      },
    );
  return cards;
}

export function drawCards(
  deck: readonly PlayingCard[],
  quantity: number,
): {
  drawn: PlayingCard[];
  remaining: PlayingCard[];
} {
  integer(quantity, 1, 54, "Compre de 1 a 54 cartas.");
  if (
    deck.length > 54 ||
    new Set(deck.map((card) => card.id)).size !== deck.length
  )
    throw new Error("Baralho inválido. Embaralhe um novo baralho.");
  const valid = new Map(createDeck(true).map((card) => [card.id, card]));
  if (
    deck.some((card) => {
      const original = valid.get(card.id);
      return (
        !original ||
        original.rank !== card.rank ||
        original.suit !== card.suit ||
        original.label !== card.label ||
        original.red !== card.red
      );
    })
  )
    throw new Error("Baralho inválido. Embaralhe um novo baralho.");
  if (quantity > deck.length)
    throw new Error(
      `Restam ${deck.length} cartas. Reduza a compra ou embaralhe um novo baralho.`,
    );
  return { drawn: deck.slice(0, quantity), remaining: deck.slice(quantity) };
}

export interface SecretAssignment {
  giverIndex: number;
  receiverIndex: number;
  giver: string;
  receiver: string;
}
export type SecretSantaPair = SecretAssignment;

/** Uniform rejection of full permutations, rather than biased repair of self-pairs. */
export function secretSanta(
  names: readonly string[],
  random: RandomWords,
): SecretAssignment[] {
  integer(
    names.length,
    2,
    200,
    "Use de 2 a 200 participantes no amigo secreto.",
  );
  if (names.some((name) => !name.trim() || name.length > 500))
    throw new Error(
      "Preencha cada participante com um nome de até 500 caracteres.",
    );
  const indices = names.map((_, index) => index);
  for (let tries = 0; tries < 1000; tries++) {
    const receivers = shuffle(indices, random);
    if (receivers.every((receiver, giver) => receiver !== giver))
      return receivers.map((receiverIndex, giverIndex) => ({
        giverIndex,
        receiverIndex,
        giver: names[giverIndex]!,
        receiver: names[receiverIndex]!,
      }));
  }
  throw new Error(
    "Não foi possível formar pares sem autoatribuição. Tente novamente.",
  );
}
