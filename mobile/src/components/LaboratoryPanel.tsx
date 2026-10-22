import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Button, Sheet } from "./Primitives";
import { GameTools } from "./GameTools";
import { TournamentTool } from "./TournamentTool";
import { DateTool, TimerTool } from "./UtilityTools";
import { ListStudio } from "./ListStudio";
import { colors, ui } from "../theme/theme";

const TOOLS = [
  {
    id: "dice",
    title: "Dados de RPG",
    text: "D4 a D1000, bônus e vantagem",
    icon: "D20",
    group: "Jogar",
    color: "#EFE9FF",
  },
  {
    id: "cards",
    title: "Baralho",
    text: "52 cartas, coringas e compra sem repetir",
    icon: "♠",
    group: "Jogar",
    color: "#FFE9EF",
  },
  {
    id: "tournament",
    title: "Torneio",
    text: "Monte a chave. Encontre seu campeão.",
    icon: "VS",
    group: "Jogar",
    color: "#FFF0D9",
  },
  {
    id: "secret",
    title: "Amigo secreto",
    text: "Pares sem tirar a si mesmo",
    icon: "♡",
    group: "Jogar",
    color: "#FCE8F3",
  },
  {
    id: "order",
    title: "Ordem aleatória",
    text: "Uma sequência para a sua lista",
    icon: "↕",
    group: "Organizar",
    color: "#E5F5F1",
  },
  {
    id: "dates",
    title: "Sorteio de datas",
    text: "Escolha o período e os dias permitidos",
    icon: "31",
    group: "Organizar",
    color: "#E8EFFC",
  },
  {
    id: "timer",
    title: "Temporizador",
    text: "Defina o tempo de cada desafio",
    icon: "◷",
    group: "Organizar",
    color: "#F1EDFF",
  },
  {
    id: "lists",
    title: "Estúdio de listas",
    text: "Organize e limpe, com backup automático",
    icon: "Aa",
    group: "Organizar",
    color: "#EAF2FA",
  },
  {
    id: "statistics",
    title: "Estatísticas",
    text: "Explore seus resultados e compartilhe CSV",
    icon: "▥",
    group: "Explorar",
    color: "#F1E9F8",
  },
  {
    id: "templates",
    title: "Modelos de roleta",
    text: "Decisões, moedas, letras e mais",
    icon: "✦",
    group: "Explorar",
    color: "#FFF0E5",
  },
  {
    id: "batch",
    title: "Sorteio em lote",
    text: "Até 100 resultados com seus pesos",
    icon: "×",
    group: "Explorar",
    color: "#EAE6FF",
  },
  {
    id: "teams",
    title: "Equipes equilibradas",
    text: "Distribua participantes em grupos",
    icon: "2+",
    group: "Organizar",
    color: "#E8F5EE",
  },
] as const;
type Tool = (typeof TOOLS)[number]["id"];
export function LaboratoryPanel({
  visible,
  onClose,
  onClassic,
  onStatistics,
}: {
  visible: boolean;
  onClose: () => void;
  onClassic: (tab: "templates" | "batch" | "teams") => void;
  onStatistics: () => void;
}) {
  const [active, setActive] = useState<Tool | null>(null);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("Todos");
  const select = (id: Tool) => {
    if (id === "statistics") {
      onClose();
      onStatistics();
    } else if (id === "templates" || id === "batch" || id === "teams") {
      onClose();
      onClassic(id);
    } else setActive(id);
  };
  const close = () => {
    setActive(null);
    onClose();
  };
  const title = TOOLS.find((t) => t.id === active)?.title;
  const query = search
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
  const filtered = TOOLS.filter(
    (t) =>
      (group === "Todos" || t.group === group) &&
      `${t.title} ${t.text}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("pt-BR")
        .includes(query),
  );
  return (
    <Sheet
      visible={visible}
      onClose={close}
      title={title ?? "LABORATÓRIO · 3.0"}
      large
    >
      {visible &&
        (active ? (
          <View style={{ gap: 18 }}>
            <Button
              title="Voltar às ferramentas"
              compact
              onPress={() => setActive(null)}
            />
            {(active === "dice" ||
              active === "cards" ||
              active === "order" ||
              active === "secret") && <GameTools key={active} kind={active} />}
            {active === "tournament" && <TournamentTool />}
            {active === "dates" && <DateTool />}
            {active === "timer" && <TimerTool />}
            {active === "lists" && <ListStudio />}
          </View>
        ) : (
          <View style={{ gap: 18 }}>
            <LinearGradient
              colors={["#30244F", "#6046CD"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 24, padding: 22, gap: 10 }}
            >
              <Text
                style={{
                  color: "#CFBFFC",
                  fontWeight: "700",
                  fontSize: 10,
                  letterSpacing: 2,
                }}
              >
                CRIE SUA PRÓXIMA RODADA
              </Text>
              <Text
                style={{
                  fontSize: 30,
                  fontWeight: "700",
                  letterSpacing: -1,
                  color: "white",
                }}
              >
                Mais do que girar.
              </Text>
              <Text style={{ color: "#DFD6F6", fontSize: 13, lineHeight: 20 }}>
                Jogos, encontros e decisões. {TOOLS.length} ferramentas, todas
                offline.
              </Text>
            </LinearGradient>
            <TextInput
              accessibilityLabel="Buscar ferramenta"
              placeholder="O que vamos fazer hoje?"
              placeholderTextColor="#93899F"
              value={search}
              onChangeText={setSearch}
              style={[ui.input, { minHeight: 50 }]}
            />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
              {["Todos", "Jogar", "Organizar", "Explorar"].map((g) => (
                <Pressable
                  key={g}
                  accessibilityRole="tab"
                  accessibilityLabel={g}
                  aria-selected={group === g}
                  onPress={() => setGroup(g)}
                  style={({ pressed }) => ({
                    minHeight: 44,
                    justifyContent: "center",
                    paddingHorizontal: 12,
                    borderRadius: 13,
                    backgroundColor: group === g ? colors.purple : colors.lilac,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: group === g ? "white" : colors.purple,
                    }}
                  >
                    {g}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={{ gap: 10 }}>
              {filtered.map((t) => (
                <Pressable
                  key={t.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir ${t.title}`}
                  onPress={() => select(t.id)}
                  style={({ pressed }) => ({
                    padding: 15,
                    borderRadius: 21,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: pressed ? colors.lilac : "white",
                    flexDirection: "row",
                    gap: 13,
                    alignItems: "center",
                  })}
                >
                  <View
                    style={{
                      width: 48,
                      height: 52,
                      borderRadius: 16,
                      backgroundColor: t.color,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: t.icon.length > 2 ? 15 : 22,
                        fontWeight: "700",
                        color: colors.purple,
                      }}
                    >
                      {t.icon}
                    </Text>
                  </View>
                  <View style={{ gap: 4, flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: colors.ink,
                      }}
                    >
                      {t.title}
                    </Text>
                    <Text style={[ui.body, { fontSize: 12, lineHeight: 17 }]}>
                      {t.text}
                    </Text>
                  </View>
                  <Text style={{ color: colors.purple }}>→</Text>
                </Pressable>
              ))}
            </View>
            {!filtered.length && (
              <Text style={ui.body}>
                Nenhuma ferramenta encontrada. Tente outro nome ou categoria.
              </Text>
            )}
          </View>
        ))}
    </Sheet>
  );
}
