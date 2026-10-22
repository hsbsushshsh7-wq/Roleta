import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import { useAudioPlayer } from "expo-audio";
import {
  cancelAnimation,
  Easing,
  runOnJS,
  ReduceMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { getSource } from "../engine/options";
import { normalize, planSpin } from "../engine/draw";
import { fillCharacter, nextCategory } from "../engine/characters";
import { newId } from "../data/defaults";
import { useApp } from "../state/AppProvider";
import { useDialog } from "../components/Dialog";
import type { Draw } from "../models/types";
export function useSpin() {
  const { data, update } = useApp();
  const ask = useDialog();
  const rotation = useSharedValue(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Draw | null>(null);
  const lock = useRef(false);
  const mounted = useRef(true);
  const reduceMotion = useRef(false);
  const player = useAudioPlayer(require("../../assets/result.wav"));
  useEffect(() => {
    mounted.current = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      reduceMotion.current = v;
    });
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (v) => {
        reduceMotion.current = v;
      },
    );
    return () => {
      mounted.current = false;
      cancelAnimation(rotation);
      sub.remove();
    };
  }, [rotation]);
  const spin = useCallback(() => {
    if (lock.current) return;
    try {
      const source = getSource(data);
      const character = data.characters.find(
        (c) => c.id === data.activeCharacter,
      )!;
      const category =
        data.mode === "creator" ? nextCategory(character) : undefined;
      if (data.mode === "creator" && !category) {
        void ask(
          "Ficha concluída",
          "Todas as categorias deste personagem estão preenchidas. Reinicie a ficha ou selecione outro personagem.",
        );
        return;
      }
      const rules = data.rules[data.mode];
      const plan = planSpin(
        source,
        normalize(rotation.get()),
        () => {
          const words = Crypto.getRandomValues(new Uint32Array(2));
          return [words[0]!, words[1]!];
        },
        rules,
      );
      lock.current = true;
      setBusy(true);
      if (data.preferences.haptics)
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
          () => undefined,
        );
      const finish = (finished: boolean | undefined) => {
        if (!mounted.current) return;
        if (finished) {
          const result: Draw = {
            id: newId("draw"),
            mode: data.mode,
            value: plan.value,
            index: plan.index,
            count: plan.count,
            at: new Date().toISOString(),
            sessionId: rules.sessionId,
            ...(category
              ? {
                  characterId: character.id,
                  categoryId: category.id,
                  categoryName: category.name,
                }
              : {}),
          };
          update((current) => ({
            ...current,
            history: [result, ...current.history].slice(0, 200),
            rules: {
              ...current.rules,
              [data.mode]: {
                ...current.rules[data.mode],
                drawn: current.rules[data.mode].drawn.includes(plan.index)
                  ? current.rules[data.mode].drawn
                  : [...current.rules[data.mode].drawn, plan.index],
              },
            },
            characters: category
              ? current.characters.map((c) =>
                  c.id === character.id
                    ? fillCharacter(c, category.id, plan.value)
                    : c,
                )
              : current.characters,
          }));
          rotation.set(normalize(plan.angle));
          if (data.preferences.resultPopup) setResult(result);
          if (data.preferences.haptics)
            void Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            ).catch(() => undefined);
          if (data.preferences.sound) {
            void player
              .seekTo(0)
              .then(() => player.play())
              .catch(() => undefined);
          }
          AccessibilityInfo.announceForAccessibility(
            `Resultado: ${plan.value}`,
          );
        }
        lock.current = false;
        setBusy(false);
      };
      rotation.set(normalize(rotation.get()));
      rotation.set(
        withTiming(
          plan.angle,
          {
            duration: reduceMotion.current ? 0 : data.preferences.duration,
            reduceMotion: ReduceMotion.Never,
            easing: Easing.bezier(0.16, 0, 0.12, 1),
          },
          (finished) => {
            runOnJS(finish)(finished);
          },
        ),
      );
    } catch (e) {
      lock.current = false;
      setBusy(false);
      void ask("Não foi possível girar", (e as Error).message);
    }
  }, [data, rotation, update, ask, player]);
  const dismissResult = useCallback(() => setResult(null), []);
  return { rotation, busy, spin, result, dismissResult };
}
