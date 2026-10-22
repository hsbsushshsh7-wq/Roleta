import React from "react";
import { Pressable, Text, View } from "react-native";
import { MODE_INFO } from "../data/defaults";
import { MODES, type Mode } from "../models/types";
import { Sheet } from "./Primitives";
import { Icon } from "./Icon";
import { colors, ui } from "../theme/theme";
export function ModePicker({
  visible,
  mode,
  onChange,
  onClose,
}: {
  visible: boolean;
  mode: Mode;
  onChange: (mode: Mode) => void;
  onClose: () => void;
}) {
  return (
    <Sheet visible={visible} title="TIPO DE ROLETA" onClose={onClose}>
      {MODES.map((item) => {
        const info = MODE_INFO[item];
        const selected = mode === item;
        return (
          <Pressable
            key={item}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={info.title}
            onPress={() => {
              onChange(item);
              onClose();
            }}
            style={({ pressed }) => [
              ui.row,
              {
                padding: 10,
                borderRadius: 18,
                backgroundColor: selected
                  ? colors.lilac
                  : pressed
                    ? "#F8F7FC"
                    : "transparent",
                minHeight: 76,
              },
            ]}
          >
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: item === "creator" ? "#EEE9FD" : "white",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color:
                    selected || item === "creator" ? colors.purple : "#797780",
                  fontWeight: "800",
                  fontSize: item === "powers" ? 29 : 15,
                }}
              >
                {info.icon}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={{ color: colors.ink, fontSize: 16, fontWeight: "500" }}
              >
                {info.title}
              </Text>
              <Text
                style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}
              >
                {info.description}
              </Text>
            </View>
            {selected && <Icon name="check" size={18} />}
          </Pressable>
        );
      })}
    </Sheet>
  );
}
