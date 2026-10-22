import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { resetPool } from "../engine/rules";
import { useApp } from "../state/AppProvider";
import { newId, makeCharacter } from "../data/defaults";
import {
  completedCount,
  nextCategory,
  updateCategories,
} from "../engine/characters";
import type { Category } from "../models/types";
import { Button, Card, Field, IconButton, Info, Sheet } from "./Primitives";
import { Icon } from "./Icon";
import { useDialog } from "./Dialog";
import { colors, ui } from "../theme/theme";
export function CharacterSheet({ busy }: { busy: boolean }) {
  const { data, update } = useApp();
  const ask = useDialog();
  const character = data.characters.find((c) => c.id === data.activeCharacter)!;
  const next = nextCategory(character);
  const done = completedCount(character);
  const [number, setNumber] = useState(String(data.characters.length));
  const [appliedCount, setAppliedCount] = useState(data.characters.length);
  if (appliedCount !== data.characters.length) {
    setAppliedCount(data.characters.length);
    setNumber(String(data.characters.length));
  }
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const activeIndex = data.characters.findIndex((c) => c.id === character.id);
  const changeCount = async () => {
    const count = Number(number);
    if (
      !/^\d+$/.test(number) ||
      !Number.isInteger(count) ||
      count < 1 ||
      count > 30
    ) {
      await ask("Quantidade inválida", "Escolha de 1 a 30 personagens.");
      return;
    }
    if (
      count < data.characters.length &&
      !(await ask(
        "Remover fichas?",
        "As fichas que excederem a nova quantidade serão removidas. Exporte um backup para guardá-las.",
        "Remover fichas",
      ))
    )
      return;
    update((d) => {
      const chars = d.characters.slice(0, count);
      while (chars.length < count) chars.push(makeCharacter(d.categories));
      return {
        ...d,
        characters: chars,
        activeCharacter: chars.some((c) => c.id === d.activeCharacter)
          ? d.activeCharacter
          : chars[0]!.id,
      };
    });
  };
  const edit = () => {
    setDraft(character.categories.map((c) => ({ ...c })));
    setName("");
    setEditing(true);
  };
  const move = (index: number, shift: number) => {
    setDraft((items) => {
      const result = [...items];
      const other = index + shift;
      if (other < 0 || other >= result.length) return items;
      [result[index], result[other]] = [result[other]!, result[index]!];
      return result;
    });
  };
  const apply = async () => {
    if (!draft.length || draft.some((c) => !c.name.trim())) {
      await ask(
        "Confira as categorias",
        "Mantenha ao menos uma categoria e preencha todos os nomes.",
      );
      return;
    }
    const removed = character.categories.filter(
      (c) =>
        !draft.some((d) => d.id === c.id) &&
        Object.hasOwn(character.results, c.id),
    );
    if (
      removed.length &&
      !(await ask(
        "Remover resultados?",
        `${removed.length} categoria(s) preenchida(s) serão removidas desta ficha.`,
        "Aplicar",
      ))
    )
      return;
    const categories = draft.map((c) => ({ ...c, name: c.name.trim() }));
    update((d) => ({
      ...d,
      categories,
      characters: d.characters.map((c) =>
        c.id === character.id ? updateCategories(c, categories) : c,
      ),
    }));
    setEditing(false);
  };
  return (
    <Card style={{ borderLeftWidth: 4, borderLeftColor: "#8A69DC", gap: 15 }}>
      <View
        style={[
          ui.row,
          { justifyContent: "space-between", alignItems: "flex-start" },
        ]}
      >
        <View style={{ flex: 1, gap: 7 }}>
          <Text style={ui.eyebrow}>FICHA DA TREND</Text>
          <Text style={[ui.title, { fontSize: 22 }]}>
            Criador de personagem
          </Text>
        </View>
        <Text style={ui.chip}>ANIME</Text>
      </View>
      <View style={[ui.row, { alignItems: "flex-end" }]}>
        <Field
          label="Personagens"
          value={number}
          onChangeText={setNumber}
          keyboardType="number-pad"
          maxLength={2}
          editable={!busy}
        />
        <View style={{ flex: 1, gap: 9 }}>
          <Text style={ui.label}>Categorias</Text>
          <Pressable
            disabled={busy}
            onPress={edit}
            accessibilityRole="button"
            accessibilityLabel="Editar categorias"
            style={[ui.input, ui.row, { justifyContent: "space-between" }]}
          >
            <Text
              style={{ fontSize: 18, color: colors.ink, fontWeight: "600" }}
            >
              {character.categories.length}
            </Text>
            <Icon name="edit" size={18} />
          </Pressable>
        </View>
      </View>
      {Number(number) !== data.characters.length && (
        <Button
          title="Atualizar personagens"
          compact
          disabled={busy}
          onPress={() => {
            void changeCount();
          }}
        />
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 9 }}
      >
        {data.characters.map((c, index) => (
          <Pressable
            key={c.id}
            disabled={busy}
            accessibilityRole="tab"
            accessibilityLabel={`Personagem ${index + 1}`}
            accessibilityState={{ selected: c.id === character.id }}
            onPress={() => update((d) => ({ ...d, activeCharacter: c.id }))}
            style={{
              flexDirection: "row",
              gap: 7,
              padding: 12,
              borderWidth: 1,
              borderColor: c.id === character.id ? "#C9BFEA" : colors.border,
              backgroundColor: c.id === character.id ? colors.lilac : "#FAF9FC",
              borderRadius: 14,
            }}
          >
            <Text style={{ color: colors.purple, fontWeight: "600" }}>
              P{index + 1}
            </Text>
            <Text
              style={{ color: colors.muted, fontSize: 12, alignSelf: "center" }}
            >
              {completedCount(c)}/{c.categories.length}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <LinearGradient
        colors={["#302746", "#5A43BA"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 17,
          padding: 15,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <View style={{ flex: 1, gap: 5 }}>
          <Text
            style={{
              color: "#C6BCD9",
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 1.1,
            }}
          >
            {next ? "PRÓXIMO GIRO" : "FICHA CONCLUÍDA"}
          </Text>
          <Text style={{ color: "white", fontSize: 15, fontWeight: "600" }}>
            {next
              ? `${next.name} · Personagem ${activeIndex + 1}`
              : `Personagem ${activeIndex + 1} completo`}
          </Text>
        </View>
        <Text
          style={{
            color: "white",
            backgroundColor: "#FFFFFF18",
            padding: 10,
            borderRadius: 12,
            fontWeight: "700",
          }}
        >
          {done}/{character.categories.length}
        </Text>
      </LinearGradient>
      <View style={{ gap: 7 }}>
        {character.categories.map((c, i) => {
          const filled = Object.hasOwn(character.results, c.id);
          const active = c.id === next?.id;
          return (
            <Pressable
              key={c.id}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={`${c.name}: ${filled ? character.results[c.id] : "Aguardando giro"}${active ? ", próximo giro" : ""}`}
              onPress={async () => {
                if (
                  filled &&
                  !(await ask(
                    "Sortear novamente?",
                    `O resultado de ${c.name} será removido. As outras categorias serão preservadas.`,
                    "Preparar novo giro",
                  ))
                )
                  return;
                update((d) => ({
                  ...d,
                  characters: d.characters.map((item) => {
                    if (item.id !== character.id) return item;
                    const results = { ...item.results };
                    delete results[c.id];
                    return { ...item, results, target: c.id };
                  }),
                }));
              }}
              style={{
                borderWidth: 1,
                borderLeftWidth: active ? 4 : 1,
                borderColor: active ? "#B3A4E8" : colors.border,
                borderLeftColor: active ? colors.purple : colors.border,
                borderRadius: 16,
                padding: 10,
                paddingLeft: active ? 7 : 10,
                minHeight: 58,
                backgroundColor: active ? colors.lilac : "#FFFFFF",
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 31,
                  height: 31,
                  borderRadius: 10,
                  backgroundColor: active ? "#6950DF" : "#F4F3F7",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: active ? "white" : colors.muted,
                    fontSize: 11,
                    fontWeight: "700",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text
                  style={{ color: colors.ink, fontWeight: "500", fontSize: 15 }}
                >
                  {c.name}
                </Text>
                <Text
                  style={{
                    color: filled ? "#5C4C91" : colors.muted,
                    fontSize: 13,
                  }}
                >
                  {filled ? character.results[c.id] : "Aguardando giro"}
                </Text>
              </View>
              <Text
                style={{
                  color: active ? colors.purple : "#B2AEBA",
                  fontSize: 19,
                }}
              >
                {active ? "→" : filled ? "✓" : "·"}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Button
        title="Reiniciar esta ficha"
        compact
        disabled={busy}
        onPress={async () => {
          if (
            await ask(
              "Reiniciar ficha?",
              `Os resultados do Personagem ${activeIndex + 1} serão apagados.`,
              "Reiniciar",
            )
          )
            update((d) => ({
              ...d,
              characters: d.characters.map((c) =>
                c.id === character.id ? makeCharacter(c.categories, c.id) : c,
              ),
              history: d.history.filter((h) => h.characterId !== character.id),
            }));
        }}
      />
      <Button
        title="Nova sessão"
        compact
        disabled={busy}
        onPress={async () => {
          if (
            await ask(
              "Iniciar nova sessão?",
              "As fichas atuais serão reiniciadas. As listas e preferências serão preservadas.",
              "Nova sessão",
            )
          )
            update((d) => ({
              ...d,
              characters: d.characters.map((c) =>
                makeCharacter(c.categories, c.id),
              ),
              rules: { ...d.rules, creator: resetPool(d.rules.creator) },
              history: d.history.filter((h) => h.mode !== "creator"),
            }));
        }}
      />
      <Sheet
        visible={editing}
        title="EDITAR CATEGORIAS"
        onClose={() => setEditing(false)}
        large
      >
        <Info>
          Altere esta ficha e o modelo para novos personagens. As demais fichas
          permanecem independentes. Somente oito categorias são legíveis nas
          referências; a nona aguarda a fonte original.
        </Info>
        {draft.map((c, i) => (
          <View
            key={c.id}
            style={{
              gap: 6,
              borderBottomWidth: 1,
              borderColor: colors.border,
              paddingBottom: 10,
            }}
          >
            <Field
              label={`Categoria ${i + 1}`}
              value={c.name}
              maxLength={80}
              onChangeText={(name) =>
                setDraft((items) =>
                  items.map((item) =>
                    item.id === c.id ? { ...item, name } : item,
                  ),
                )
              }
            />
            <View style={ui.row}>
              <IconButton
                name="up"
                label={`Subir ${c.name}`}
                disabled={i === 0}
                onPress={() => move(i, -1)}
              />
              <IconButton
                name="down"
                label={`Descer ${c.name}`}
                disabled={i === draft.length - 1}
                onPress={() => move(i, 1)}
              />
              <IconButton
                name="trash"
                label={`Remover ${c.name}`}
                disabled={draft.length === 1}
                onPress={() =>
                  setDraft((items) => items.filter((item) => item.id !== c.id))
                }
              />
            </View>
          </View>
        ))}
        <Field
          label="Nova categoria"
          value={name}
          onChangeText={setName}
          maxLength={80}
        />
        <Button
          title="Adicionar categoria"
          icon="plus"
          disabled={draft.length >= 50 || !name.trim()}
          onPress={() => {
            setDraft((items) => [
              ...items,
              { id: newId("category"), name: name.trim() },
            ]);
            setName("");
          }}
        />
        <Button
          title="Salvar categorias"
          primary
          onPress={() => {
            void apply();
          }}
        />
      </Sheet>
    </Card>
  );
}
