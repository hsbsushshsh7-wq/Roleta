import React from "react";
import { View, Text } from "react-native";
import { Button } from "./Primitives";
import { ui } from "../theme/theme";
export class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (__DEV__) console.error(error, info);
  }
  render() {
    if (this.state.error)
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            padding: 24,
            gap: 20,
            backgroundColor: "#F8F6FB",
          }}
        >
          <Text style={ui.title}>Vamos tentar novamente</Text>
          <Text style={ui.body}>
            Ocorreu um erro na interface. Seus dados salvos permanecem no
            dispositivo.
          </Text>
          <Button
            title="Reabrir aplicativo"
            primary
            onPress={() => this.setState({ error: false })}
          />
        </View>
      );
    return this.props.children;
  }
}
