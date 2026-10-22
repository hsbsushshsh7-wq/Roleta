import React from "react";
import { View, Text } from "react-native";
import { Button } from "./Primitives";
import { ui } from "../theme/theme";
export function OptionPagination({
  count,
  start,
  length,
  current,
  pages,
  onPage,
}: {
  count: number;
  start: number;
  length: number;
  current: number;
  pages: number;
  onPage: (p: number) => void;
}) {
  if (count <= 20) return null;
  return (
    <View style={{ gap: 9 }}>
      <Text style={[ui.body, { fontSize: 11, textAlign: "center" }]}>
        {start + 1}–{start + length} de {count.toLocaleString("pt-BR")} opções
      </Text>
      <View style={[ui.row, { justifyContent: "space-between" }]}>
        <Button
          title="Anterior"
          compact
          disabled={current === 0}
          onPress={() => onPage(current - 1)}
        />
        <Button
          title="Próximas"
          compact
          disabled={current >= pages - 1}
          onPress={() => onPage(current + 1)}
        />
      </View>
    </View>
  );
}
