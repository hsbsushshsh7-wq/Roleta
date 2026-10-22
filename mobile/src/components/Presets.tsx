import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useApp } from "../state/AppProvider";
import {
  savePreset,
  loadPreset,
  removePreset,
  describePreset,
} from "../engine/presets";
import { MODE_INFO } from "../data/defaults";
import { Button, IconButton, Sheet } from "./Primitives";
import { Icon } from "./Icon";
import { useDialog } from "./Dialog";
import { colors, ui } from "../theme/theme";
export function Presets({
  visible,
  onClose,
  onLoaded,
}: {
  visible: boolean;
  onClose: () => void;
  onLoaded: (name: string) => void;
}) {
  const { data, update, save } = useApp();
  const ask = useDialog();
  const [name, setName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const create = async () => {
    if (working) return;
    const existing = data.presets.find(
      (p) =>
        p.name.toLocaleLowerCase("pt-BR") ===
        name.trim().toLocaleLowerCase("pt-BR"),
    );
    if (
      existing &&
      !(await ask(
        "Substituir predefinição?",
        `“${existing.name}” já existe. A configuração salva será substituída.`,
        "Substituir",
      ))
    )
      return;
    setWorking(true);
    try {
      update((d) => savePreset(d, name, existing?.id));
      await save();
      setNotice("Predefinição salva neste dispositivo.");
      setName("");
    } catch (e) {
      await ask("Não foi possível salvar", (e as Error).message);
    } finally {
      setWorking(false);
    }
  };
  return (
    <Sheet visible={visible} title="SUAS ROLETAS" onClose={onClose} large>
      <Text style={[ui.title, { fontSize: 27, marginTop: -4 }]}>
        Predefinições
      </Text>
      <View style={{ gap: 10, marginTop: 8 }}>
        <Text style={[ui.label, { fontWeight: "600" }]}>
          Nome da predefinição
        </Text>
        <View style={[ui.row, { gap: 8 }]}>
          <TextInput
            accessibilityLabel="Nome da predefinição"
            value={name}
            onChangeText={setName}
            maxLength={80}
            placeholder="Ex.: Sorteio da janta"
            placeholderTextColor="#9A96A2"
            style={[
              ui.input,
              { flex: 1, fontSize: 15, backgroundColor: "white" },
            ]}
            editable={!working}
            returnKeyType="done"
            onSubmitEditing={() => {
              void create();
            }}
          />
          <Button
            title="Salvar"
            primary
            disabled={working || !name.trim()}
            onPress={() => {
              void create();
            }}
          />
        </View>
      </View>
      {notice && (
        <Text
          accessibilityLiveRegion="polite"
          style={{ fontSize: 13, color: colors.purple }}
        >
          {notice}
        </Text>
      )}
      <View style={[ui.divider, { marginTop: 14, marginBottom: 4 }]} />
      <View style={[ui.row, { justifyContent: "space-between" }]}>
        <Text style={ui.body}>Salvas neste dispositivo</Text>
        <Text style={ui.chip}>{data.presets.length}</Text>
      </View>
      {!data.presets.length && (
        <Text style={ui.body}>
          Nenhuma predefinição salva. Dê um nome à roleta atual para guardá-la
          aqui.
        </Text>
      )}
      <View style={{ gap: 8 }}>
        {data.presets.map((p) => (
          <View key={p.id} style={[ui.row, { gap: 7, alignItems: "stretch" }]}>
            <Pressable
              disabled={working}
              accessibilityRole="button"
              accessibilityLabel={`Carregar ${p.name}`}
              onPress={() => {
                update((d) => loadPreset(d, p.id));
                onLoaded(p.name);
                onClose();
              }}
              style={({ pressed }) => [
                ui.row,
                {
                  flex: 1,
                  minHeight: 65,
                  padding: 10,
                  borderRadius: 17,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: pressed ? colors.lilac : "#FAF9FC",
                  gap: 9,
                },
              ]}
            >
              <View
                style={{
                  height: 37,
                  width: 37,
                  borderRadius: 11,
                  borderColor: colors.border,
                  borderWidth: 1,
                  backgroundColor: "white",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: colors.purple,
                    fontSize: 12,
                    fontWeight: "800",
                  }}
                >
                  {MODE_INFO[p.config.mode].icon}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  style={{ color: colors.ink, fontSize: 15, fontWeight: "600" }}
                >
                  {p.name}
                </Text>
                <Text style={[ui.body, { fontSize: 11, lineHeight: 16 }]}>
                  {describePreset(p)}
                </Text>
              </View>
              <Icon name="chevron" size={17} color={colors.ink} />
            </Pressable>
            <View style={{ justifyContent: "center" }}>
              <IconButton
                name="trash"
                label={`Excluir ${p.name}`}
                disabled={working}
                onPress={async () => {
                  if (
                    await ask(
                      "Excluir predefinição?",
                      `Excluir “${p.name}”? A roleta carregada e as outras predefinições serão preservadas.`,
                      "Excluir",
                    )
                  ) {
                    update((d) => removePreset(d, p.id));
                    setNotice("Predefinição excluída.");
                  }
                }}
              />
            </View>
          </View>
        ))}
      </View>
    </Sheet>
  );
}
