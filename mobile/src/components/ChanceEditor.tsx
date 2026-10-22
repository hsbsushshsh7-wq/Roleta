import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useApp } from "../state/AppProvider";
import { changeChance, distributionTotal, optionWeight } from "../engine/rules";
import { chancePercent } from "../engine/weighted";
import { sliceColor } from "../engine/appearance";
import { useOptionPage } from "../hooks/useOptionPage";
import { Button, Field } from "./Primitives";
import { OptionPagination } from "./OptionPagination";
import { colors, ui } from "../theme/theme";
const format = (n: number) =>
  n.toLocaleString("pt-BR", { maximumFractionDigits: 4, useGrouping: false });
function WeightField({
  index,
  label,
  value,
  onChange,
}: {
  index: number;
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const [draft, setDraft] = useState(format(value));
  const [focused, setFocused] = useState(false);
  const [applied, setApplied] = useState(value);
  const [error, setError] = useState("");
  if (!focused && applied !== value) {
    setApplied(value);
    setDraft(format(value));
  }
  return (
    <View style={{ width: 105, gap: 4 }}>
      <TextInput
        accessibilityLabel={`Chance de ${label}, opção ${index + 1}`}
        value={draft}
        onFocus={() => {
          setFocused(true);
          setDraft(format(value));
        }}
        onBlur={() => {
          setFocused(false);
          setDraft(format(value));
          setApplied(value);
          setError("");
        }}
        onChangeText={(s) => {
          setDraft(s);
          const n = Number(s.replace(",", "."));
          if (!/^\d{1,10}(?:[.,]\d{0,4})?$/.test(s) || n > 1e9) {
            setError("Use 0 a 1 bilhão.");
            return;
          }
          try {
            onChange(n);
            setError("");
          } catch (e) {
            setError((e as Error).message);
          }
        }}
        keyboardType="decimal-pad"
        selectTextOnFocus
        maxLength={15}
        style={[
          ui.input,
          {
            minHeight: 46,
            paddingVertical: 10,
            paddingHorizontal: 10,
            fontSize: 16,
            fontWeight: "600",
            textAlign: "right",
            backgroundColor: "white",
            borderColor: focused ? colors.purple : colors.border,
          },
        ]}
      />
      {focused && !!error && (
        <Text style={{ fontSize: 10, color: colors.red }}>{error}</Text>
      )}
    </View>
  );
}
export function ChanceEditor() {
  const { data, update } = useApp();
  const p = useOptionPage(data);
  const rules = data.rules[data.mode];
  const total = distributionTotal(rules.distribution, p.source.count);
  return (
    <View style={{ gap: 16 }}>
      <View style={[ui.row, { justifyContent: "space-between" }]}>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={ui.eyebrow}>VOCÊ DEFINE A PROPORÇÃO</Text>
          <Text style={[ui.title, { fontSize: 23 }]}>
            Chances independentes
          </Text>
        </View>
        <Button
          title="Igualar"
          compact
          disabled={!p.source.count}
          onPress={() =>
            update((d) => ({
              ...d,
              rules: {
                ...d.rules,
                [d.mode]: {
                  ...d.rules[d.mode],
                  distribution: {
                    format: "relative",
                    base: 100,
                    overrides: {},
                  },
                },
              },
            }))
          }
        />
      </View>
      <View
        style={{
          backgroundColor: colors.lilac,
          borderRadius: 18,
          padding: 16,
          gap: 7,
        }}
      >
        <Text style={{ fontWeight: "700", color: colors.purple, fontSize: 15 }}>
          90 + 30 → 75% + 25%
        </Text>
        <Text
          style={[ui.body, { fontSize: 12, lineHeight: 19, color: "#76688C" }]}
        >
          Cada valor é um peso. Editar uma opção não muda as outras. A roleta
          calcula a chance real dividindo o peso pela soma de todos.
        </Text>
      </View>
      <View style={[ui.row, { justifyContent: "space-between" }]}>
        <Text style={ui.body}>Total dos pesos: {format(total)}</Text>
        <Text accessibilityLabel="Probabilidade total" style={ui.chip}>
          {p.source.count ? "100%" : "0%"}
        </Text>
      </View>
      {!!p.source.count && (
        <Field
          label="Buscar opção"
          value={p.query}
          onChangeText={p.setQuery}
          placeholder="Nome ou número exato"
          style={{ fontSize: 14 }}
        />
      )}
      <View style={[ui.row, { justifyContent: "space-between" }]}>
        <Text style={[ui.eyebrow, { fontSize: 10, color: colors.muted }]}>
          OPÇÃO / CHANCE REAL
        </Text>
        <Text style={[ui.eyebrow, { fontSize: 10, color: colors.muted }]}>
          PESO INFORMADO
        </Text>
      </View>
      {!p.count && (
        <Text style={ui.body}>
          {p.source.count
            ? "Nenhuma opção encontrada."
            : "Adicione opções à roleta para começar."}
        </Text>
      )}
      {p.indices.map((i) => {
        const label = p.source.label(i);
        const probability = chancePercent(i, rules, total);
        return (
          <View
            key={`${data.mode}-${i}`}
            style={[
              ui.row,
              {
                gap: 10,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={{
                width: 6,
                height: 36,
                borderRadius: 6,
                backgroundColor: sliceColor(
                  i,
                  p.source.count,
                  rules.appearance,
                ),
              }}
            />
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                numberOfLines={2}
                style={{ fontSize: 14, color: colors.ink, fontWeight: "500" }}
              >
                {label}
              </Text>
              <Text
                accessibilityLabel={`Chance real de ${label}, opção ${i + 1}`}
                style={{ fontSize: 12, color: colors.purple }}
              >
                {probability > 0 && probability < 0.0001
                  ? "< 0,0001"
                  : format(probability)}
                % real
              </Text>
            </View>
            <WeightField
              index={i}
              label={label}
              value={optionWeight(rules.distribution, i)}
              onChange={(weight) =>
                update((d) => ({
                  ...d,
                  rules: {
                    ...d.rules,
                    [d.mode]: {
                      ...d.rules[d.mode],
                      distribution: changeChance(
                        d.rules[d.mode].distribution,
                        p.source.count,
                        i,
                        weight,
                      ),
                    },
                  },
                }))
              }
            />
          </View>
        );
      })}
      <OptionPagination
        count={p.count}
        start={p.start}
        length={p.indices.length}
        current={p.current}
        pages={p.pages}
        onPage={p.setPage}
      />
      <Text style={[ui.body, { fontSize: 12 }]}>
        Peso 0 pausa uma opção. Mantenha pelo menos uma opção ativa. Com “não
        repetir”, as chances são recalculadas entre as opções que ainda podem
        sair.
      </Text>
    </View>
  );
}
