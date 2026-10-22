import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider } from "./src/state/AppProvider";
import { DialogProvider } from "./src/components/Dialog";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { WheelScreen } from "./src/screens/WheelScreen";
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <AppProvider>
            <DialogProvider>
              <WheelScreen />
            </DialogProvider>
          </AppProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
