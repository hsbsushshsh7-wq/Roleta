import React, { useEffect, useState } from "react";
import { AppState, Pressable, Share, Text, View } from "react-native";
import * as Crypto from "expo-crypto";
import { useApp } from "../state/AppProvider";
import { Button, Field } from "./Primitives";
import { useDialog } from "./Dialog";
import { colors, ui } from "../theme/theme";
import { displayDate, drawDates } from "../engine/calendar";
import {
  configureTimer,
  formatTime,
  pauseTimer,
  remainingTime,
  startTimer,
} from "../engine/countdown";

export function DateTool() {
  const { data, update } = useApp();
  const ask = useDialog();
  const [start, setStart] = useState(data.lab.dateSetup.start);
  const [end, setEnd] = useState(data.lab.dateSetup.end);
  const [quantity, setQuantity] = useState(String(data.lab.dateSetup.quantity));
  const [days, setDays] = useState(data.lab.dateSetup.weekdays);
  return (
    <View style={{ gap: 16 }}>
      <Text style={ui.title}>Encontre uma data.</Text>
      <Text style={ui.body}>
        Sorteie dias sem repetição, entre 1900 e 2100. Filtre dias da semana
        para planejar encontros ou desafios.
      </Text>
      <Field
        label="Data inicial (AAAA-MM-DD)"
        value={start}
        onChangeText={setStart}
        maxLength={10}
        autoCapitalize="none"
      />
      <Field
        label="Data final (AAAA-MM-DD)"
        value={end}
        onChangeText={setEnd}
        maxLength={10}
        autoCapitalize="none"
      />
      <Text style={ui.label}>Dias permitidos</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((name, i) => (
          <Pressable
            key={name}
            accessibilityRole="checkbox"
            accessibilityLabel={name}
            accessibilityState={{ checked: days.includes(i) }}
            onPress={() =>
              setDays((d) =>
                d.includes(i) ? d.filter((n) => n !== i) : [...d, i],
              )
            }
            style={({ pressed }) => ({
              borderRadius: 12,
              padding: 12,
              minWidth: 52,
              minHeight: 44,
              backgroundColor: days.includes(i) ? colors.lilac : "#F5F3F8",
              opacity: pressed ? 0.7 : 1,
              borderWidth: 1,
              borderColor: days.includes(i) ? colors.purple : colors.border,
            })}
          >
            <Text
              style={{
                color: days.includes(i) ? colors.purple : colors.muted,
                fontWeight: "600",
              }}
            >
              {name}
            </Text>
          </Pressable>
        ))}
      </View>
      <Field
        label="Quantidade de datas"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="number-pad"
        maxLength={3}
      />
      <Button
        title="Sortear datas"
        primary
        onPress={() => {
          try {
            const dates = drawDates(start, end, days, Number(quantity), () => {
              const w = Crypto.getRandomValues(new Uint32Array(2));
              return [w[0]!, w[1]!];
            });
            update((d) => ({
              ...d,
              lab: {
                ...d.lab,
                dates,
                dateSetup: {
                  start,
                  end,
                  weekdays: days,
                  quantity: Number(quantity),
                },
              },
            }));
          } catch (e) {
            void ask("Confira as datas", (e as Error).message);
          }
        }}
      />
      {!!data.lab.dates.length && (
        <View style={{ gap: 12 }}>
          <Text style={ui.eyebrow}>
            DATAS SORTEADAS · {data.lab.dates.length}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {data.lab.dates.map((value) => (
              <View
                key={value}
                style={{
                  padding: 13,
                  borderRadius: 14,
                  backgroundColor: colors.lilac,
                }}
              >
                <Text
                  selectable
                  style={{ fontWeight: "600", color: colors.purple }}
                >
                  {displayDate(value)}
                </Text>
              </View>
            ))}
          </View>
          <Button
            title="Compartilhar datas"
            icon="upload"
            onPress={async () => {
              try {
                await Share.share({
                  message: data.lab.dates.map(displayDate).join("\n"),
                });
              } catch (e) {
                void ask("Não foi possível compartilhar", (e as Error).message);
              }
            }}
          />
        </View>
      )}
    </View>
  );
}

export function TimerTool() {
  const { data, update } = useApp();
  const ask = useDialog();
  const timer = data.lab.timer;
  const [seconds, setSeconds] = useState(String(timer.durationMs / 1000));
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const handle = setInterval(tick, 250);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") tick();
    });
    return () => {
      clearInterval(handle);
      listener.remove();
    };
  }, []);
  const remaining = remainingTime(timer, now);
  const running = timer.endsAt !== null && remaining > 0;
  const finished = remaining === 0;
  const progress = Math.max(0, Math.min(1, remaining / timer.durationMs));
  const configure = (s: number) => {
    try {
      const next = configureTimer(s);
      setSeconds(String(s));
      setNow(Date.now());
      update((d) => ({ ...d, lab: { ...d.lab, timer: next } }));
    } catch (e) {
      void ask("Confira o tempo", (e as Error).message);
    }
  };
  return (
    <View style={{ gap: 18 }}>
      <Text style={ui.title}>Um tempo para cada rodada.</Text>
      <Text style={ui.body}>
        Use em jogos, tarefas e desafios. A contagem continua ao fechar o painel
        e é recuperada quando você retorna ao app.
      </Text>
      <View
        style={{
          backgroundColor: colors.lilac,
          padding: 24,
          borderRadius: 24,
          alignItems: "center",
          gap: 14,
        }}
      >
        <Text style={ui.eyebrow}>
          {finished
            ? "TEMPO ENCERRADO"
            : running
              ? "EM CONTAGEM"
              : remaining < timer.durationMs
                ? "PAUSADO"
                : "PRONTO PARA COMEÇAR"}
        </Text>
        <Text
          accessibilityLabel="Tempo restante"
          style={{
            fontSize: 54,
            letterSpacing: -2,
            fontWeight: "700",
            color: colors.purple,
            fontVariant: ["tabular-nums"],
          }}
        >
          {formatTime(remaining)}
        </Text>
        <View
          style={{
            width: "100%",
            height: 7,
            backgroundColor: "#DCD4F3",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: 7,
              width: `${progress * 100}%`,
              backgroundColor: colors.purple,
            }}
          />
        </View>
      </View>
      <Text style={[ui.body, { fontSize: 12 }]}>
        Temporizador visual, sem alarme em segundo plano. Nenhum giro é feito
        automaticamente.
      </Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button
            title={running ? "Pausar" : "Iniciar"}
            primary
            onPress={() => {
              const at = Date.now();
              setNow(at);
              update((d) => ({
                ...d,
                lab: {
                  ...d.lab,
                  timer: running
                    ? pauseTimer(d.lab.timer, at)
                    : startTimer(d.lab.timer, at),
                },
              }));
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title="Reiniciar tempo"
            onPress={() => configure(timer.durationMs / 1000)}
          />
        </View>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {[30, 60, 120, 300, 1500].map((s) => (
          <Button
            key={s}
            compact
            title={s < 60 ? `${s} s` : `${s / 60} min`}
            onPress={() => configure(s)}
          />
        ))}
      </View>
      <Field
        label="Duração em segundos"
        value={seconds}
        onChangeText={setSeconds}
        keyboardType="number-pad"
        maxLength={5}
      />
      <Button
        title="Definir duração"
        onPress={() => configure(Number(seconds))}
      />
    </View>
  );
}
