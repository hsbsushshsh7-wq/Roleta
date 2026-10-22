import React, { useState } from "react";
import { Pressable, Text, View, Switch } from "react-native";
import { useApp } from "../state/AppProvider";
import { Button, Sheet } from "./Primitives";
import { Icon } from "./Icon";
import { ChanceEditor } from "./ChanceEditor";
import { AppearanceEditor } from "./AppearanceEditor";
import { colors, ui } from "../theme/theme";
export function RouletteSettings({
  visible,
  onClose,
  onPreferences,
}: {
  visible: boolean;
  onClose: () => void;
  onPreferences: () => void;
}) {
  const { data, update } = useApp();
  const rules = data.rules[data.mode];
  const [tab, setTab] = useState<"draw" | "visual" | "experience">("draw");
  return (
    <Sheet visible={visible} title="CONFIGURAÇÕES" onClose={onClose} large>
      <View style={{ gap: 7 }}>
        <Text style={[ui.title, { fontSize: 29 }]}>Estúdio da roleta</Text>
        <Text style={ui.body}>Ajuste cada detalhe do seu próximo giro.</Text>
      </View>
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
            ["draw", "Sorteio"],
            ["visual", "Visual"],
            ["experience", "Experiência"],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityLabel={label}
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
                fontSize: 12,
                fontWeight: "600",
                color: tab === key ? colors.purple : colors.muted,
              }}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      {tab === "draw" && (
        <View style={{ gap: 16 }}>
          {(
            [
              [
                "chance",
                "Chances independentes",
                "Defina pesos sem alterar os outros valores.",
              ],
              [
                "noRepeat",
                "Não repetir",
                "Bloqueie as opções que já foram sorteadas.",
              ],
            ] as const
          ).map(([key, title, description]) => (
            <Pressable
              key={key}
              accessibilityRole="checkbox"
              accessibilityLabel={key === "chance" ? "chance" : "não repetir"}
              accessibilityState={{ checked: rules[key] }}
              aria-checked={rules[key]}
              onPress={() =>
                update((d) => ({
                  ...d,
                  rules: {
                    ...d.rules,
                    [d.mode]: {
                      ...d.rules[d.mode],
                      [key]: !d.rules[d.mode][key],
                    },
                  },
                }))
              }
              style={({ pressed }) => [
                ui.row,
                {
                  minHeight: 80,
                  borderWidth: 1,
                  borderColor: rules[key] ? "#D8CFEE" : colors.border,
                  backgroundColor: rules[key]
                    ? colors.lilac
                    : pressed
                      ? "#F1EEF7"
                      : "#FAF9FC",
                  borderRadius: 20,
                  padding: 15,
                  gap: 14,
                },
              ]}
            >
              <View
                style={{
                  width: 23,
                  height: 23,
                  borderRadius: 7,
                  borderWidth: 1,
                  borderColor: rules[key] ? colors.purple : "#B6B0BF",
                  backgroundColor: rules[key] ? colors.purple : "white",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {rules[key] && <Icon name="check" color="white" size={19} />}
              </View>
              <View style={{ flex: 1, gap: 5 }}>
                <Text
                  style={{ fontSize: 16, fontWeight: "600", color: colors.ink }}
                >
                  {title}
                </Text>
                <Text style={[ui.body, { fontSize: 12, lineHeight: 18 }]}>
                  {description}
                </Text>
              </View>
            </Pressable>
          ))}
          {rules.chance ? (
            <ChanceEditor />
          ) : (
            <Text style={[ui.body, { fontSize: 12 }]}>
              Todas as opções têm chances iguais. Ative chances independentes
              para definir suas proporções.
            </Text>
          )}
        </View>
      )}
      {tab === "visual" && <AppearanceEditor />}
      {tab === "experience" && (
        <View style={{ gap: 20 }}>
          <Text style={[ui.title, { fontSize: 23 }]}>No seu ritmo</Text>
          {(
            [
              [
                "resultPopup",
                "Pop-up de resultado",
                "Destaque o vencedor ao terminar cada giro.",
              ],
              [
                "sound",
                "Som do resultado",
                "Um sinal sonoro ao revelar a escolha.",
              ],
              ["haptics", "Vibração", "Feedback suave no início e no fim."],
            ] as const
          ).map(([key, label, description]) => (
            <View
              key={key}
              style={[ui.row, { justifyContent: "space-between" }]}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={ui.label}>{label}</Text>
                <Text style={[ui.body, { fontSize: 12 }]}>{description}</Text>
              </View>
              <Switch
                accessibilityLabel={label}
                value={data.preferences[key]}
                onValueChange={(v) =>
                  update((d) => ({
                    ...d,
                    preferences: { ...d.preferences, [key]: v },
                  }))
                }
                trackColor={{ false: "#D9D5E3", true: "#9A86EF" }}
                thumbColor="white"
              />
            </View>
          ))}
          <Text style={ui.label}>Tempo de giro</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 9 }}>
            {[2000, 4600, 7000, 10000].map((duration) => (
              <Pressable
                key={duration}
                accessibilityRole="radio"
                accessibilityLabel={`Duração ${duration / 1000} segundos`}
                aria-checked={data.preferences.duration === duration}
                onPress={() =>
                  update((d) => ({
                    ...d,
                    preferences: { ...d.preferences, duration },
                  }))
                }
                style={{
                  padding: 13,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor:
                    data.preferences.duration === duration
                      ? colors.purple
                      : colors.border,
                  backgroundColor:
                    data.preferences.duration === duration
                      ? colors.lilac
                      : "white",
                }}
              >
                <Text style={{ color: colors.purple, fontWeight: "600" }}>
                  {duration / 1000} s
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={[ui.body, { fontSize: 12 }]}>
            O modo de movimento reduzido do celular tem prioridade sobre a
            duração escolhida.
          </Text>
        </View>
      )}
      <View style={ui.divider} />
      <Button
        title="Preferências e backups"
        compact
        icon="settings"
        onPress={onPreferences}
      />
    </Sheet>
  );
}
