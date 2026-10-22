import { z } from "zod";
import { uniformIndex, type RandomWords } from "./draw";

export interface TournamentParticipant {
  id: string;
  name: string;
}

export interface TournamentDecision {
  matchId: string;
  winnerId: string;
}

/** Only seeds and deliberate results are stored; the bracket is derived. */
export interface Tournament {
  participants: TournamentParticipant[];
  seeds: (string | null)[];
  decisions: TournamentDecision[];
}

export interface TournamentMatch {
  id: string;
  round: number;
  index: number;
  participants: [TournamentParticipant | null, TournamentParticipant | null];
  status: "waiting" | "ready" | "bye" | "complete";
  winner: TournamentParticipant | null;
}

type Slot = { participant: TournamentParticipant | null; resolved: boolean };

export function createTournament(
  names: string[],
  random: RandomWords,
): Tournament {
  if (
    names.length < 2 ||
    names.length > 64 ||
    names.some((name) => !name.trim() || name.trim().length > 500)
  )
    throw new Error(
      "Use de 2 a 64 participantes, com nomes de até 500 caracteres.",
    );
  const participants = names.map((name, i) => ({
    id: `p${i + 1}`,
    name: name.trim(),
  }));
  const shuffled = participants.map((participant) => participant.id);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = uniformIndex(i + 1, random);
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  const size = 2 ** Math.ceil(Math.log2(participants.length));
  const half = size / 2;
  const seeds: (string | null)[] = [];
  // Each first-round match gets at least one player. Shuffling before assigning
  // byes gives every entrant the same chance of automatic advancement.
  for (let i = 0; i < half; i++)
    seeds.push(shuffled[i]!, shuffled[i + half] ?? null);
  return { participants, seeds, decisions: [] };
}

export function tournamentRounds(state: Tournament): TournamentMatch[][] {
  const byId = new Map(state.participants.map((p) => [p.id, p]));
  const decisions = new Map(
    state.decisions.map((d) => [d.matchId, d.winnerId]),
  );
  let slots: Slot[] = state.seeds.map((id) => ({
    participant: id === null ? null : (byId.get(id) ?? null),
    resolved: true,
  }));
  const rounds: TournamentMatch[][] = [];
  while (slots.length > 1) {
    const round = rounds.length;
    const matches: TournamentMatch[] = [];
    const next: Slot[] = [];
    for (let i = 0; i < slots.length; i += 2) {
      const left = slots[i]!;
      const right = slots[i + 1]!;
      const id = `r${round + 1}m${i / 2 + 1}`;
      const participants: TournamentMatch["participants"] = [
        left.participant,
        right.participant,
      ];
      let status: TournamentMatch["status"] = "waiting";
      let winner: TournamentParticipant | null = null;
      if (left.resolved && right.resolved) {
        if (!left.participant || !right.participant) {
          status = "bye";
          winner = left.participant ?? right.participant;
        } else {
          winner =
            participants.find((p) => p?.id === decisions.get(id)) ?? null;
          status = winner ? "complete" : "ready";
        }
      }
      matches.push({ id, round, index: i / 2, participants, status, winner });
      next.push({
        participant: winner,
        resolved: status === "bye" || status === "complete",
      });
    }
    rounds.push(matches);
    slots = next;
  }
  return rounds;
}

function readyMatch(state: Tournament, matchId: string): TournamentMatch {
  const match = tournamentRounds(state)
    .flat()
    .find((m) => m.id === matchId);
  if (!match || match.status !== "ready")
    throw new Error(
      "Esta partida ainda não está disponível ou já foi concluída.",
    );
  return match;
}

export function resolveMatch(
  state: Tournament,
  matchId: string,
  winnerId: string,
): Tournament {
  const match = readyMatch(state, matchId);
  if (!match.participants.some((p) => p?.id === winnerId))
    throw new Error("O vencedor precisa participar desta partida.");
  return {
    ...state,
    decisions: [...state.decisions, { matchId, winnerId }],
  };
}

/** A draw between the two entrants, independent of the wheel's weights. */
export function randomMatchWinner(
  state: Tournament,
  matchId: string,
  random: RandomWords,
): Tournament {
  const match = readyMatch(state, matchId);
  const winner = match.participants[uniformIndex(2, random)]!;
  return resolveMatch(state, matchId, winner.id);
}

export function undoTournament(state: Tournament): Tournament {
  if (!state.decisions.length) return state;
  return { ...state, decisions: state.decisions.slice(0, -1) };
}

export function tournamentChampion(
  state: Tournament,
): TournamentParticipant | null {
  return tournamentRounds(state).at(-1)?.[0]?.winner ?? null;
}

const participantId = z.string().regex(/^p(?:[1-9]|[1-5]\d|6[0-4])$/);

/** Validate imported/restored brackets by replaying every deliberate decision. */
export const tournamentSchema = z
  .object({
    participants: z
      .array(
        z.object({
          id: participantId,
          name: z.string().trim().min(1).max(500),
        }),
      )
      .min(2)
      .max(64),
    seeds: z.array(participantId.nullable()).min(2).max(64),
    decisions: z
      .array(
        z.object({
          matchId: z.string().regex(/^r[1-6]m(?:[1-9]|[12]\d|3[0-2])$/),
          winnerId: participantId,
        }),
      )
      .max(63),
  })
  .superRefine((state, ctx) => {
    const ids = new Set(state.participants.map((p) => p.id));
    const present = state.seeds.filter((id): id is string => id !== null);
    if (
      ids.size !== state.participants.length ||
      state.seeds.length !== 2 ** Math.ceil(Math.log2(ids.size)) ||
      present.length !== ids.size ||
      new Set(present).size !== present.length ||
      present.some((id) => !ids.has(id)) ||
      state.seeds.some(
        (id, i) => i % 2 === 0 && id === null && state.seeds[i + 1] === null,
      )
    ) {
      ctx.addIssue({
        code: "custom",
        message: "A chave contém participantes ou posições inválidas.",
      });
      return;
    }
    let replay: Tournament = { ...state, decisions: [] };
    try {
      for (const decision of state.decisions)
        replay = resolveMatch(replay, decision.matchId, decision.winnerId);
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "A chave contém resultados incompatíveis com as partidas.",
      });
    }
  });
