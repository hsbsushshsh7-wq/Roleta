import React, { memo, useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Svg, { Path, Circle, Text as SvgText, Polygon } from "react-native-svg";
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import type {
  OptionSource,
  WheelLayout,
  WheelAppearance,
} from "../models/types";

import { colors } from "../theme/theme";
import { Icon } from "./Icon";
import { point, coloredPaths } from "../engine/wheelGeometry";
import {
  DEFAULT_APPEARANCE,
  visualColors,
  contrastText,
} from "../engine/appearance";
export { wheelPaths } from "../engine/wheelGeometry";
const Drawing = memo(function Drawing({
  source,
  size,
  layout,
  appearance,
}: {
  source: OptionSource;
  layout: WheelLayout;
  size: number;
  appearance: WheelAppearance;
}) {
  const count = layout.count;
  const fills = useMemo(
    () => visualColors(source.count, count, appearance),
    [source.count, count, appearance],
  );
  const paths = useMemo(
    () => coloredPaths(layout.boundaries, fills),
    [layout, fills],
  );
  const labels = appearance.showLabels && count <= 24 && source.count === count;
  return (
    <Svg width={size} height={size} viewBox="0 0 300 300">
      {count === 0 && <Circle cx={150} cy={150} r={150} fill="#E9E4FC" />}
      {paths.map(({ path: d, color }, i) =>
        d ? (
          <Path
            key={i}
            d={d}
            fill={color}
            stroke={count <= 60 ? "#FFFFFF77" : undefined}
            strokeWidth={count <= 60 ? 0.7 : 0}
          />
        ) : null,
      )}
      {labels &&
        Array.from({ length: count }, (_, i) => {
          const span = layout.boundaries[i + 1]! - layout.boundaries[i]!;
          if (span < 8) return null;
          const angle = (layout.boundaries[i]! + layout.boundaries[i + 1]!) / 2;
          const [x, y] = point(angle, 109);
          const label = source.label(i);
          return (
            <SvgText
              key={i}
              x={x}
              y={y}
              fill={contrastText(fills[i]!)}
              fontSize={label.length > 8 ? 9 : 14}
              fontWeight="700"
              textAnchor="middle"
              alignmentBaseline="central"
              transform={`rotate(${angle + 90},${x},${y})`}
            >
              {label.length > 16 ? `${label.slice(0, 14)}…` : label}
            </SvgText>
          );
        })}
    </Svg>
  );
});
export function Wheel({
  source,
  rotation,
  size,
  busy,
  onSpin,
  layout,
  noRepeat,
  onReset,
  appearance = DEFAULT_APPEARANCE,
}: {
  source: OptionSource;
  appearance?: WheelAppearance;
  layout: WheelLayout;
  noRepeat: boolean;
  onReset: () => void;
  rotation: SharedValue<number>;
  size: number;
  busy: boolean;
  onSpin: () => void;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.get()}deg` }],
  }));
  const inner = size - 12;
  return (
    <View
      style={{
        width: size,
        height: size,
        alignSelf: "center",
        marginVertical: 4,
      }}
    >
      <View style={[styles.rim, { width: size, height: size }]}>
        <Animated.View
          style={[
            {
              width: inner,
              height: inner,
              borderRadius: inner / 2,
              overflow: "hidden",
            },
            animatedStyle,
          ]}
        >
          <Drawing
            source={source}
            size={inner}
            layout={layout}
            appearance={appearance}
          />
        </Animated.View>
      </View>
      <View
        pointerEvents="none"
        style={{ position: "absolute", right: -7, top: size / 2 - 20 }}
      >
        <Svg width={32} height={40} viewBox="0 0 32 40">
          <Polygon
            points="2,20 30,2 30,38"
            fill="#FC7471"
            stroke="white"
            strokeWidth={3}
            strokeLinejoin="round"
          />
        </Svg>
      </View>
      {noRepeat && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reiniciar sorteios"
          onPress={onReset}
          disabled={busy}
          style={{
            position: "absolute",
            left: 5,
            top: size / 2 - 29,
            width: 57,
            height: 58,
            backgroundColor: "#FAF9FE",
            borderRadius: 15,
            borderWidth: 1,
            borderColor: "#E5E0EF",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            opacity: busy ? 0.5 : 1,
          }}
        >
          <Icon name="spin" size={19} />
          <Text
            style={{
              fontSize: 10,
              letterSpacing: 1,
              fontWeight: "700",
              color: "#625D6C",
            }}
          >
            RESET
          </Text>
        </Pressable>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={busy ? "Sorteio em andamento" : "Girar roleta"}
        accessibilityState={{ disabled: busy || source.count === 0 }}
        disabled={busy || source.count === 0}
        onPress={onSpin}
        style={({ pressed }) => [
          styles.hub,
          {
            width: size * 0.245,
            height: size * 0.245,
            borderRadius: size,
            top: size * 0.3775,
            left: size * 0.3775,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Icon name="spin" size={26} />
        <Text style={styles.hubText}>{busy ? "GIRANDO" : "GIRAR"}</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  rim: {
    borderWidth: 6,
    borderColor: "white",
    borderRadius: 999,
    backgroundColor: "white",
    boxShadow: "0px 14px 30px rgba(81,49,49,0.16)",
    overflow: "hidden",
  },
  hub: {
    position: "absolute",
    backgroundColor: "#FFFDFE",
    borderWidth: 5,
    borderColor: "#F7F5F7",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    boxShadow: "0px 2px 10px rgba(26,16,44,0.09)",
  },
  hubText: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
});
