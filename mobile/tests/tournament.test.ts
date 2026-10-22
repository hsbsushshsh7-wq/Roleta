import { describe, expect, it } from "vitest";
import {
  createTournament,
  randomMatchWinner,
  resolveMatch,
  tournamentChampion,
  tournamentRounds,
  tournamentSchema,
  undoTournament,
} from "../src/engine/tournament";
import type { Tournament } from "../src/engine/tournament";

const zero = (): [number, number] => [0, 0];
const one = (): [number, number] => [0, 1];
const names = (count: number) =>
  Array.from({ length: count }, (_, i) => `Pessoa ${i + 1}`);
function finish(state: Tournament): Tournament {
  while (!tournamentChampion(state)) {
    const match = tournamentRounds(state)
      .flat()
      .find((m) => m.status === "ready");
    if (!match) throw new Error("Chave bloqueada");
    state = randomMatchWinner(state, match.id, zero);
  }
  return state;
}

describe("Tournament bracket", () => {
  it.each([0, 1, 65])("rejects %i entrants", (count) => {
    expect(() => createTournament(names(count), zero)).toThrow(/2 a 64/);
  });

  it("validates names without merging distinct entrants who share a name", () => {
    expect(() => createTournament(["A", " "], zero)).toThrow();
    expect(() => createTournament(["A", "x".repeat(501)], zero)).toThrow();
    const state = createTournament([" Ana ", "Ana"], zero);
    expect(state.participants.map((p) => p.name)).toEqual(["Ana", "Ana"]);
    expect(new Set(state.participants.map((p) => p.id)).size).toBe(2);
    expect(finish(state).decisions).toHaveLength(1);
  });

  it.each([2, 3, 4, 5, 7, 8, 9, 31, 32, 33, 63, 64])(
    "completes a %i-person bracket in precisely N-1 deliberate results",
    (count) => {
      const initial = createTournament(names(count), zero);
      const size = 2 ** Math.ceil(Math.log2(count));
      const rounds = tournamentRounds(initial);
      expect(initial.seeds).toHaveLength(size);
      expect(rounds).toHaveLength(Math.log2(size));
      expect(rounds[0]!.filter((m) => m.status === "bye")).toHaveLength(
        size - count,
      );
      expect(rounds[0]!.every((m) => m.participants.some(Boolean))).toBe(true);
      const finished = finish(initial);
      expect(finished.decisions).toHaveLength(count - 1);
      expect(tournamentChampion(finished)?.id).toBeTruthy();
      expect(
        tournamentRounds(finished)
          .flat()
          .every((m) => m.status === "complete" || m.status === "bye"),
      ).toBe(true);
      expect(tournamentSchema.safeParse(finished).success).toBe(true);
      expect(initial.decisions).toEqual([]);
    },
  );

  it("does not advance a bye winner past an unfinished opponent", () => {
    const state = createTournament(names(3), zero);
    const rounds = tournamentRounds(state);
    expect(rounds[0]![1]!.status).toBe("bye");
    expect(rounds[1]![0]!.status).toBe("waiting");
    expect(tournamentChampion(state)).toBeNull();
    expect(() =>
      resolveMatch(state, "r2m1", rounds[0]![1]!.winner!.id),
    ).toThrow();
  });

  it("gives every entrant the same bye opportunity across all three-person shuffles", () => {
    const byes: Record<string, number> = { p1: 0, p2: 0, p3: 0 };
    const permutations = new Set<string>();
    for (let last = 0; last < 3; last++) {
      for (let first = 0; first < 2; first++) {
        const values = [last, first];
        const state = createTournament(names(3), () => [0, values.shift()!]);
        permutations.add(state.seeds.join(","));
        const bye = tournamentRounds(state)[0]!.find(
          (m) => m.status === "bye",
        )!;
        byes[bye.winner!.id]!++;
      }
    }
    expect(permutations.size).toBe(6);
    expect(byes).toEqual({ p1: 2, p2: 2, p3: 2 });
  });

  it("accepts only an actual entrant of a ready match", () => {
    const state = createTournament(names(4), zero);
    const first = tournamentRounds(state)[0]![0]!;
    expect(() => resolveMatch(state, first.id, "p99")).toThrow(
      /precisa participar/,
    );
    expect(() => resolveMatch(state, "r9m9", "p1")).toThrow();
    const resolved = resolveMatch(state, first.id, first.participants[1]!.id);
    expect(tournamentRounds(resolved)[0]![0]!.winner).toEqual(
      first.participants[1],
    );
    expect(() =>
      resolveMatch(resolved, first.id, first.participants[0]!.id),
    ).toThrow();
  });

  it("allows concurrent ready branches in either order and records undo order", () => {
    let state = createTournament(names(4), zero);
    state = randomMatchWinner(state, "r1m2", zero);
    state = randomMatchWinner(state, "r1m1", one);
    expect(state.decisions.map((d) => d.matchId)).toEqual(["r1m2", "r1m1"]);
    expect(tournamentRounds(state)[1]![0]!.status).toBe("ready");
    const undone = undoTournament(state);
    expect(undone.decisions.map((d) => d.matchId)).toEqual(["r1m2"]);
    expect(tournamentRounds(undone)[1]![0]!.status).toBe("waiting");
    expect(tournamentSchema.safeParse(undone).success).toBe(true);
  });

  it("supports correcting the final result by undoing it", () => {
    const finished = finish(createTournament(names(5), zero));
    const before = undoTournament(finished);
    expect(tournamentChampion(before)).toBeNull();
    const final = tournamentRounds(before).at(-1)![0]!;
    const alternative = final.participants.find(
      (p) => p!.id !== tournamentChampion(finished)!.id,
    )!;
    const corrected = resolveMatch(before, final.id, alternative.id);
    expect(tournamentChampion(corrected)).toEqual(alternative);
    let cleared = corrected;
    for (let i = 0; i < corrected.decisions.length; i++)
      cleared = undoTournament(cleared);
    expect(cleared.decisions).toEqual([]);
    expect(undoTournament(cleared)).toBe(cleared);
  });

  it("uses unbiased integer draws for either eligible side", () => {
    const state = createTournament(names(2), zero);
    const match = tournamentRounds(state)[0]![0]!;
    expect(
      tournamentChampion(randomMatchWinner(state, match.id, zero)),
    ).toEqual(match.participants[0]);
    expect(tournamentChampion(randomMatchWinner(state, match.id, one))).toEqual(
      match.participants[1],
    );
  });

  it("round-trips JSON and rejects impossible imported decisions and seeds", () => {
    const state = finish(createTournament(names(5), zero));
    expect(tournamentSchema.parse(JSON.parse(JSON.stringify(state)))).toEqual(
      state,
    );
    expect(
      tournamentSchema.safeParse({ ...state, seeds: ["p1", "p1"] }).success,
    ).toBe(false);
    expect(
      tournamentSchema.safeParse({
        ...state,
        seeds: state.seeds.map((id) => (id === "p1" ? "p64" : id)),
      }).success,
    ).toBe(false);
    expect(
      tournamentSchema.safeParse({
        ...state,
        participants: state.participants.map(() => state.participants[0]),
      }).success,
    ).toBe(false);
    expect(
      tournamentSchema.safeParse({
        ...state,
        decisions: [...state.decisions].reverse(),
      }).success,
    ).toBe(false);
    expect(
      tournamentSchema.safeParse({
        ...state,
        decisions: [...state.decisions, state.decisions[0]],
      }).success,
    ).toBe(false);
    expect(
      tournamentSchema.safeParse({
        ...state,
        decisions: [{ matchId: "r1m2", winnerId: "p1" }],
      }).success,
    ).toBe(false);
  });
});
