import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApp } from "../state/AppProvider";
import { createLayout } from "../engine/weighted";
import { availableCount, resetPool } from "../engine/rules";
import { ToolsPanel } from "../components/ToolsPanel";
import { LaboratoryPanel } from "../components/LaboratoryPanel";
import { StatisticsPanel } from "../components/StatisticsPanel";
import { Presets } from "../components/Presets";
import { RouletteSettings } from "../components/RouletteSettings";
import { ResultPopup } from "../components/ResultPopup";
import { useSpin } from "../hooks/useSpin";
import { getSource } from "../engine/options";
import { nextCategory } from "../engine/characters";
import { MODE_INFO } from "../data/defaults";
import { Wheel, wheelPaths } from "../components/Wheel";
import {
  Button,
  Card,
  IconButton,
  Info,
  Sheet,
} from "../components/Primitives";
import { Configuration } from "../components/Configuration";
import { CharacterSheet } from "../components/CharacterSheet";
import { ModePicker } from "../components/ModePicker";
import { Settings } from "../components/Settings";
import { useDialog } from "../components/Dialog";
import { Icon } from "../components/Icon";
import { importData } from "../services/transfer";
import { colors, palette, ui } from "../theme/theme";
export function WheelScreen() {
  const {
    data,
    update,
    ready,
    error,
    blocked,
    recovered,
    save,
    reload,
    replace,
  } = useApp();
  const { rotation, busy, spin, result, dismissResult } = useSpin();
  const ask = useDialog();
  const { width } = useWindowDimensions();
  const [modes, setModes] = useState(false);
  const [settings, setSettings] = useState(false);
  const [cfg, setCfg] = useState(false);
  const [presets, setPresets] = useState(false);
  const [loadedName, setLoadedName] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [history, setHistory] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [toolsTab, setToolsTab] = useState<"templates" | "batch" | "teams">(
    "templates",
  );
  const [laboratory, setLaboratory] = useState(false);
  const [statistics, setStatistics] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = (message: string) => {
    if (timer.current) clearTimeout(timer.current);
    setToast(message);
    timer.current = setTimeout(() => setToast(null), 3200);
  };
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const { mode, ranges, lists } = data;
  const source = useMemo(
    () => getSource({ mode, ranges, lists }),
    [mode, ranges, lists],
  );
  const rules = data.rules[mode];
  const layout = useMemo(
    () =>
      createLayout(source, {
        chance: rules.chance,
        distribution: rules.distribution,
        noRepeat: false,
        drawn: [],
        sessionId: "",
        appearance: {
          palette: "classic",
          overrides: {},
          title: "",
          showLabels: true,
        },
      }),
    [source, rules.chance, rules.distribution],
  );
  useEffect(() => {
    const first = layout.boundaries.findIndex(
      (start, i) => i < layout.count && layout.boundaries[i + 1]! > start,
    );
    rotation.set(
      first >= 0
        ? -(layout.boundaries[first]! + layout.boundaries[first + 1]!) / 2
        : 0,
    );
  }, [layout, rotation]);
  const remaining = availableCount(rules, source.count);
  const reset = async () => {
    if (
      rules.drawn.length &&
      !(await ask(
        "Reiniciar sorteios?",
        "Os resultados bloqueados desta modalidade serão liberados. Suas fichas, listas e chances serão preservadas.",
        "Liberar resultados",
      ))
    )
      return;
    update((d) => ({
      ...d,
      rules: { ...d.rules, [d.mode]: resetPool(d.rules[d.mode]) },
    }));
    dismissResult();
    setLoadedName(null);
    notify("Resultados liberados para novos giros");
  };
  const size = Math.min(width - 40, 510);
  const character = data.characters.find((c) => c.id === data.activeCharacter)!;
  const next = nextCategory(character);
  const latest = data.history.find(
    (h) =>
      !h.tool &&
      h.mode === data.mode &&
      (data.mode !== "creator" || h.characterId === character.id) &&
      (h.sessionId ?? "") === rules.sessionId,
  );
  const numeric = data.mode === "numbers" || data.mode === "percentage";
  const context =
    rules.appearance.title ||
    (numeric
      ? `${data.ranges[data.mode as "numbers" | "percentage"].min.toLocaleString("pt-BR")}${data.mode === "percentage" ? "%" : ""} – ${data.ranges[data.mode as "numbers" | "percentage"].max.toLocaleString("pt-BR")}${data.mode === "percentage" ? "%" : ""}`
      : MODE_INFO[data.mode].title);
  const message = busy
    ? "Sorteio em andamento…"
    : data.mode === "creator"
      ? next
        ? `Gire para preencher ${next.name}`
        : "Ficha concluída"
      : latest
        ? "Um novo giro, uma nova possibilidade"
        : loadedName
          ? `“${loadedName}” carregada`
          : "Pronto para girar";
  const gradient =
    data.preferences.appearance === "soft"
      ? (["#F8F6FB", "#FBECE7", "#F0EFF8"] as const)
      : (["#F8F8FB", "#F8F8FB"] as const);
  if (!ready)
    return (
      <View style={styles.loading}>
        <StatusBar style="dark" />
        <ActivityIndicator color={colors.purple} size="large" />
        <Text style={ui.body}>Carregando seus dados…</Text>
      </View>
    );
  if (blocked)
    return (
      <SafeAreaView style={styles.loading}>
        <Text style={ui.title}>Recuperar salvamento</Text>
        <Text style={ui.body}>{error}</Text>
        <Button
          title="Tentar carregar novamente"
          onPress={() => {
            void reload();
          }}
        />
        <Button
          title="Importar backup JSON"
          primary
          onPress={async () => {
            try {
              const restored = await importData();
              if (restored) await replace(restored);
            } catch (e) {
              await ask("Erro ao recuperar", (e as Error).message);
            }
          }}
        />
      </SafeAreaView>
    );
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} />
      <StatusBar style="dark" />
      <SafeAreaView
        style={{ flex: 1 }}
        edges={["top", "left", "right", "bottom"]}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 28,
              gap: 25,
              width: "100%",
              maxWidth: 580,
              alignSelf: "center",
            }}
          >
            <View style={[ui.row, { gap: 9 }]}>
              <IconButton
                name="settings"
                label="Configurações"
                disabled={busy}
                onPress={() => setCfg(true)}
              />
              <View style={[ui.row, { flex: 1, gap: 8 }]}>
                <Svg width={27} height={27} viewBox="0 0 300 300">
                  {wheelPaths(6).map((d, i) =>
                    d ? <Path key={i} d={d} fill={palette[i]} /> : null,
                  )}
                  <Circle cx={150} cy={150} r={35} fill="white" />
                </Svg>
                <View style={{ gap: 1 }}>
                  <Text
                    style={{
                      fontSize: 25,
                      fontWeight: "700",
                      color: colors.ink,
                      letterSpacing: -1,
                    }}
                  >
                    Roleta
                  </Text>
                  <Text
                    style={{
                      color: colors.purple,
                      fontSize: 8,
                      letterSpacing: 2,
                      fontWeight: "800",
                    }}
                  >
                    REMAKE 3.0
                  </Text>
                </View>
              </View>
              <IconButton
                name="save"
                label="Predefinições"
                disabled={busy}
                onPress={() => setPresets(true)}
              />
              <IconButton
                name="menu"
                label="Mais opções"
                disabled={busy}
                onPress={() => setMenu(true)}
              />
            </View>
            <Pressable
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={`Tipo de roleta: ${MODE_INFO[data.mode].title}`}
              onPress={() => setModes(true)}
              style={({ pressed }) => [
                styles.modeChip,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text
                style={{
                  fontWeight: "700",
                  color: colors.purple,
                  fontSize: 13,
                }}
              >
                {MODE_INFO[data.mode].icon}
              </Text>
              <Text
                style={{
                  flex: 1,
                  fontWeight: "500",
                  color: "#605776",
                  fontSize: 13,
                }}
              >
                {MODE_INFO[data.mode].title}
              </Text>
              <Text style={{ color: colors.purple, fontSize: 16 }}>⌄</Text>
            </Pressable>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(
                [
                  {
                    title: "Personalizar",
                    icon: "edit",
                    action: () => setCfg(true),
                  },
                  {
                    title: "Ferramentas",
                    icon: "plus",
                    action: () => {
                      setToolsTab("templates");
                      setToolsOpen(true);
                    },
                  },
                  {
                    title: data.preferences.focusMode
                      ? "Sair do foco"
                      : "Modo foco",
                    icon: "check",
                    action: () =>
                      update((d) => ({
                        ...d,
                        preferences: {
                          ...d.preferences,
                          focusMode: !d.preferences.focusMode,
                        },
                      })),
                  },
                ] as const
              ).map((item) => (
                <Pressable
                  key={item.title}
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                  disabled={busy}
                  onPress={item.action}
                  style={({ pressed }) => ({
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    paddingVertical: 13,
                    borderRadius: 18,
                    backgroundColor: pressed ? "#EBE4FC" : "#FFFFFFC9",
                    borderWidth: 1,
                    borderColor: "#FFFFFF",
                    opacity: busy ? 0.5 : 1,
                  })}
                >
                  <Icon name={item.icon} size={18} />
                  <Text
                    style={{
                      color: "#685D7B",
                      fontSize: 11,
                      fontWeight: "600",
                    }}
                  >
                    {item.title}
                  </Text>
                </Pressable>
              ))}
            </View>
            {!data.preferences.focusMode && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Explorar laboratório"
                disabled={busy}
                onPress={() => setLaboratory(true)}
                style={({ pressed }) => ({
                  borderRadius: 20,
                  overflow: "hidden",
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <LinearGradient
                  colors={["#EFE9FC", "#FCF0ED"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    padding: 17,
                    flexDirection: "row",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text
                      style={{
                        fontSize: 10,
                        letterSpacing: 1.5,
                        color: colors.purple,
                        fontWeight: "700",
                      }}
                    >
                      NOVO · LABORATÓRIO
                    </Text>
                    <Text
                      style={{
                        fontSize: 15,
                        color: colors.ink,
                        fontWeight: "600",
                      }}
                    >
                      Sua próxima partida começa aqui.
                    </Text>
                  </View>
                  <Text style={{ fontSize: 24, color: colors.purple }}>↗</Text>
                </LinearGradient>
              </Pressable>
            )}
            {error && (
              <Card>
                <Info>{error}</Info>
                <Button
                  compact
                  title="Tentar salvar novamente"
                  onPress={() => {
                    void save().catch(() => undefined);
                  }}
                />
              </Card>
            )}
            {recovered && (
              <Info>
                O backup local foi recuperado. Confira suas fichas e salve os
                dados.
              </Info>
            )}
            {data.mode === "creator" && <CharacterSheet busy={busy} />}
            <View
              style={[
                ui.row,
                {
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  paddingHorizontal: 2,
                },
              ]}
            >
              <View style={{ flex: 1, gap: 7 }}>
                <Text style={ui.eyebrow}>
                  {numeric
                    ? "INTERVALO ATUAL"
                    : data.mode === "creator"
                      ? "ELENCO ATUAL"
                      : "LISTA ATUAL"}
                </Text>
                <Text
                  style={[
                    ui.title,
                    { fontSize: data.mode === "creator" ? 27 : 30 },
                  ]}
                >
                  {context}
                </Text>
              </View>
              <View style={styles.slicePill}>
                <View style={styles.dot} />
                <Text style={{ color: "#615E6C", fontSize: 12 }}>
                  <Text style={{ fontWeight: "700", color: colors.ink }}>
                    {source.count.toLocaleString("pt-BR")}
                  </Text>{" "}
                  fatias
                </Text>
              </View>
            </View>
            <View style={{ gap: 14 }}>
              <Wheel
                source={source}
                appearance={rules.appearance}
                size={size}
                rotation={rotation}
                busy={busy}
                onSpin={spin}
                layout={layout}
                noRepeat={rules.noRepeat}
                onReset={() => {
                  void reset();
                }}
              />
              {source.count > 720 && (
                <Text style={[ui.body, { fontSize: 11, textAlign: "center" }]}>
                  Visual condensado em 720 setores. Todas as{" "}
                  {source.count.toLocaleString("pt-BR")} opções seguem as
                  chances configuradas.
                </Text>
              )}
              {rules.noRepeat && source.count > 0 && (
                <Text
                  accessibilityLiveRegion="polite"
                  style={[ui.body, { fontSize: 12, textAlign: "center" }]}
                >
                  {remaining.toLocaleString("pt-BR")} de{" "}
                  {source.count.toLocaleString("pt-BR")} opções disponíveis ·
                  não repetir
                </Text>
              )}
              {source.count === 0 && (
                <Text style={[ui.body, { textAlign: "center" }]}>
                  Adicione sua lista abaixo para começar.
                </Text>
              )}
            </View>
            <Card
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 16,
                gap: 12,
                minHeight: 72,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  letterSpacing: 0.6,
                  fontWeight: "600",
                  color: colors.muted,
                  width: 78,
                }}
              >
                ÚLTIMO{"\n"}RESULTADO
              </Text>
              <Text
                selectable
                accessibilityLiveRegion="polite"
                style={{
                  flex: 1,
                  fontSize: latest && latest.value.length > 12 ? 18 : 26,
                  fontWeight: "600",
                  color: colors.ink,
                }}
              >
                {latest?.value ?? "—"}
              </Text>
              <Text
                style={{
                  width: size < 330 ? 86 : 110,
                  textAlign: "right",
                  color: colors.muted,
                  fontSize: 12,
                  lineHeight: 18,
                }}
              >
                {message}
              </Text>
            </Card>
            {!data.preferences.focusMode && (
              <Configuration busy={busy} onSpin={spin} />
            )}
            <View style={{ alignItems: "center", gap: 6 }}>
              <Text style={{ fontSize: 11, color: "#918A9F" }}>
                ✦ Suas possibilidades, em movimento
              </Text>
              <Text style={{ fontSize: 10, color: "#A59EB0" }}>
                Offline · Salvo neste dispositivo
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      {toast && (
        <View pointerEvents="none" style={styles.toast}>
          <Icon name="check" color="white" size={18} />
          <Text style={{ color: "white", fontWeight: "500", fontSize: 13 }}>
            {toast}
          </Text>
        </View>
      )}
      <ToolsPanel
        visible={toolsOpen}
        initialTab={toolsTab}
        onClose={() => setToolsOpen(false)}
        onExplore={() => {
          setToolsOpen(false);
          setLaboratory(true);
        }}
      />
      <LaboratoryPanel
        visible={laboratory}
        onClose={() => setLaboratory(false)}
        onClassic={(tab) => {
          setToolsTab(tab);
          setToolsOpen(true);
        }}
        onStatistics={() => setStatistics(true)}
      />
      <StatisticsPanel
        visible={statistics}
        onClose={() => setStatistics(false)}
      />
      <ModePicker
        visible={modes}
        mode={data.mode}
        onClose={() => setModes(false)}
        onChange={(mode) => update((d) => ({ ...d, mode }))}
      />
      <Presets
        visible={presets}
        onClose={() => setPresets(false)}
        onLoaded={(name) => {
          setLoadedName(name);
          dismissResult();
        }}
      />
      <RouletteSettings
        visible={cfg}
        onClose={() => setCfg(false)}
        onPreferences={() => {
          setCfg(false);
          setSettings(true);
        }}
      />
      <ResultPopup
        result={result}
        onClose={dismissResult}
        onAgain={() => {
          dismissResult();
          setLoadedName(null);
          spin();
        }}
      />
      <Settings visible={settings} onClose={() => setSettings(false)} />
      <Sheet visible={menu} title="MAIS OPÇÕES" onClose={() => setMenu(false)}>
        <Button
          title="Tipo de roleta"
          onPress={() => {
            setMenu(false);
            setModes(true);
          }}
        />
        <Button
          title="Histórico de giros"
          icon="history"
          onPress={() => {
            setMenu(false);
            setHistory(true);
          }}
        />
        <Button
          title="Preferências e backups"
          icon="settings"
          onPress={() => {
            setMenu(false);
            setSettings(true);
          }}
        />
        <Info>
          As modalidades mantêm configurações separadas. O disquete abre suas
          predefinições. Alterações e resultados também são salvos
          automaticamente neste dispositivo.
        </Info>
      </Sheet>
      <Sheet
        visible={history}
        title="HISTÓRICO DE GIROS"
        onClose={() => setHistory(false)}
        large
      >
        <Text style={ui.body}>
          Últimos {data.history.length} de até 200 giros · todas as modalidades.
        </Text>
        {!data.history.length && (
          <Text style={ui.body}>Seu primeiro resultado aparecerá aqui.</Text>
        )}
        {data.history.length > 0 && (
          <Button
            compact
            title="Limpar histórico"
            icon="trash"
            onPress={async () => {
              if (
                await ask(
                  "Limpar histórico?",
                  "As fichas e listas serão preservadas.",
                  "Limpar",
                )
              )
                update((d) => ({ ...d, history: [] }));
            }}
          />
        )}
        {data.history.map((draw) => (
          <View
            key={draw.id}
            style={{
              paddingVertical: 12,
              gap: 5,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text
              selectable
              style={{ color: colors.ink, fontSize: 19, fontWeight: "500" }}
            >
              {draw.value}
            </Text>
            <Text style={[ui.body, { fontSize: 12 }]}>
              {MODE_INFO[draw.mode].title} ·{" "}
              {new Date(draw.at).toLocaleString("pt-BR")}
            </Text>
          </View>
        ))}
      </Sheet>
    </View>
  );
}
const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: "#F8F6FB",
    padding: 24,
    justifyContent: "center",
    gap: 20,
  },
  modeChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFFBD",
    borderWidth: 1,
    borderColor: "#E5DFEF",
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 14,
    minWidth: 160,
    maxWidth: "100%",
  },
  slicePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 30,
    backgroundColor: "#FFFFFFD9",
    boxShadow: "0px 4px 18px rgba(50,29,80,0.03)",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 5,
    backgroundColor: "#30B48D",
    borderWidth: 2,
    borderColor: "#A9E6D5",
    boxSizing: "content-box",
  },
  toast: {
    position: "absolute",
    bottom: 38,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: "#433465",
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
    boxShadow: "0px 4px 25px rgba(0,0,0,0.1)",
  },
});
