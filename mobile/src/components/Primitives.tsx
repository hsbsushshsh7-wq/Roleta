import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { BlurTargetView, BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, ui } from "../theme/theme";
import { Icon, type IconName } from "./Icon";
export function Button({
  title,
  onPress,
  icon,
  primary = false,
  disabled = false,
  compact = false,
  danger = false,
  iconAfter = false,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  primary?: boolean;
  disabled?: boolean;
  compact?: boolean;
  danger?: boolean;
  iconAfter?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        { opacity: disabled ? 0.45 : pressed ? 0.72 : 1 },
        styles.button,
        iconAfter && { flexDirection: "row-reverse" },
        compact && { minHeight: 44 },
        !primary && styles.outline,
      ]}
    >
      {primary && (
        <LinearGradient
          colors={["#6B56F1", "#503ED0"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {icon && (
        <View style={{ width: 20, height: 20, flexShrink: 0 }}>
          <Icon
            name={icon}
            color={primary ? "white" : danger ? colors.red : colors.purple}
            size={20}
          />
        </View>
      )}
      <Text
        style={{
          color: primary ? "white" : danger ? colors.red : "#555360",
          fontSize: compact ? 13 : 16,
          fontWeight: "600",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function IconButton({
  name,
  label,
  onPress,
  disabled = false,
}: {
  name: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      onPress={onPress}
      hitSlop={5}
      style={({ pressed }) => [
        styles.icon,
        { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 },
      ]}
    >
      <Icon name={name} />
    </Pressable>
  );
}
export function Card({
  children,
  style,
}: React.PropsWithChildren<{ style?: ViewStyle }>) {
  return <View style={[ui.card, style]}>{children}</View>;
}
export function CardTitle({
  eyebrow = "CONFIGURAÇÃO",
  title,
  icon = "edit",
}: {
  eyebrow?: string;
  title: string;
  icon?: IconName;
}) {
  return (
    <View
      style={[
        ui.row,
        { justifyContent: "space-between", alignItems: "flex-start" },
      ]}
    >
      <View style={{ flex: 1, gap: 7 }}>
        <Text style={ui.eyebrow}>{eyebrow}</Text>
        <Text style={ui.title}>{title}</Text>
      </View>
      <View style={styles.titleIcon}>
        <Icon name={icon} />
      </View>
    </View>
  );
}
export function Field({
  label,
  style,
  ...props
}: TextInputProps & { label: string }) {
  return (
    <View style={{ flex: 1, gap: 9 }}>
      <Text style={ui.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#A5A3AF"
        style={[ui.input, style]}
        {...props}
      />
    </View>
  );
}
export function Info({ children }: React.PropsWithChildren) {
  return (
    <View style={[ui.row, { alignItems: "flex-start" }]}>
      <Icon name="info" size={19} />
      <Text style={[ui.body, { flex: 1 }]}>{children}</Text>
    </View>
  );
}
interface SheetEntry {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  large: boolean;
  variant: "panel" | "result";
}
interface SheetHost {
  present: (id: string, entry: SheetEntry) => void;
  dismiss: (id: string) => void;
}
const SheetContext = createContext<SheetHost | null>(null);
// One native Modal owns the stack, so confirmations remain above editors on Android, iOS and web.
export function SheetProvider({ children }: React.PropsWithChildren) {
  const [entries, setEntries] = useState<(SheetEntry & { id: string })[]>([]);
  const insets = useSafeAreaInsets();
  const blurTarget = useRef<View>(null);
  const present = useCallback((id: string, entry: SheetEntry) => {
    setEntries((items) => {
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) return [...items, { ...entry, id }];
      return items.map((item) => (item.id === id ? { ...entry, id } : item));
    });
  }, []);
  const dismiss = useCallback(
    (id: string) =>
      setEntries((items) =>
        items.some((item) => item.id === id)
          ? items.filter((item) => item.id !== id)
          : items,
      ),
    [],
  );
  const api = useMemo(() => ({ present, dismiss }), [present, dismiss]);
  const top = entries[entries.length - 1];
  return (
    <SheetContext.Provider value={api}>
      <BlurTargetView ref={blurTarget} style={{ flex: 1 }}>
        {children}
      </BlurTargetView>
      <Modal
        visible={!!top}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => top?.onClose()}
      >
        {top && (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={[
              styles.overlay,
              top.variant === "result" && {
                backgroundColor: "rgba(30,27,47,0.42)",
              },
            ]}
          >
            {top.variant === "result" && (
              <BlurView
                pointerEvents="none"
                blurTarget={blurTarget}
                blurMethod="dimezisBlurView"
                tint="default"
                intensity={30}
                style={StyleSheet.absoluteFill}
              />
            )}
            <Pressable
              accessibilityLabel="Fechar painel"
              onPress={top.onClose}
              style={StyleSheet.absoluteFill}
            />
            {entries.map((entry) => (
              <View
                key={entry.id}
                accessibilityViewIsModal={entry.id === top.id}
                accessibilityElementsHidden={entry.id !== top.id}
                importantForAccessibility={
                  entry.id === top.id ? "yes" : "no-hide-descendants"
                }
                pointerEvents={entry.id === top.id ? "auto" : "none"}
                style={[
                  styles.sheet,
                  {
                    display: entry.id === top.id ? "flex" : "none",
                    maxHeight: entry.large ? "92%" : "85%",
                    paddingBottom: Math.max(insets.bottom, 18),
                    marginTop: insets.top + 12,
                  },
                ]}
              >
                {entry.variant === "panel" ? (
                  <View
                    style={[
                      ui.row,
                      {
                        paddingHorizontal: 20,
                        paddingTop: 18,
                        paddingBottom: 12,
                        justifyContent: "space-between",
                      },
                    ]}
                  >
                    <Text style={[ui.eyebrow, { flex: 1 }]}>{entry.title}</Text>
                    <IconButton
                      name="close"
                      label="Fechar"
                      onPress={entry.onClose}
                    />
                  </View>
                ) : (
                  <View
                    style={{
                      position: "absolute",
                      right: 15,
                      top: 15,
                      zIndex: 2,
                    }}
                  >
                    <IconButton
                      name="close"
                      label="Fechar resultado"
                      onPress={entry.onClose}
                    />
                  </View>
                )}
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{
                    padding: 20,
                    paddingTop: entry.variant === "result" ? 44 : 4,
                    gap: 16,
                  }}
                >
                  {entry.children}
                </ScrollView>
              </View>
            ))}
          </KeyboardAvoidingView>
        )}
      </Modal>
    </SheetContext.Provider>
  );
}
export function Sheet({
  visible,
  title,
  children,
  onClose,
  large = false,
  variant = "panel",
}: React.PropsWithChildren<{
  visible: boolean;
  title: string;
  onClose: () => void;
  large?: boolean;
  variant?: "panel" | "result";
}>) {
  const host = useContext(SheetContext);
  const id = useId();
  if (!host) throw new Error("SheetProvider ausente.");
  const { present, dismiss } = host;
  useLayoutEffect(() => {
    if (visible) present(id, { title, children, onClose, large, variant });
    else dismiss(id);
  }, [visible, id, title, children, onClose, large, variant, present, dismiss]);
  useEffect(() => () => dismiss(id), [id, dismiss]);
  return null;
}
const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    overflow: "hidden",
    paddingHorizontal: 13,
  },
  outline: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "white",
  },
  icon: {
    width: 44,
    height: 44,
    backgroundColor: "#FFFFFFE8",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  titleIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#EEEAFF",
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(31,24,52,0.24)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  sheet: {
    width: "100%",
    maxWidth: 560,
    backgroundColor: "#FEFDFF",
    borderRadius: 26,
    overflow: "hidden",
    boxShadow: "0px 20px 70px rgba(32,18,70,0.18)",
  },
});
