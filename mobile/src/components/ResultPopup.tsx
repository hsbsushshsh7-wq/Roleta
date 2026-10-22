import React from "react";
import { Text, View, Share } from "react-native";
import Svg, {
  Defs,
  RadialGradient,
  Stop,
  Mask,
  Rect,
  G,
  Path,
} from "react-native-svg";
import { useDialog } from "./Dialog";
import { Button, Sheet } from "./Primitives";
import type { Draw } from "../models/types";
import { colors, ui } from "../theme/theme";
export function ResultPopup({
  result,
  onClose,
  onAgain,
}: {
  result: Draw | null;
  onClose: () => void;
  onAgain: () => void;
}) {
  const ask = useDialog();
  const subtitle =
    result?.mode === "creator"
      ? `Personagem sorteado${result.categoryName ? ` · ${result.categoryName}` : ""}`
      : result?.mode === "words"
        ? "Palavra sorteada"
        : result?.mode === "powers"
          ? "Poder sorteado"
          : result?.mode === "percentage"
            ? "Porcentagem sorteada"
            : "Número sorteado";
  return (
    <Sheet
      visible={!!result}
      title="RESULTADO"
      variant="result"
      onClose={onClose}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -60,
          left: -20,
          right: -20,
          height: 210,
        }}
      >
        <Svg
          width="100%"
          height={210}
          viewBox="0 0 400 210"
          preserveAspectRatio="none"
        >
          <Defs>
            <RadialGradient id="fade" cx="50%" cy="0%" rx="60%" ry="100%">
              <Stop offset="0" stopColor="white" stopOpacity={0.9} />
              <Stop offset="1" stopColor="white" stopOpacity={0} />
            </RadialGradient>
            <Mask id="pastel">
              <Rect width="400" height="210" fill="url(#fade)" />
            </Mask>
          </Defs>
          <G mask="url(#pastel)">
            <Path d="M200 0L0 0L0 210Z" fill="#DDD2FA" />
            <Path d="M200 0L0 210L180 210Z" fill="#FFEDD0" />
            <Path d="M200 0L180 210L310 210Z" fill="#FBEAA9" />
            <Path d="M200 0L310 210L400 110Z" fill="#C2EBDC" />
            <Path d="M200 0L400 110L400 0Z" fill="#FFE4E5" />
          </G>
        </Svg>
      </View>
      <View style={{ gap: 24, alignItems: "stretch", paddingTop: 0 }}>
        <Text style={[ui.eyebrow, { textAlign: "center", marginBottom: 0 }]}>
          RESULTADO
        </Text>
        <Text
          selectable
          accessibilityRole="header"
          accessibilityLiveRegion="polite"
          style={{
            fontSize: (result?.value.length ?? 0) > 80 ? 26 : 36,
            lineHeight: (result?.value.length ?? 0) > 80 ? 33 : 40,
            fontWeight: "700",
            letterSpacing: -1.4,
            color: colors.ink,
            textAlign: "center",
            paddingHorizontal: 4,
          }}
        >
          {result?.value ?? ""}
        </Text>
        <Text
          style={[
            ui.body,
            { textAlign: "center", fontSize: 15, marginBottom: 4 },
          ]}
        >
          {subtitle}
        </Text>
        <Button
          title="Girar novamente"
          primary
          icon="spin"
          iconAfter
          onPress={onAgain}
        />
        <Button
          title="Compartilhar resultado"
          compact
          icon="upload"
          onPress={async () => {
            try {
              await Share.share({
                message: `${result?.value ?? ""} — ${subtitle}`,
                title: "Roleta Remake",
              });
            } catch (e) {
              await ask("Não foi possível compartilhar", (e as Error).message);
            }
          }}
        />
      </View>
    </Sheet>
  );
}
