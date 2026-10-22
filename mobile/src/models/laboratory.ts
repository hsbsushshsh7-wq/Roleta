import type {
  DiceOptions,
  DiceResult,
  PlayingCard,
  SecretSantaPair,
} from "../engine/games";
import type { Tournament } from "../engine/tournament";

export interface Countdown {
  durationMs: number;
  remainingMs: number;
  endsAt: number | null;
}
export interface Laboratory {
  diceSetup: DiceOptions;
  dice: DiceResult | null;
  deck: PlayingCard[];
  hand: PlayingCard[];
  deckStarted: boolean;
  jokers: boolean;
  order: string[];
  secret: SecretSantaPair[];
  tournament: Tournament | null;
  dateSetup: {
    start: string;
    end: string;
    weekdays: number[];
    quantity: number;
  };
  dates: string[];
  timer: Countdown;
}
export function initialLaboratory(): Laboratory {
  const year = Math.min(2100, Math.max(1900, new Date().getFullYear()));
  return {
    diceSetup: { count: 1, sides: 6, modifier: 0, mode: "normal" },
    dice: null,
    deck: [],
    hand: [],
    deckStarted: false,
    jokers: false,
    order: [],
    secret: [],
    tournament: null,
    dateSetup: {
      start: `${year}-01-01`,
      end: `${year}-12-31`,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      quantity: 1,
    },
    dates: [],
    timer: { durationMs: 60000, remainingMs: 60000, endsAt: null },
  };
}
