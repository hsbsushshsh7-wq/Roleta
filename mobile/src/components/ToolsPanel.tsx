import React, { useEffect, useState } from "react";
import { Text, View, Pressable, Share } from "react-native";
import * as Crypto from "expo-crypto";
import { useApp } from "../state/AppProvider";
import { getSource } from "../engine/options";
import {
  drawBatch,
  balancedTeams,
  QUICK_TEMPLATES,
  applyTemplate,
} from "../engine/toolbox";
import { Button, Field, Sheet } from "./Primitives";
import { useDialog } from "./Dialog";
import { colors, ui } from "../theme/theme";
const randomWords = (): [number, number] => {
  const w = Crypto.getRandomValues(new Uint32Array(2));
  return [w[0]!, w[1]!];
};
export function ToolsPanel({
  visible,
  onClose,
  onExplore,
  initialTab = "templates",
}: {
  visible: boolean;
  onClose: () => void;
  onExplore?: () => void;
  initialTab?: "templates" | "batch" | "teams";
}) {
  const { data, update } = useApp();
  const ask = useDialog();
  const [tab, setTab] = useState<"templates" | "batch" | "teams">("templates");
  useEffect(() => {
    if (visible) setTab(initialTab);
  }, [visible, initialTab]);
  const [quantity, setQuantity] = useState("3");
  const [teamCount, setTeamCount] = useState("2");
  const [working, setWorking] = useState(false);
  const source = getSource(data);
  const share = async (message: string) => {
    try {
      await Share.share({ message, title: "Roleta Remake" });
    } catch (e) {
      await ask("Não foi possível compartilhar", (e as Error).message);
    }
  };
  const run = async (action: () => void) => {
    if (working) return;
    setWorking(true);
    try {
      action();
    } catch (e) {
      await ask("Confira as opções", (e as Error).message);
    } finally {
      setWorking(false);
    }
  };
  return (
    <Sheet
      visible={visible}
      title="CAIXA DE FERRAMENTAS"
      onClose={onClose}
      large
    >
      <Text style={[ui.title, { fontSize: 28 }]}>Mais possibilidades.</Text>
      <Text style={ui.body}>
        Decida, sorteie e organize. Tudo no seu dispositivo.
      </Text>
      {onExplore && (
        <Button title="Explorar laboratório 3.0" primary onPress={onExplore} />
      )}
      <View
        style={{
          flexDirection: "row",
          backgroundColor: "#F1EEF8",
          padding: 4,
          borderRadius: 15,
          gap: 3,
        }}
      >
        {(
          [
            ["templates", "Modelos"],
            ["batch", "Em lote"],
            ["teams", "Equipes"],
          ] as const
        ).map(([key, title]) => (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityLabel={title}
            aria-selected={tab === key}
            onPress={() => setTab(key)}
            style={{
              flex: 1,
              alignItems: "center",
              paddingVertical: 12,
              borderRadius: 11,
              backgroundColor: tab === key ? "white" : "transparent",
            }}
          >
            <Text
              style={{
                fontWeight: "600",
                fontSize: 13,
                color: tab === key ? colors.purple : colors.muted,
              }}
            >
              {title}
            </Text>
          </Pressable>
        ))}
      </View>
      {tab === "templates" && (
        <View style={{ gap: 12 }}>
          {QUICK_TEMPLATES.map((t) => (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              accessibilityLabel={`Usar modelo ${t.title}`}
              onPress={async () => {
                if (
                  await ask(
                    `Usar ${t.title}?`,
                    "A configuração anterior desta modalidade será guardada nas predefinições antes de aplicar o modelo.",
                    "Usar modelo",
                  )
                ) {
                  try {
                    update((d) => applyTemplate(d, t));
                    onClose();
                  } catch (e) {
                    await ask("Não foi possível aplicar", (e as Error).message);
                  }
                }
              }}
              style={({ pressed }) => [
                ui.row,
                {
                  padding: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 20,
                  backgroundColor: pressed ? colors.lilac : "#FCFBFE",
                },
              ]}
            >
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 15,
                  backgroundColor: colors.lilac,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontWeight: "800",
                    fontSize: 17,
                    color: colors.purple,
                  }}
                >
                  {t.badge}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  style={{ fontWeight: "600", fontSize: 16, color: colors.ink }}
                >
                  {t.title}
                </Text>
                <Text style={[ui.body, { fontSize: 12, lineHeight: 18 }]}>
                  {t.description}
                </Text>
              </View>
              <Text style={{ color: colors.purple }}>→</Text>
            </Pressable>
          ))}
        </View>
      )}
      {tab === "batch" && (
        <View style={{ gap: 16 }}>
          <Text style={[ui.title, { fontSize: 23 }]}>
            Vários resultados, de uma vez
          </Text>
          <Text style={ui.body}>
            Usa as chances e a regra de repetição da roleta atual. Os resultados
            entram no histórico.
          </Text>
          <Field
            label="Quantidade de resultados"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
            maxLength={3}
          />
          <Button
            title="Sortear em lote"
            primary
            disabled={working || data.mode === "creator"}
            onPress={() => {
              void run(() =>
                update((d) => drawBatch(d, Number(quantity), randomWords)),
              );
            }}
          />
          {data.mode === "creator" && (
            <Text style={ui.body}>
              No criador, use giros individuais para preencher as fichas.
              Selecione outro modo para sortear em lote.
            </Text>
          )}
          {!!data.toolbox.batchResults.length && (
            <View style={{ gap: 12 }}>
              <View
                style={[
                  ui.row,
                  { justifyContent: "space-between", flexWrap: "wrap" },
                ]}
              >
                <Text style={ui.eyebrow}>
                  ÚLTIMO LOTE · {data.toolbox.batchResults.length}
                </Text>
                <Button
                  title="Compartilhar lote"
                  compact
                  icon="upload"
                  onPress={() => {
                    void share(
                      data.toolbox.batchResults
                        .map((v, i) => `${i + 1}. ${v}`)
                        .join("\n"),
                    );
                  }}
                />
              </View>
              {data.toolbox.batchResults.map((v, i) => (
                <View
                  key={i}
                  style={[
                    ui.row,
                    {
                      padding: 12,
                      backgroundColor: i % 2 ? "#FAF9FC" : colors.lilac,
                      borderRadius: 14,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: colors.purple,
                      fontWeight: "700",
                      width: 24,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </Text>
                  <Text
                    selectable
                    style={{ flex: 1, fontSize: 15, color: colors.ink }}
                  >
                    {v}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
      {tab === "teams" && (
        <View style={{ gap: 16 }}>
          <Text style={[ui.title, { fontSize: 23 }]}>Equipes equilibradas</Text>
          <Text style={ui.body}>
            Distribua sua lista aleatoriamente em grupos com tamanhos iguais ou
            diferença de uma pessoa. Cada entrada participa uma vez,
            independentemente dos pesos.
          </Text>
          <Text style={ui.chip}>
            {source.count.toLocaleString("pt-BR")} entradas na roleta atual
          </Text>
          <Field
            label="Quantidade de equipes"
            value={teamCount}
            onChangeText={setTeamCount}
            keyboardType="number-pad"
            maxLength={2}
          />
          <Button
            title="Formar equipes"
            primary
            disabled={working}
            onPress={() => {
              void run(() => {
                if (data.mode === "numbers" || data.mode === "percentage")
                  throw new Error(
                    "Selecione Palavras, Poderes ou Criador para usar uma lista de participantes.",
                  );
                const teams = balancedTeams(
                  data.lists[data.mode],
                  Number(teamCount),
                  randomWords,
                );
                update((d) => ({
                  ...d,
                  toolbox: {
                    ...d.toolbox,
                    teams,
                    generatedAt: new Date().toISOString(),
                  },
                }));
              });
            }}
          />
          {!!data.toolbox.teams.length && (
            <View style={{ gap: 14 }}>
              <Button
                title="Compartilhar equipes"
                icon="upload"
                onPress={() => {
                  void share(
                    data.toolbox.teams
                      .map((t, i) => `Equipe ${i + 1}\n${t.join("\n")}`)
                      .join("\n\n"),
                  );
                }}
              />
              {data.toolbox.teams.map((team, i) => (
                <TeamCard
                  key={`${data.toolbox.generatedAt}-${i}`}
                  team={team}
                  index={i}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </Sheet>
  );
}

function TeamCard({ team, index }: { team: string[]; index: number }) {
  const [page, setPage] = useState(0);
  const start = page * 20;
  const pages = Math.ceil(team.length / 20);
  return (
    <View
      style={{
        borderRadius: 19,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: "hidden",
      }}
    >
      <View style={{ padding: 14, backgroundColor: colors.lilac }}>
        <Text style={{ color: colors.purple, fontWeight: "700" }}>
          Equipe {index + 1} · {team.length} participantes
        </Text>
      </View>
      <View style={{ padding: 14, gap: 8 }}>
        {team.slice(start, start + 20).map((name, j) => (
          <Text selectable key={j} style={{ color: colors.ink, fontSize: 14 }}>
            {name}
          </Text>
        ))}
        {pages > 1 && (
          <View
            style={[
              ui.row,
              { justifyContent: "space-between", flexWrap: "wrap" },
            ]}
          >
            <Button
              title={`Anterior · equipe ${index + 1}`}
              compact
              disabled={!page}
              onPress={() => setPage(page - 1)}
            />
            <Text style={ui.body}>
              {page + 1}/{pages}
            </Text>
            <Button
              title={`Próxima · equipe ${index + 1}`}
              compact
              disabled={page === pages - 1}
              onPress={() => setPage(page + 1)}
            />
          </View>
        )}
      </View>
    </View>
  );
}
