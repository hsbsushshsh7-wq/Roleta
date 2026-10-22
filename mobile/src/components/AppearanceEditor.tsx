import React, { useState } from "react";
import { Text, View, Pressable, TextInput, Switch } from "react-native";
import { useApp } from "../state/AppProvider";
import { useOptionPage } from "../hooks/useOptionPage";
import { PALETTES, sliceColor, normalizeHex } from "../engine/appearance";
import type { WheelAppearance } from "../models/types";
import { Field, Button, IconButton } from "./Primitives";
import { OptionPagination } from "./OptionPagination";
import { colors, ui } from "../theme/theme";
function ColorField({
  value,
  label,
  onChange,
}: {
  value: string;
  label: string;
  onChange: (s: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [focus, setFocus] = useState(false);
  const [applied, setApplied] = useState(value);
  const [error, setError] = useState(false);
  if (!focus && value !== applied) {
    setApplied(value);
    setDraft(value);
  }
  return (
    <View style={{ width: 102, gap: 3 }}>
      <TextInput
        accessibilityLabel={label}
        value={draft}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={7}
        selectTextOnFocus
        onFocus={() => setFocus(true)}
        onChangeText={(s) => {
          setDraft(s);
          setError(false);
          if (s.replace("#", "").length === 6) {
            const hex = normalizeHex(s);
            if (hex) onChange(hex);
          }
        }}
        onBlur={() => {
          const hex = normalizeHex(draft);
          if (hex) {
            onChange(hex);
            setDraft(hex);
          } else {
            setError(true);
            setDraft(value);
          }
          setFocus(false);
          setApplied(value);
        }}
        style={[
          ui.input,
          {
            fontSize: 13,
            minHeight: 44,
            paddingVertical: 10,
            paddingHorizontal: 9,
            fontWeight: "600",
            fontFamily: "monospace",
            backgroundColor: "white",
          },
        ]}
      />
      {error && (
        <Text style={{ fontSize: 10, color: colors.red }}>
          Use HEX: #A855F7
        </Text>
      )}
    </View>
  );
}
export function AppearanceEditor() {
  const { data, update } = useApp();
  const p = useOptionPage(data);
  const appearance = data.rules[data.mode].appearance;
  const change = (patch: Partial<WheelAppearance>) =>
    update((d) => ({
      ...d,
      rules: {
        ...d.rules,
        [d.mode]: {
          ...d.rules[d.mode],
          appearance: { ...d.rules[d.mode].appearance, ...patch },
        },
      },
    }));
  const custom = (index: number, hex: string | null) =>
    update((d) => {
      const current = d.rules[d.mode];
      const overrides = { ...current.appearance.overrides };
      if (hex) overrides[index] = hex;
      else delete overrides[index];
      return {
        ...d,
        rules: {
          ...d.rules,
          [d.mode]: {
            ...current,
            appearance: { ...current.appearance, overrides },
          },
        },
      };
    });
  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 6 }}>
        <Text style={ui.eyebrow}>SEU ESTILO, SUA ROLETA</Text>
        <Text style={[ui.title, { fontSize: 24 }]}>Cores e identidade</Text>
      </View>
      <Field
        label="Título da roleta"
        placeholder="Ex.: Quem vai primeiro?"
        value={appearance.title}
        onChangeText={(title) => change({ title })}
        maxLength={80}
        style={{ fontSize: 16 }}
      />
      <Text style={ui.label}>Paleta de cores</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {Object.entries(PALETTES).map(([id, palette]) => (
          <Pressable
            key={id}
            accessibilityRole="radio"
            accessibilityLabel={`Paleta ${palette.name}`}
            aria-checked={appearance.palette === id}
            accessibilityState={{ selected: appearance.palette === id }}
            onPress={() =>
              change({ palette: id as WheelAppearance["palette"] })
            }
            style={({ pressed }) => ({
              width: "47%",
              padding: 13,
              gap: 10,
              borderRadius: 17,
              borderWidth: 1,
              borderColor:
                appearance.palette === id ? colors.purple : colors.border,
              backgroundColor:
                appearance.palette === id ? colors.lilac : "white",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View style={{ flexDirection: "row", gap: 3 }}>
              {palette.colors.slice(0, 6).map((c, i) => (
                <View
                  key={i}
                  style={{
                    backgroundColor: c,
                    flex: 1,
                    height: 18,
                    borderRadius: 5,
                  }}
                />
              ))}
            </View>
            <Text
              style={{ fontSize: 13, color: colors.ink, fontWeight: "600" }}
            >
              {palette.name}
              {appearance.palette === id ? " ✓" : ""}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={[ui.row, { justifyContent: "space-between" }]}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={ui.label}>Mostrar nomes nas fatias</Text>
          <Text style={[ui.body, { fontSize: 12 }]}>
            Ocultar dá mais suspense ao sorteio.
          </Text>
        </View>
        <Switch
          accessibilityLabel="Mostrar nomes nas fatias"
          value={appearance.showLabels}
          onValueChange={(showLabels) => change({ showLabels })}
          trackColor={{ false: "#D9D5E3", true: "#9A86EF" }}
          thumbColor="white"
        />
      </View>
      <View style={ui.divider} />
      <View style={[ui.row, { justifyContent: "space-between" }]}>
        <Text style={[ui.title, { fontSize: 21, flex: 1 }]}>Cor por fatia</Text>
        <Button
          title="Usar paleta"
          compact
          disabled={!Object.keys(appearance.overrides).length}
          onPress={() => change({ overrides: {} })}
        />
      </View>
      <Text style={[ui.body, { fontSize: 12 }]}>
        Digite uma cor HEX, como #A855F7. As cores manuais ficam salvas nas
        predefinições e têm prioridade sobre a paleta.
      </Text>
      {!!p.source.count && (
        <Field
          label="Buscar opção por cor"
          placeholder="Nome ou número exato"
          value={p.query}
          onChangeText={p.setQuery}
          style={{ fontSize: 14 }}
        />
      )}
      {p.indices.map((i) => {
        const name = p.source.label(i);
        const color = sliceColor(i, p.source.count, appearance);
        return (
          <View key={`${data.mode}-${i}`} style={[ui.row, { gap: 8 }]}>
            <View
              style={{
                width: 22,
                height: 32,
                borderRadius: 8,
                backgroundColor: color,
                borderWidth: 1,
                borderColor: "#00000010",
              }}
            />
            <Text
              style={{ flex: 1, fontSize: 13, color: colors.ink }}
              numberOfLines={2}
            >
              {name}
            </Text>
            <ColorField
              label={`Cor de ${name}, opção ${i + 1}`}
              value={color}
              onChange={(hex) => custom(i, hex)}
            />
            <IconButton
              name="spin"
              label={`Restaurar cor de ${name}`}
              disabled={!appearance.overrides[i]}
              onPress={() => custom(i, null)}
            />
          </View>
        );
      })}
      {!p.count && <Text style={ui.body}>Nenhuma opção para editar.</Text>}
      <OptionPagination
        count={p.count}
        start={p.start}
        length={p.indices.length}
        current={p.current}
        pages={p.pages}
        onPage={p.setPage}
      />
      {p.source.count > 720 && (
        <Text style={[ui.body, { fontSize: 12 }]}>
          Acima de 720 opções, fatias são agrupadas na tela. A última cor
          personalizada de cada grupo colore esse grupo; as chances continuam
          individuais.
        </Text>
      )}
    </View>
  );
}
