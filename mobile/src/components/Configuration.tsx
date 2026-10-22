import React, { useDeferredValue, useMemo, useState } from "react";
import { Text, TextInput, View, Platform } from "react-native";
import { VISIBLE_ROSTER } from "../data/defaults";
import { useApp } from "../state/AppProvider";
import { useDialog } from "./Dialog";
import { Button, Card, CardTitle, Field, Info } from "./Primitives";
import { parseList, rangeCount } from "../engine/options";
import { ui } from "../theme/theme";
export function Configuration({
  busy,
  onSpin,
}: {
  busy: boolean;
  onSpin: () => void;
}) {
  const { data, update, save } = useApp();
  const ask = useDialog();
  const mode = data.mode;
  const numeric = mode === "numbers" || mode === "percentage";
  const current = numeric ? data.ranges[mode] : null;
  const list = numeric ? null : data.lists[mode];
  const [min, setMin] = useState(String(current?.min ?? ""));
  const [max, setMax] = useState(String(current?.max ?? ""));
  const [step, setStep] = useState(String(current?.step ?? 1));
  const [text, setText] = useState(list?.join(",\n") ?? "");
  const [applied, setApplied] = useState({ mode, current, list });
  if (
    applied.mode !== mode ||
    applied.current !== current ||
    applied.list !== list
  ) {
    setApplied({ mode, current, list });
    setMin(String(current?.min ?? ""));
    setMax(String(current?.max ?? ""));
    setStep(String(current?.step ?? 1));
    setText(list?.join(",\n") ?? "");
  }
  const deferredText = useDeferredValue(text);
  const count = useMemo(() => {
    try {
      return parseList(deferredText).length;
    } catch {
      return null;
    }
  }, [deferredText]);
  const title = numeric
    ? "Editar intervalo"
    : mode === "creator"
      ? "Editar elenco"
      : mode === "powers"
        ? "Editar poderes"
        : "Editar palavras";
  const apply = () => {
    let successMessage = "O intervalo já está disponível na roleta.";
    try {
      if (numeric) {
        if (
          ![min, max, ...(mode === "percentage" ? [step] : [])].every((s) =>
            /^-?\d+(?:[.,]\d+)?$/.test(s.trim()),
          )
        )
          throw new Error("Preencha os campos com números válidos.");
        const range = {
          min: Number(min.replace(",", ".")),
          max: Number(max.replace(",", ".")),
          step: mode === "numbers" ? 1 : Number(step.replace(",", ".")),
        };
        rangeCount(range, mode === "percentage");
        update((d) => ({ ...d, ranges: { ...d.ranges, [mode]: range } }));
      } else {
        const items = parseList(text);
        if (!items.length)
          throw new Error("Adicione pelo menos uma opção antes de atualizar.");
        update((d) => ({ ...d, lists: { ...d.lists, [mode]: items } }));
        successMessage = `${items.length} opções disponíveis na roleta.`;
      }
      void save()
        .then(() => ask("Configuração salva", successMessage))
        .catch(() =>
          ask("Falha ao salvar", "Tente novamente pelo botão de salvamento."),
        );
    } catch (e) {
      void ask("Confira a configuração", (e as Error).message);
    }
  };
  const restore = async (kind: "powers" | "creator") => {
    if (!data.defaults[kind].length) {
      await ask(
        "Lista original indisponível",
        "O site exige login e sua lista padrão não pôde ser recuperada. Cole a lista original abaixo e use “Definir como padrão” para guardá-la.",
      );
      return;
    }
    if (
      await ask(
        "Restaurar lista?",
        "A lista editada será substituída pelo padrão salvo neste dispositivo.",
        "Restaurar",
      )
    )
      update((d) => ({
        ...d,
        lists: { ...d.lists, [kind]: [...d.defaults[kind]] },
      }));
  };
  return (
    <Card>
      <CardTitle title={title} />
      {numeric ? (
        <>
          <View style={[ui.row, { alignItems: "flex-end" }]}>
            <Field
              label="Começa em"
              value={min}
              onChangeText={setMin}
              editable={!busy}
              keyboardType={
                Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric"
              }
              maxLength={18}
            />
            <Text style={{ color: "#ACABB5", fontSize: 24, marginBottom: 14 }}>
              →
            </Text>
            <Field
              label="Termina em"
              value={max}
              onChangeText={setMax}
              editable={!busy}
              keyboardType={
                Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric"
              }
              maxLength={18}
            />
          </View>
          {mode === "percentage" && (
            <>
              <Field
                label="Passo (%)"
                value={step}
                onChangeText={setStep}
                editable={!busy}
                keyboardType="decimal-pad"
              />
              <Text style={ui.body}>
                Padrão desta versão: 1%. A granularidade original aguarda acesso
                ao código-fonte.
              </Text>
            </>
          )}
        </>
      ) : (
        <>
          <Text style={ui.label}>
            {mode === "creator"
              ? "Lista de personagens de anime"
              : mode === "powers"
                ? "Lista de habilidades e poderes de anime"
                : "Palavras ou frases para sortear"}
          </Text>
          {mode === "creator" &&
            list?.length === VISIBLE_ROSTER.length &&
            list.every((item, i) => item === VISIBLE_ROSTER[i]) && (
              <Info>
                Elenco parcial: apenas os 9 nomes legíveis na referência.
                Importe ou cole os 400 nomes originais para completar.
              </Info>
            )}
          {mode === "powers" &&
            !data.defaults.powers.length &&
            !list?.length && (
              <Info>
                A lista original de poderes está pendente de acesso à fonte.
                Cole sua lista completa; ela ficará disponível offline.
              </Info>
            )}
          <TextInput
            accessibilityLabel={
              mode === "creator" ? "Elenco de personagens" : "Lista de opções"
            }
            editable={!busy}
            multiline
            textAlignVertical="top"
            value={text}
            onChangeText={setText}
            placeholder="Cole sua lista aqui…"
            placeholderTextColor="#AAA5B8"
            style={[
              ui.input,
              {
                height: 250,
                fontSize: 16,
                lineHeight: 27,
                fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
              },
            ]}
            autoCorrect={false}
            maxLength={2000000}
          />
          <View
            style={[
              ui.row,
              { justifyContent: "space-between", alignItems: "flex-start" },
            ]}
          >
            <Text style={[ui.body, { flex: 1, fontSize: 12 }]}>
              Separe por vírgula, ponto e vírgula ou quebra de linha.
            </Text>
            <Text style={{ fontSize: 12, color: "#555360" }}>
              {count ?? "Muitas"}{" "}
              {mode === "creator" ? "personagens" : "opções"}
            </Text>
          </View>
        </>
      )}
      <Button
        title={
          numeric
            ? "Atualizar intervalo"
            : mode === "creator"
              ? "Atualizar elenco"
              : "Atualizar lista"
        }
        icon="spin"
        disabled={busy}
        onPress={apply}
      />
      {(mode === "powers" || mode === "creator") && (
        <View style={{ gap: 8 }}>
          <Button
            compact
            title="Restaurar lista padrão"
            disabled={busy}
            onPress={() => {
              void restore(mode);
            }}
          />
          <Button
            compact
            title="Definir lista atualizada como padrão"
            disabled={busy || !data.lists[mode].length}
            onPress={async () => {
              if (
                await ask(
                  "Guardar padrão?",
                  "A lista atualmente aplicada será a referência para restaurações futuras.",
                  "Guardar padrão",
                )
              )
                update((d) => ({
                  ...d,
                  defaults: { ...d.defaults, [mode]: [...d.lists[mode]] },
                }));
            }}
          />
        </View>
      )}
      <View style={ui.divider} />
      <Info>
        {mode === "creator"
          ? "Cada giro escolhe um personagem para a categoria destacada e avança automaticamente pela ficha."
          : numeric
            ? "Cada valor possui a mesma chance. Em intervalos enormes, as divisões são condensadas apenas na tela."
            : "Cada entrada ocupa uma fatia com a mesma chance. Entradas duplicadas são preservadas e contam como opções separadas."}
      </Info>
      <Button
        title={busy ? "Girando…" : "Girar agora"}
        primary
        icon="chevron"
        disabled={busy}
        onPress={onSpin}
      />
      <Text style={[ui.body, { textAlign: "center", fontSize: 12 }]}>
        Toque aqui ou no centro da roleta.
      </Text>
    </Card>
  );
}
