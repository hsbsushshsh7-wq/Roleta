import React, { useState } from "react";
import { Pressable, Share, StyleSheet, Switch, Text, View } from "react-native";
import * as Crypto from "expo-crypto";
import {
  createDeck,
  drawCards,
  rollDice,
  secretSanta,
  shuffle,
  type DiceOptions,
} from "../engine/games";
import { parseList } from "../engine/options";
import { useApp } from "../state/AppProvider";
import { colors, ui } from "../theme/theme";
import { useDialog } from "./Dialog";
import { Button, Field, Info } from "./Primitives";

export type GameToolKind = "dice" | "cards" | "order" | "secret";
type DiceMode = DiceOptions["mode"];

const randomWords = (): [number, number] => {
  const words = Crypto.getRandomValues(new Uint32Array(2));
  return [words[0]!, words[1]!];
};

function useToolActions() {
  const ask = useDialog();
  const run = (action: () => void) => {
    try {
      action();
    } catch (error) {
      void ask("Confira as opções", (error as Error).message);
    }
  };
  const share = async (message: string) => {
    try {
      await Share.share({ title: "Roleta · Jogos e ferramentas", message });
    } catch (error) {
      await ask("Não foi possível compartilhar", (error as Error).message);
    }
  };
  return { ask, run, share };
}

export function GameTools({ kind }: { kind: GameToolKind }) {
  if (kind === "dice") return <DiceTool />;
  if (kind === "cards") return <CardsTool />;
  return <ListTool key={kind} kind={kind} />;
}

function Choice({
  title,
  selected,
  onPress,
}: {
  title: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        {
          backgroundColor: selected ? colors.purple : "white",
          opacity: pressed ? 0.65 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: selected ? "white" : colors.purple,
          fontSize: 13,
          fontWeight: "600",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

function DiceTool() {
  const { data, update } = useApp();
  const { run, share } = useToolActions();
  const [count, setCount] = useState(() => String(data.lab.diceSetup.count));
  const [sides, setSides] = useState(() => String(data.lab.diceSetup.sides));
  const [modifier, setModifier] = useState(() =>
    String(data.lab.diceSetup.modifier),
  );
  const [mode, setMode] = useState<DiceMode>(() => data.lab.diceSetup.mode);
  const result = data.lab.dice;
  const selectMode = (value: DiceMode) => {
    setMode(value);
    if (value !== "normal") {
      setCount("1");
      setSides("20");
    }
  };
  return (
    <View style={styles.stack}>
      <Text style={ui.title}>Dados de RPG</Text>
      <Text style={ui.body}>
        De uma jogada rápida a uma sessão inteira. Cada dado é sorteado de forma
        independente.
      </Text>
      <View style={styles.wrap}>
        {[4, 6, 8, 10, 12, 20, 100].map((n) => (
          <Choice
            key={n}
            title={`D${n}`}
            selected={Number(sides) === n}
            onPress={() => {
              setSides(String(n));
              if (n !== 20) setMode("normal");
            }}
          />
        ))}
      </View>
      <View style={[ui.row, { alignItems: "flex-start" }]}>
        <Field
          label="Quantidade de dados"
          value={count}
          onChangeText={(v) => {
            setCount(v);
            if (Number(v) !== 1) setMode("normal");
          }}
          keyboardType="number-pad"
          maxLength={2}
        />
        <Field
          label="Faces por dado"
          value={sides}
          onChangeText={(v) => {
            setSides(v);
            if (Number(v) !== 20) setMode("normal");
          }}
          keyboardType="number-pad"
          maxLength={4}
        />
      </View>
      <Field
        label="Modificador"
        value={modifier}
        onChangeText={setModifier}
        keyboardType="numbers-and-punctuation"
        maxLength={6}
      />
      <Text style={ui.label}>Teste de D20</Text>
      <View style={styles.wrap}>
        {(
          [
            ["normal", "Normal"],
            ["advantage", "Vantagem"],
            ["disadvantage", "Desvantagem"],
          ] as const
        ).map(([v, label]) => (
          <Choice
            key={v}
            title={label}
            selected={mode === v}
            onPress={() => selectMode(v)}
          />
        ))}
      </View>
      <Text style={ui.body}>
        {mode === "normal"
          ? "Até 30 dados, com 2 a 1.000 faces cada."
          : `Rola dois D20 e usa ${mode === "advantage" ? "o maior" : "o menor"}. O modificador é aplicado depois.`}
      </Text>
      <Button
        title="Rolar dados"
        primary
        icon="spin"
        onPress={() =>
          run(() => {
            if (!count.trim() || !sides.trim() || !modifier.trim())
              throw new Error(
                "Preencha a quantidade, as faces e o modificador.",
              );
            const diceSetup: DiceOptions = {
              count: Number(count),
              sides: Number(sides),
              modifier: Number(modifier),
              mode,
            };
            const dice = rollDice(diceSetup, randomWords);
            update((d) => ({ ...d, lab: { ...d.lab, dice, diceSetup } }));
          })
        }
      />
      {result && (
        <View style={styles.result}>
          <Text style={ui.eyebrow}>ÚLTIMA JOGADA · {result.expression}</Text>
          <Text accessibilityLiveRegion="polite" style={styles.total}>
            {result.total}
          </Text>
          <View style={[styles.wrap, { justifyContent: "center" }]}>
            {result.rolls.map((value, i) => (
              <View key={i} style={styles.die}>
                <Text style={styles.dieText}>{value}</Text>
              </View>
            ))}
          </View>
          <Text style={[ui.body, { textAlign: "center" }]}>
            Valores usados: {result.selected.join(" + ")} · subtotal{" "}
            {result.subtotal}
          </Text>
          <Button
            title="Compartilhar jogada"
            compact
            icon="upload"
            onPress={() => {
              void share(
                `${result.expression}: ${result.total}\nDados: ${result.rolls.join(", ")}\nValores usados: ${result.selected.join(" + ")}`,
              );
            }}
          />
        </View>
      )}
    </View>
  );
}

function CardsTool() {
  const { data, update } = useApp();
  const { run, ask, share } = useToolActions();
  const [quantity, setQuantity] = useState("1");
  const [confirming, setConfirming] = useState(false);
  const lab = data.lab;
  const newDeck = async () => {
    if (confirming) return;
    setConfirming(true);
    try {
      if (
        lab.deckStarted &&
        !(await ask(
          "Novo baralho?",
          "A mão atual será substituída. Todas as cartas voltarão ao baralho e serão embaralhadas.",
          "Embaralhar novo baralho",
        ))
      )
        return;
      run(() =>
        update((d) => ({
          ...d,
          lab: {
            ...d.lab,
            deck: shuffle(createDeck(d.lab.jokers), randomWords),
            hand: [],
            deckStarted: true,
          },
        })),
      );
    } finally {
      setConfirming(false);
    }
  };
  return (
    <View style={styles.stack}>
      <Text style={ui.title}>Baralho de bolso</Text>
      <Text style={ui.body}>
        52 cartas, quatro naipes e uma ordem secreta. As cartas compradas ficam
        fora até você iniciar um novo baralho.
      </Text>
      <View style={[ui.row, { justifyContent: "space-between" }]}>
        <Text style={[ui.label, { flex: 1 }]}>
          Incluir dois coringas no próximo baralho
        </Text>
        <Switch
          accessibilityLabel="Incluir coringas"
          value={lab.jokers}
          onValueChange={(jokers) =>
            update((d) => ({ ...d, lab: { ...d.lab, jokers } }))
          }
          trackColor={{ true: colors.purple, false: "#DAD6E3" }}
        />
      </View>
      <Button
        title={lab.deckStarted ? "Novo baralho" : "Preparar baralho"}
        disabled={confirming}
        primary={!lab.deckStarted}
        icon="spin"
        onPress={() => {
          void newDeck();
        }}
      />
      {lab.deckStarted && (
        <>
          <View style={[styles.result, { alignItems: "center" }]}>
            <Text style={ui.eyebrow}>CARTAS RESTANTES</Text>
            <Text accessibilityLiveRegion="polite" style={styles.total}>
              {lab.deck.length}
            </Text>
            <Text style={ui.body}>
              {lab.deck.length
                ? "Sem reposição · cada carta sai uma vez"
                : "Baralho esgotado. Prepare uma nova partida."}
            </Text>
          </View>
          <Field
            label="Cartas para comprar"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
            maxLength={2}
          />
          <Button
            title="Comprar cartas"
            primary
            disabled={!lab.deck.length}
            onPress={() =>
              run(() => {
                const count = Number(quantity);
                if (!Number.isInteger(count) || count < 1 || count > 10)
                  throw new Error("Compre de 1 a 10 cartas por vez.");
                update((d) => {
                  const next = drawCards(d.lab.deck, count);
                  return {
                    ...d,
                    lab: { ...d.lab, deck: next.remaining, hand: next.drawn },
                  };
                });
              })
            }
          />
        </>
      )}
      {!!lab.hand.length && (
        <View style={styles.stack}>
          <Text style={ui.eyebrow}>ÚLTIMA MÃO</Text>
          <View style={styles.wrap}>
            {lab.hand.map((card) => (
              <View
                key={card.id}
                accessibilityLabel={card.label}
                style={styles.playingCard}
              >
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "700",
                    color: card.red ? "#CF4960" : colors.ink,
                  }}
                >
                  {card.rank}
                </Text>
                <Text
                  numberOfLines={3}
                  style={{
                    color: card.red ? "#CF4960" : colors.ink,
                    fontSize: 13,
                    lineHeight: 19,
                  }}
                >
                  {card.label}
                </Text>
              </View>
            ))}
          </View>
          <Button
            title="Compartilhar mão"
            compact
            icon="upload"
            onPress={() => {
              void share(
                `Última mão\n${lab.hand.map((c) => c.label).join("\n")}\n${lab.deck.length} cartas restantes`,
              );
            }}
          />
        </View>
      )}
    </View>
  );
}

function ListTool({ kind }: { kind: "order" | "secret" }) {
  const { data, update } = useApp();
  const { run, ask, share } = useToolActions();
  const [text, setText] = useState(() => {
    const previous =
      kind === "secret"
        ? data.lab.secret.map((pair) => pair.giver)
        : data.lab.order;
    if (previous.length) return previous.join("\n");
    return data.mode === "words" ||
      data.mode === "powers" ||
      data.mode === "creator"
      ? data.lists[data.mode].join("\n")
      : "";
  });
  const [page, setPage] = useState(0);
  const [revealed, setRevealed] = useState<number | null>(null);
  const isSecret = kind === "secret";
  const results = isSecret ? data.lab.secret : data.lab.order;
  const pages = Math.max(1, Math.ceil(results.length / 20));
  const safePage = Math.min(page, pages - 1);
  const start = safePage * 20;
  const generate = () =>
    run(() => {
      const names = parseList(text);
      if (names.length < 2 || names.length > (isSecret ? 200 : 5000))
        throw new Error(
          `Use de 2 a ${isSecret ? "200" : "5.000"} participantes.`,
        );
      if (isSecret) {
        const pairs = secretSanta(names, randomWords);
        update((d) => ({ ...d, lab: { ...d.lab, secret: pairs } }));
      } else {
        const order = shuffle(names, randomWords);
        update((d) => ({ ...d, lab: { ...d.lab, order } }));
      }
      setPage(0);
      setRevealed(null);
    });
  return (
    <View style={styles.stack}>
      <Text style={ui.title}>
        {isSecret ? "Amigo secreto" : "Ordem aleatória"}
      </Text>
      <Text style={ui.body}>
        {isSecret
          ? "Cada pessoa recebe um nome diferente do próprio. Todos dão e recebem um presente."
          : "Embaralhe apresentações, desafios ou turnos de um jogo. Cada entrada aparece exatamente uma vez."}
      </Text>
      <Field
        label={
          isSecret ? "Participantes do amigo secreto" : "Lista para embaralhar"
        }
        value={text}
        onChangeText={setText}
        multiline
        textAlignVertical="top"
        style={{ minHeight: 150, maxHeight: 260, fontSize: 16 }}
        placeholder="Ana, Bia, Caio, Dani"
        maxLength={isSecret ? 100200 : 2505000}
      />
      <Text style={ui.body}>
        Separe por vírgula, ponto e vírgula ou quebra de linha. Esta lista não
        modifica sua roleta. Use apelidos distintos para identificar pessoas com
        o mesmo nome.
      </Text>
      <Button
        title={isSecret ? "Sortear amigo secreto" : "Embaralhar lista"}
        primary
        icon="spin"
        onPress={async () => {
          if (
            isSecret &&
            data.lab.secret.length &&
            !(await ask(
              "Sortear novamente?",
              "Os pares anteriores serão substituídos. Confirme antes de distribuir os novos resultados.",
              "Sortear novamente",
            ))
          )
            return;
          generate();
        }}
      />
      {isSecret && (
        <Info>
          Os pares ficam salvos neste dispositivo e nos backups. A revelação
          individual ajuda a passar o celular, mas o organizador tem acesso aos
          resultados.
        </Info>
      )}
      {!!results.length && (
        <View style={styles.stack}>
          <Text style={ui.eyebrow}>
            {isSecret ? "TOQUE NO SEU NOME" : "NOVA ORDEM"} · {results.length}
          </Text>
          {isSecret ? (
            <>
              {data.lab.secret.slice(start, start + 20).map((pair, i) => (
                <View key={pair.giverIndex} style={styles.person}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${start + i + 1}. ${pair.giver}`}
                    accessibilityState={{
                      expanded: revealed === pair.giverIndex,
                    }}
                    style={({ pressed }) => [
                      styles.orderedRow,
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                    onPress={() =>
                      setRevealed(
                        revealed === pair.giverIndex ? null : pair.giverIndex,
                      )
                    }
                  >
                    <Text style={styles.index}>{start + i + 1}</Text>
                    <Text
                      numberOfLines={2}
                      style={{
                        flex: 1,
                        color: colors.purple,
                        fontWeight: "600",
                      }}
                    >
                      {pair.giver}
                    </Text>
                    <Text style={{ color: colors.purple }}>
                      {revealed === pair.giverIndex ? "−" : "+"}
                    </Text>
                  </Pressable>
                  {revealed === pair.giverIndex && (
                    <View style={styles.result}>
                      <Text style={ui.eyebrow}>SEU AMIGO SECRETO</Text>
                      <Text
                        accessibilityLiveRegion="polite"
                        style={[ui.title, { textAlign: "center" }]}
                      >
                        {pair.receiver}
                      </Text>
                      <Text style={[ui.body, { textAlign: "center" }]}>
                        Participante {pair.receiverIndex + 1}
                      </Text>
                      <Button
                        title="Ocultar resultado"
                        compact
                        onPress={() => setRevealed(null)}
                      />
                    </View>
                  )}
                </View>
              ))}
              <Button
                title="Apagar pares salvos"
                compact
                danger
                icon="trash"
                onPress={async () => {
                  if (
                    await ask(
                      "Apagar pares?",
                      "O sorteio de amigo secreto será removido deste dispositivo. Backups já exportados não são alterados.",
                      "Apagar pares",
                    )
                  ) {
                    update((d) => ({ ...d, lab: { ...d.lab, secret: [] } }));
                    setRevealed(null);
                    setPage(0);
                  }
                }}
              />
            </>
          ) : (
            <>
              {data.lab.order.slice(start, start + 20).map((name, i) => (
                <View key={i} style={styles.orderedRow}>
                  <Text style={styles.index}>
                    {String(start + i + 1).padStart(2, "0")}
                  </Text>
                  <Text
                    selectable
                    style={{ flex: 1, color: colors.ink, fontSize: 16 }}
                  >
                    {name}
                  </Text>
                </View>
              ))}
              <Button
                title="Compartilhar ordem"
                compact
                icon="upload"
                onPress={() => {
                  void share(
                    data.lab.order
                      .map((name, i) => `${i + 1}. ${name}`)
                      .join("\n"),
                  );
                }}
              />
            </>
          )}
          {pages > 1 && (
            <View
              style={[
                styles.wrap,
                { justifyContent: "space-between", alignItems: "center" },
              ]}
            >
              <Button
                title="Página anterior"
                compact
                disabled={!safePage}
                onPress={() => {
                  setPage(safePage - 1);
                  setRevealed(null);
                }}
              />
              <Text style={ui.body}>
                {safePage + 1}/{pages}
              </Text>
              <Button
                title="Próxima página"
                compact
                disabled={safePage === pages - 1}
                onPress={() => {
                  setPage(safePage + 1);
                  setRevealed(null);
                }}
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  result: {
    backgroundColor: colors.lilac,
    borderRadius: 22,
    padding: 18,
    gap: 12,
  },
  total: {
    color: colors.purpleDark,
    fontWeight: "800",
    textAlign: "center",
    fontSize: 54,
    fontVariant: ["tabular-nums"],
  },
  die: {
    minWidth: 48,
    minHeight: 48,
    padding: 8,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#DBD3F8",
  },
  dieText: { color: colors.purple, fontSize: 19, fontWeight: "700" },
  playingCard: {
    width: 100,
    minHeight: 138,
    borderRadius: 15,
    padding: 14,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E3DDF0",
    justifyContent: "space-between",
    gap: 14,
    boxShadow: "0px 4px 12px rgba(48,27,80,0.06)",
  },
  person: { gap: 10 },
  orderedRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: "#F6F3FD",
    borderRadius: 14,
    padding: 14,
  },
  index: {
    minWidth: 30,
    color: colors.purple,
    fontSize: 15,
    fontWeight: "700",
  },
});
