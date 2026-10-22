import React, { useState } from "react";
import { Text, View, Switch, Pressable } from "react-native";
import { useApp } from "../state/AppProvider";
import { Button, Info, Sheet } from "./Primitives";
import { useDialog } from "./Dialog";
import { exportData, importData } from "../services/transfer";
import { colors, ui } from "../theme/theme";
export function Settings({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { data, update, replace, savedAt } = useApp();
  const ask = useDialog();
  const [working, setWorking] = useState(false);
  const toggle = (
    key: "sound" | "haptics" | "repeat" | "resultPopup",
    value: boolean,
  ) =>
    update((d) => ({
      ...d,
      preferences: { ...d.preferences, [key]: value },
      ...(key === "repeat"
        ? {
            rules: {
              ...d.rules,
              [d.mode]: { ...d.rules[d.mode], noRepeat: !value },
            },
          }
        : {}),
    }));
  const transfer = async (kind: "export" | "import") => {
    setWorking(true);
    try {
      if (kind === "export") await exportData(data);
      else {
        const imported = await importData();
        if (
          imported &&
          (await ask(
            "Importar backup?",
            `O arquivo contém ${imported.characters.length} ficha(s), ${imported.lists.creator.length} personagens no elenco e ${imported.lists.powers.length} poderes. Os dados atuais serão substituídos. Exporte-os antes se quiser preservá-los.`,
            "Importar dados",
          ))
        )
          await replace(imported);
      }
    } catch (e) {
      await ask("Falha na transferência", (e as Error).message);
    } finally {
      setWorking(false);
    }
  };
  return (
    <Sheet
      visible={visible}
      title="PREFERÊNCIAS"
      onClose={() => {
        if (!working) onClose();
      }}
      large
    >
      {(
        [
          [
            "resultPopup",
            "Pop-up de resultado",
            "Destaque o resultado ao terminar o giro.",
          ],
          ["sound", "Som do resultado", "Um sinal sonoro ao terminar o giro."],
          ["haptics", "Vibração", "Feedback suave no início e no resultado."],
          [
            "repeat",
            "Permitir repetição",
            "Quando desativado, bloqueia todas as opções já sorteadas até RESET.",
          ],
        ] as const
      ).map(([key, title, description]) => (
        <View
          key={key}
          style={[
            ui.row,
            { justifyContent: "space-between", paddingVertical: 8 },
          ]}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: colors.ink, fontSize: 16 }}>{title}</Text>
            <Text style={[ui.body, { fontSize: 12 }]}>{description}</Text>
          </View>
          <Switch
            accessibilityLabel={title}
            value={
              key === "repeat"
                ? !data.rules[data.mode].noRepeat
                : data.preferences[key]
            }
            onValueChange={(v) => toggle(key, v)}
            trackColor={{ false: "#D9D5E3", true: "#9A86EF" }}
            thumbColor="white"
          />
        </View>
      ))}
      <View style={ui.divider} />
      <Text style={ui.label}>Duração da animação</Text>
      <View style={[ui.row, { flexWrap: "wrap" }]}>
        {[2000, 4600, 7000].map((duration) => (
          <Pressable
            key={duration}
            accessibilityRole="radio"
            accessibilityState={{
              selected: data.preferences.duration === duration,
            }}
            accessibilityLabel={`${duration / 1000} segundos`}
            onPress={() =>
              update((d) => ({
                ...d,
                preferences: { ...d.preferences, duration },
              }))
            }
            style={{
              borderWidth: 1,
              borderColor:
                data.preferences.duration === duration
                  ? "#B2A3E8"
                  : colors.border,
              backgroundColor:
                data.preferences.duration === duration ? colors.lilac : "white",
              padding: 13,
              borderRadius: 14,
            }}
          >
            <Text style={{ color: colors.purple }}>{duration / 1000} s</Text>
          </Pressable>
        ))}
      </View>
      <Text style={ui.label}>Aparência</Text>
      <View style={ui.row}>
        {(["soft", "neutral"] as const).map((appearance) => (
          <Pressable
            key={appearance}
            accessibilityRole="radio"
            accessibilityState={{
              selected: data.preferences.appearance === appearance,
            }}
            onPress={() =>
              update((d) => ({
                ...d,
                preferences: { ...d.preferences, appearance },
              }))
            }
            style={{
              padding: 13,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor:
                data.preferences.appearance === appearance
                  ? colors.lilac
                  : "white",
            }}
          >
            <Text style={{ color: colors.purple }}>
              {appearance === "soft" ? "Gradientes suaves" : "Fundo neutro"}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={ui.divider} />
      <Text style={ui.eyebrow}>SEUS DADOS</Text>
      <Info>
        Salvamento automático no dispositivo. O backup JSON inclui todas as
        modalidades, fichas, listas, predefinições, chances, preferências e os
        últimos 200 giros.
      </Info>
      <Button
        title={working ? "Aguarde…" : "Exportar backup JSON"}
        icon="download"
        disabled={working}
        onPress={() => {
          void transfer("export");
        }}
      />
      <Button
        title="Importar backup JSON"
        icon="upload"
        disabled={working}
        onPress={() => {
          void transfer("import");
        }}
      />
      {savedAt && (
        <Text style={[ui.body, { fontSize: 12 }]}>
          Salvo às {new Date(savedAt).toLocaleTimeString("pt-BR")}.
        </Text>
      )}
      <Text style={[ui.body, { fontSize: 12 }]}>
        Roleta · versão 3.0.0 em desenvolvimento. Funciona offline. Os dados não
        são enviados a servidores. A precisão original dos percentuais, as
        listas completas e a nona categoria dependem do acesso à fonte do site.
      </Text>
    </Sheet>
  );
}
