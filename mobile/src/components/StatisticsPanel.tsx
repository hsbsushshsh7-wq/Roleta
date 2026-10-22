import React, { useMemo, useState } from "react";
import { Pressable, Share, Text, View } from "react-native";
import { useApp } from "../state/AppProvider";
import { MODE_INFO } from "../data/defaults";
import {
  filterHistory,
  historyCsv,
  summarizeHistory,
} from "../engine/statistics";
import { Button, Sheet } from "./Primitives";
import { useDialog } from "./Dialog";
import { colors, ui } from "../theme/theme";

function Choice<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly { value: T; title: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          accessibilityRole="button"
          accessibilityLabel={option.title}
          accessibilityState={{ selected: value === option.value }}
          onPress={() => onChange(option.value)}
          style={({ pressed }) => ({
            paddingHorizontal: 13,
            paddingVertical: 12,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: value === option.value ? "#C8BDF2" : colors.border,
            backgroundColor: value === option.value ? colors.lilac : "white",
            opacity: pressed ? 0.65 : 1,
          })}
        >
          <Text
            style={{
              color: value === option.value ? colors.purple : colors.muted,
              fontSize: 12,
              fontWeight: "600",
            }}
          >
            {option.title}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function StatisticsPanel({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { data } = useApp();
  const ask = useDialog();
  const [scope, setScope] = useState<"session" | "mode" | "all">("session");
  const [kind, setKind] = useState<"all" | "wheel" | "batch">("all");
  const draws = useMemo(
    () =>
      filterHistory(data.history, {
        mode: scope === "all" ? "all" : data.mode,
        sessionId:
          scope === "session" ? data.rules[data.mode].sessionId : undefined,
        kind,
      }),
    [data.history, data.mode, data.rules, scope, kind],
  );
  const summary = useMemo(() => summarizeHistory(draws), [draws]);
  return (
    <Sheet visible={visible} title="ESTATÍSTICAS" onClose={onClose} large>
      <Text style={[ui.title, { fontSize: 28 }]}>Cada giro conta.</Text>
      <Text style={ui.body}>
        Explore os resultados salvos. Roleta atual: {MODE_INFO[data.mode].title}
        .
      </Text>
      <Choice
        value={scope}
        onChange={setScope}
        options={
          [
            { value: "session", title: "Sessão atual" },
            { value: "mode", title: "Modalidade atual" },
            { value: "all", title: "Todas as modalidades" },
          ] as const
        }
      />
      <Choice
        value={kind}
        onChange={setKind}
        options={
          [
            { value: "all", title: "Todos os sorteios" },
            { value: "wheel", title: "Giros individuais" },
            { value: "batch", title: "Somente lotes" },
          ] as const
        }
      />
      <View style={{ flexDirection: "row", gap: 10 }}>
        {[
          { value: summary.total, label: "SORTEIOS" },
          { value: summary.distinct, label: "OPÇÕES VISTAS" },
        ].map((metric) => (
          <View
            key={metric.label}
            style={{
              flex: 1,
              padding: 18,
              gap: 7,
              backgroundColor: colors.lilac,
              borderRadius: 20,
            }}
          >
            <Text
              style={{ color: colors.purple, fontWeight: "700", fontSize: 30 }}
            >
              {metric.value}
            </Text>
            <Text
              style={{
                color: "#7F729E",
                fontWeight: "600",
                fontSize: 10,
                letterSpacing: 1,
              }}
            >
              {metric.label}
            </Text>
          </View>
        ))}
      </View>
      {!summary.total ? (
        <View
          style={{
            padding: 20,
            borderRadius: 20,
            backgroundColor: "#F7F5FA",
            gap: 8,
          }}
        >
          <Text style={[ui.title, { fontSize: 20 }]}>
            Ainda sem resultados neste filtro
          </Text>
          <Text style={ui.body}>
            Faça um giro, sorteie um lote ou escolha outro período acima.
          </Text>
        </View>
      ) : (
        <>
          <View
            style={{
              padding: 18,
              gap: 8,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 20,
            }}
          >
            <Text style={ui.eyebrow}>MAIOR FREQUÊNCIA</Text>
            <Text selectable style={[ui.title, { fontSize: 23 }]}>
              {summary.top?.value}
            </Text>
            <Text style={ui.body}>
              {summary.top?.count} ocorrência(s) ·{" "}
              {summary.top?.frequency.toLocaleString("pt-BR", {
                maximumFractionDigits: 1,
              })}
              % dos resultados filtrados
              {summary.tiedTop > 1
                ? ` · empate entre ${summary.tiedTop} opções`
                : ""}
            </Text>
          </View>
          <View
            style={[
              ui.row,
              { justifyContent: "space-between", flexWrap: "wrap" },
            ]}
          >
            <Text style={ui.eyebrow}>FREQUÊNCIA OBSERVADA</Text>
            <Text style={[ui.body, { fontSize: 11 }]}>Até 20 opções</Text>
          </View>
          {summary.ranked.slice(0, 20).map((row, index) => (
            <View key={row.key} style={{ gap: 7, paddingVertical: 8 }}>
              <View
                style={[
                  ui.row,
                  { justifyContent: "space-between", alignItems: "flex-start" },
                ]}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text
                    selectable
                    style={{
                      color: colors.ink,
                      fontWeight: "600",
                      fontSize: 15,
                    }}
                  >
                    {index + 1}. {row.value}
                  </Text>
                  <Text style={[ui.body, { fontSize: 11, lineHeight: 16 }]}>
                    {MODE_INFO[row.mode].title} · opção {row.index + 1} ·{" "}
                    {row.sessionId === undefined
                      ? "sessão antiga não identificada"
                      : row.sessionId === data.rules[row.mode].sessionId
                        ? "sessão atual"
                        : `sessão ${row.sessionId.slice(-8) || "inicial"}`}
                  </Text>
                </View>
                <Text
                  style={{
                    fontWeight: "700",
                    color: colors.purple,
                    fontSize: 13,
                  }}
                >
                  {row.count} ·{" "}
                  {row.frequency.toLocaleString("pt-BR", {
                    maximumFractionDigits: 1,
                  })}
                  %
                </Text>
              </View>
              <View
                style={{
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: "#EEEAF5",
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: index === 0 ? colors.purple : "#B6A6EE",
                    width: `${row.frequency}%`,
                  }}
                />
              </View>
            </View>
          ))}
          <Button
            title="Compartilhar histórico em CSV"
            icon="upload"
            onPress={async () => {
              try {
                await Share.share({
                  title: "Histórico da Roleta (CSV)",
                  message: historyCsv(draws),
                });
              } catch (error) {
                await ask(
                  "Não foi possível compartilhar",
                  (error as Error).message,
                );
              }
            }}
          />
        </>
      )}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: 14,
          gap: 8,
        }}
      >
        <Text style={[ui.body, { fontSize: 12, lineHeight: 19 }]}>
          A análise usa somente os últimos 200 sorteios armazenados. Opções
          iguais de sessões diferentes e fatias com nomes repetidos são contadas
          separadamente. Registros antigos sem identificação de sessão
          permanecem separados.
        </Text>
        <Text style={[ui.body, { fontSize: 12, lineHeight: 19 }]}>
          As barras mostram o que já aconteceu, não a chance do próximo giro.
          Pesos e a opção de não repetir influenciam os resultados.
        </Text>
      </View>
    </Sheet>
  );
}
