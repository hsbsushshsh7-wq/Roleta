import React, { createContext, useCallback, useContext, useState } from "react";
import { Text, View } from "react-native";
import { Button, Sheet, SheetProvider } from "./Primitives";
import { ui } from "../theme/theme";
type Ask = (
  title: string,
  message: string,
  confirm?: string,
) => Promise<boolean>;
const Context = createContext<Ask | null>(null);
export function DialogProvider({ children }: React.PropsWithChildren) {
  const [dialog, setDialog] = useState<{
    title: string;
    message: string;
    confirm?: string;
    resolve: (v: boolean) => void;
  } | null>(null);
  const ask = useCallback<Ask>(
    (title, message, confirm) =>
      new Promise((resolve) => setDialog({ title, message, confirm, resolve })),
    [],
  );
  const close = (v: boolean) => {
    dialog?.resolve(v);
    setDialog(null);
  };
  return (
    <Context.Provider value={ask}>
      <SheetProvider>
        {children}
        <Sheet
          visible={!!dialog}
          title={dialog?.title ?? ""}
          onClose={() => close(false)}
        >
          <Text style={ui.body}>{dialog?.message}</Text>
          <View style={{ gap: 10 }}>
            {dialog?.confirm && (
              <Button
                title={dialog.confirm}
                primary
                onPress={() => close(true)}
              />
            )}
            <Button
              title={dialog?.confirm ? "Cancelar" : "Entendi"}
              onPress={() => close(false)}
            />
          </View>
        </Sheet>
      </SheetProvider>
    </Context.Provider>
  );
}
export function useDialog(): Ask {
  const ask = useContext(Context);
  if (!ask) throw new Error("DialogProvider ausente.");
  return ask;
}
