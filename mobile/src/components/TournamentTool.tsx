import React, { useMemo, useState } from "react";
import { Pressable, Share, Text, View } from "react-native";
import * as Crypto from "expo-crypto";
import { LinearGradient } from "expo-linear-gradient";
import { useApp } from "../state/AppProvider";
import { parseList } from "../engine/options";
import {
  createTournament,
  randomMatchWinner,
  resolveMatch,
  tournamentChampion,
  tournamentRounds,
  undoTournament,
  type Tournament,
  type TournamentMatch,
} from "../engine/tournament";
import { Button, Field } from "./Primitives";
import { useDialog } from "./Dialog";
import { colors, ui } from "../theme/theme";

const randomWords = (): [number, number] => {
  const words = Crypto.getRandomValues(new Uint32Array(2));
  return [words[0]!, words[1]!];
};

function roundTitle(index: number, total: number): string {
  const remaining = total - index;
  return remaining === 1
    ? "Final"
    : remaining === 2
      ? "Semifinais"
      : remaining === 3
        ? "Quartas de final"
        : `Rodada ${index + 1}`;
}

export function TournamentTool() {
  const { data, update } = useApp();
  const ask = useDialog();
  const currentList =
    data.mode === "numbers" || data.mode === "percentage"
      ? []
      : data.lists[data.mode];
  const [text, setText] = useState(() =>
    currentList.length <= 64 ? currentList.join("\n") : "",
  );
  const [selectedRound, setSelectedRound] = useState(0);
  const state = data.lab.tournament;
  const rounds = useMemo(() => (state ? tournamentRounds(state) : []), [state]);
  const champion = useMemo(
    () => (state ? tournamentChampion(state) : null),
    [state],
  );
  const selected = Math.min(selectedRound, Math.max(0, rounds.length - 1));
  const participantCount = useMemo(() => {
    try {
      return String(parseList(text).length);
    } catch {
      return "Confira os nomes";
    }
  }, [text]);
  const mutate = (action: (current: Tournament) => Tournament) => {
    try {
      update((d) => {
        if (!d.lab.tournament) return d;
        return {
          ...d,
          lab: { ...d.lab, tournament: action(d.lab.tournament) },
        };
      });
    } catch (error) {
      void ask("Confira a partida", (error as Error).message);
    }
  };
  const create = async () => {
    try {
      const names = parseList(text);
      if (names.length < 2 || names.length > 64)
        throw new Error("Use de 2 a 64 participantes para montar a chave.");
      if (
        state &&
        !(await ask(
          "Substituir este torneio?",
          "A chave atual e seus resultados serão substituídos. Compartilhe o torneio antes, se quiser guardá-lo.",
          "Substituir torneio",
        ))
      )
        return;
      const tournament = createTournament(names, randomWords);
      update((d) => ({ ...d, lab: { ...d.lab, tournament } }));
      setSelectedRound(0);
    } catch (error) {
      await ask("Confira os participantes", (error as Error).message);
    }
  };
  const share = async () => {
    if (!state) return;
    const message = [
      "Torneio · Roleta Remake",
      champion
        ? `Campeão: ${champion.name} (${champion.id.toUpperCase()})`
        : "Torneio em andamento",
      ...rounds.map((round, index) =>
        [
          roundTitle(index, rounds.length),
          ...round.map((match) => {
            const entrants = match.participants
              .map((p) =>
                p
                  ? `${p.name} (${p.id.toUpperCase()})`
                  : match.status === "bye"
                    ? "Folga"
                    : "A definir",
              )
              .join(" × ");
            return `${entrants}${match.winner ? ` → ${match.winner.name} (${match.winner.id.toUpperCase()})` : ""}`;
          }),
        ].join("\n"),
      ),
    ].join("\n\n");
    try {
      await Share.share({ title: "Meu torneio", message });
    } catch (error) {
      await ask("Não foi possível compartilhar", (error as Error).message);
    }
  };
  return (
    <View style={{ gap: 18 }}>
      <Text style={[ui.title, { fontSize: 26 }]}>
        Do primeiro duelo à final.
      </Text>
      <Text style={ui.body}>
        Chave de eliminação simples para 2 a 64 participantes. Escolha quem
        venceu ou deixe um sorteio de 50% para cada lado decidir. As folgas são
        distribuídas aleatoriamente na primeira rodada.
      </Text>
      <Field
        label="Participantes do torneio"
        value={text}
        onChangeText={setText}
        multiline
        maxLength={32768}
        style={{ minHeight: 130, textAlignVertical: "top", fontSize: 15 }}
        placeholder="Um nome por linha, vírgula ou ponto e vírgula"
      />
      <Text style={ui.body}>
        {participantCount} participantes · nomes repetidos recebem IDs
        diferentes
      </Text>
      {currentList.length > 0 && (
        <View style={{ gap: 6 }}>
          <Button
            compact
            title="Usar lista atual no torneio"
            disabled={currentList.length > 64}
            onPress={() => setText(currentList.join("\n"))}
          />
          {currentList.length > 64 && (
            <Text style={ui.body}>
              Sua lista tem {currentList.length} entradas. Cole até 64
              participantes no campo acima.
            </Text>
          )}
        </View>
      )}
      <Button
        title="Montar torneio"
        primary
        onPress={() => {
          void create();
        }}
      />
      {state && (
        <View style={{ gap: 16 }}>
          {champion && (
            <LinearGradient
              colors={["#362953", "#6650CF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 22, gap: 9, borderRadius: 22 }}
            >
              <Text style={[ui.eyebrow, { color: "#D4C9FF" }]}>
                CAMPEÃO DO TORNEIO
              </Text>
              <Text
                selectable
                style={{ color: "white", fontSize: 27, fontWeight: "700" }}
              >
                {champion.name}
              </Text>
              <Text style={{ color: "#DDD5F8", fontSize: 13 }}>
                {champion.id.toUpperCase()} · {state.participants.length}{" "}
                participantes
              </Text>
            </LinearGradient>
          )}
          <Text style={ui.chip}>
            {state.decisions.length}/{state.participants.length - 1} partidas
            concluídas
          </Text>
          <Button
            title="Compartilhar torneio"
            icon="upload"
            onPress={() => {
              void share();
            }}
          />
          <Button
            title="Desfazer último resultado"
            disabled={!state.decisions.length}
            onPress={() => mutate(undoTournament)}
          />
          <View
            style={[
              ui.row,
              { justifyContent: "space-between", flexWrap: "wrap" },
            ]}
          >
            <Button
              compact
              title="Rodada anterior"
              disabled={selected === 0}
              onPress={() => setSelectedRound(selected - 1)}
            />
            <Text style={ui.eyebrow}>
              {selected + 1}/{rounds.length}
            </Text>
            <Button
              compact
              title="Próxima rodada"
              disabled={selected === rounds.length - 1}
              onPress={() => setSelectedRound(selected + 1)}
            />
          </View>
          <Text style={[ui.title, { fontSize: 22 }]}>
            {roundTitle(selected, rounds.length)}
          </Text>
          {rounds[selected]!.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              onWinner={(winnerId) =>
                mutate((current) => resolveMatch(current, match.id, winnerId))
              }
              onDraw={() =>
                mutate((current) =>
                  randomMatchWinner(current, match.id, randomWords),
                )
              }
            />
          ))}
          <Text style={[ui.body, { fontSize: 12 }]}>
            Chave e resultados são salvos automaticamente. Para corrigir um
            resultado, desfaça os resultados seguintes até chegar à partida
            desejada.
          </Text>
        </View>
      )}
    </View>
  );
}

function MatchCard({
  match,
  onWinner,
  onDraw,
}: {
  match: TournamentMatch;
  onWinner: (participantId: string) => void;
  onDraw: () => void;
}) {
  const ready = match.status === "ready";
  return (
    <View
      style={{
        padding: 15,
        gap: 11,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 21,
        backgroundColor: "white",
      }}
    >
      <Text style={[ui.eyebrow, { fontSize: 10 }]}>
        PARTIDA {match.index + 1} ·{" "}
        {match.status === "waiting"
          ? "AGUARDANDO"
          : match.status === "bye"
            ? "FOLGA"
            : match.status === "complete"
              ? "CONCLUÍDA"
              : "ESCOLHA O VENCEDOR"}
      </Text>
      {match.participants.map((participant, side) => (
        <Pressable
          key={side}
          accessibilityRole="button"
          accessibilityLabel={
            participant
              ? `Vencedor ${participant.name}, ${participant.id.toUpperCase()}, partida ${match.index + 1}`
              : "Participante a definir"
          }
          accessibilityState={{
            disabled: !ready,
            selected: !!participant && match.winner?.id === participant.id,
          }}
          disabled={!ready || !participant}
          onPress={() => participant && onWinner(participant.id)}
          style={({ pressed }) => ({
            padding: 13,
            minHeight: 48,
            borderRadius: 13,
            gap: 5,
            backgroundColor:
              pressed || (!!participant && match.winner?.id === participant.id)
                ? colors.lilac
                : "#F8F7FB",
          })}
        >
          <Text
            style={{
              color: participant ? colors.ink : colors.muted,
              fontSize: 16,
              fontWeight: "600",
            }}
          >
            {participant?.name ??
              (match.status === "bye" ? "Folga" : "A definir")}
          </Text>
          {participant && (
            <Text style={{ fontSize: 11, color: colors.purple }}>
              {participant.id.toUpperCase()}
              {match.winner?.id === participant.id ? " · CLASSIFICADO" : ""}
            </Text>
          )}
        </Pressable>
      ))}
      {ready && (
        <Button
          compact
          title={`Sortear vencedor · partida ${match.index + 1}`}
          onPress={onDraw}
        />
      )}
      {match.status === "bye" && (
        <Text style={[ui.body, { fontSize: 12 }]}>
          Avança automaticamente nesta rodada.
        </Text>
      )}
    </View>
  );
}
