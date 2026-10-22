import React, { useDeferredValue, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import * as Crypto from "expo-crypto";
import { useApp } from "../state/AppProvider";
import { useDialog } from "./Dialog";
import { Button, Field, Info } from "./Primitives";
import { colors, ui } from "../theme/theme";
import {
  applyList,
  LIST_LABELS,
  listStats,
  parseStudioList,
  transformList,
  type ListMode,
  type ListOperation,
} from "../engine/listStudio";
const randomWords = (): [number, number] => {
  const words = Crypto.getRandomValues(new Uint32Array(2));
  return [words[0]!, words[1]!];
};

export function ListStudio() {
  const { data, update, save } = useApp();
  const ask = useDialog();
  const [mode, setMode] = useState<ListMode>(
    data.mode === "powers" || data.mode === "creator" ? data.mode : "words",
  );
  const [drafts, setDrafts] = useState<Record<ListMode, string>>(() => ({
    words: data.lists.words.join("\n"),
    powers: data.lists.powers.join("\n"),
    creator: data.lists.creator.join("\n"),
  }));
  const [separators, setSeparators] = useState<"lines" | "mixed">("lines");
  const [page, setPage] = useState(0);
  const [working, setWorking] = useState(false);
  const text = drafts[mode];
  const deferredText = useDeferredValue(text);
  const preview = useMemo(() => {
    try {
      const items = parseStudioList(deferredText, separators);
      return { items, stats: listStats(items), error: null };
    } catch (error) {
      return {
        items: [],
        stats: { count: 0, unique: 0, duplicates: 0 },
        error: (error as Error).message,
      };
    }
  }, [deferredText, separators]);
  const pages = Math.max(1, Math.ceil(preview.items.length / 20));
  const currentPage = Math.min(page, pages - 1);
  const edit = (value: string) => {
    setDrafts((current) => ({ ...current, [mode]: value }));
    setPage(0);
  };
  const transform = (operation: ListOperation) => {
    try {
      edit(
        transformList(
          parseStudioList(text, separators),
          operation,
          randomWords,
        ).join("\n"),
      );
      setSeparators("lines");
    } catch (error) {
      void ask("Confira a lista", (error as Error).message);
    }
  };
  return (
    <View style={{ gap: 16 }}>
      <Text style={[ui.title, { fontSize: 26 }]}>Estúdio de listas</Text>
      <Text style={ui.body}>
        Organize, limpe e embaralhe suas opções antes de levá-las à roleta.
      </Text>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {(["words", "powers", "creator"] as const).map((item) => (
          <Pressable
            key={item}
            accessibilityRole="tab"
            accessibilityLabel={`Editar ${LIST_LABELS[item]}`}
            accessibilityState={{ selected: item === mode }}
            disabled={working}
            onPress={() => {
              setMode(item);
              setSeparators("lines");
              setPage(0);
            }}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 14,
              alignItems: "center",
              backgroundColor: mode === item ? colors.lilac : "#F6F4F8",
              borderWidth: 1,
              borderColor: mode === item ? "#CFC4F0" : colors.border,
            }}
          >
            <Text
              style={{
                color: mode === item ? colors.purple : colors.muted,
                fontSize: 13,
                fontWeight: "700",
              }}
            >
              {LIST_LABELS[item]}
            </Text>
          </Pressable>
        ))}
      </View>
      <Field
        label="Lista no estúdio"
        multiline
        textAlignVertical="top"
        value={text}
        onChangeText={edit}
        editable={!working}
        autoCorrect={false}
        maxLength={2000000}
        style={{ height: 210, fontSize: 15, lineHeight: 24 }}
        placeholder="Uma opção por linha…"
      />
      <View style={{ gap: 8 }}>
        <Text style={[ui.body, { fontSize: 12 }]}>Separação da colagem</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {(
            [
              ["lines", "Uma por linha"],
              ["mixed", "Vírgula, ; ou linha"],
            ] as const
          ).map(([value, label]) => (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityLabel={label}
              accessibilityState={{ checked: separators === value }}
              disabled={working}
              onPress={() => {
                setSeparators(value);
                setPage(0);
              }}
              style={{
                padding: 11,
                borderRadius: 13,
                backgroundColor:
                  separators === value ? colors.lilac : "#F6F4F8",
              }}
            >
              <Text
                style={{
                  color: separators === value ? colors.purple : colors.muted,
                  fontSize: 12,
                }}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={[ui.body, { fontSize: 12 }]}>
          {separators === "lines"
            ? "Vírgulas e ponto e vírgula permanecem dentro dos nomes."
            : "Vírgula, ponto e vírgula e quebra de linha iniciam outra opção."}
        </Text>
      </View>
      {preview.error ? (
        <Text style={{ color: colors.red }}>{preview.error}</Text>
      ) : (
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Text style={ui.chip}>
            {preview.stats.count.toLocaleString("pt-BR")} opções
          </Text>
          <Text style={ui.chip}>
            {preview.stats.duplicates.toLocaleString("pt-BR")} duplicadas
          </Text>
        </View>
      )}
      <View style={{ gap: 8 }}>
        {(
          [
            ["unique", "Remover duplicatas exatas"],
            ["sort", "Ordenar de A a Z"],
            ["reverse", "Inverter ordem"],
            ["shuffle", "Embaralhar lista"],
          ] as const
        ).map(([operation, label]) => (
          <Button
            key={operation}
            title={label}
            compact
            disabled={working || !!preview.error || !preview.items.length}
            onPress={() => transform(operation)}
          />
        ))}
      </View>
      <Text style={[ui.body, { fontSize: 12 }]}>
        Duplicatas são nomes iguais após remover espaços nas pontas. Maiúsculas
        e acentos são preservados: “Ana” e “ana” continuam distintos.
      </Text>
      {!!preview.items.length && (
        <View
          style={{
            gap: 10,
            padding: 14,
            backgroundColor: "#F7F5FB",
            borderRadius: 18,
          }}
        >
          <Text style={ui.eyebrow}>
            PRÉVIA · {currentPage + 1}/{pages}
          </Text>
          {preview.items
            .slice(currentPage * 20, currentPage * 20 + 20)
            .map((item, i) => (
              <Text
                key={i}
                style={{ color: colors.ink, fontSize: 14 }}
                numberOfLines={2}
              >
                {currentPage * 20 + i + 1}. {item}
              </Text>
            ))}
          {pages > 1 && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <Button
                title="Prévia anterior"
                compact
                disabled={currentPage === 0}
                onPress={() => setPage(currentPage - 1)}
              />
              <Button
                title="Próxima prévia"
                compact
                disabled={currentPage === pages - 1}
                onPress={() => setPage(currentPage + 1)}
              />
            </View>
          )}
        </View>
      )}
      <Info>
        Ao aplicar, a configuração anterior fica nas predefinições. Alterar a
        lista reinicia as chances, cores individuais e opções bloqueadas dessa
        modalidade. Fichas já preenchidas são preservadas.
      </Info>
      <Button
        title="Aplicar lista à roleta"
        primary
        disabled={working || !!preview.error || !preview.items.length}
        onPress={async () => {
          if (working) return;
          setWorking(true);
          try {
            const items = parseStudioList(text, separators);
            if (
              await ask(
                `Aplicar em ${LIST_LABELS[mode]}?`,
                `${items.length.toLocaleString("pt-BR")} opções substituirão a lista desta modalidade. Se houver uma lista anterior diferente, ela será guardada nas predefinições.`,
                "Aplicar lista",
              )
            ) {
              update((current) => applyList(current, mode, items));
              await save();
              await ask(
                "Lista aplicada",
                "Sua lista está salva e disponível na roleta.",
              );
            }
          } catch (error) {
            await ask("Não foi possível aplicar", (error as Error).message);
          } finally {
            setWorking(false);
          }
        }}
      />
    </View>
  );
}
