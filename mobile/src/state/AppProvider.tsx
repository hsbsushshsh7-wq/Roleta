import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { reconcileSources } from "../engine/rules";
import { initialData } from "../data/defaults";
import type { AppData } from "../models/types";
import { loadData, saveData } from "../storage/persistence";
interface Store {
  data: AppData;
  update: (recipe: (current: AppData) => AppData) => void;
  replace: (data: AppData) => Promise<void>;
  save: () => Promise<void>;
  reload: () => Promise<void>;
  ready: boolean;
  blocked: boolean;
  error: string | null;
  savedAt: string | null;
  recovered: boolean;
}
const Context = createContext<Store | null>(null);
export function AppProvider({ children }: React.PropsWithChildren) {
  const [data, setData] = useState(initialData);
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recovered, setRecovered] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const ref = useRef(data);
  const canSave = useRef(false);
  const revision = useRef(0);
  const savedRevision = useRef(0);
  const reload = useCallback(async () => {
    try {
      const loaded = await loadData();
      setError(null);
      setBlocked(false);
      const value = loaded.data ?? initialData();
      ref.current = value;
      setData(value);
      setRecovered(loaded.recovered);
      canSave.current = true;
      revision.current = 0;
      savedRevision.current = 0;
    } catch (e) {
      canSave.current = false;
      setBlocked(true);
      setError((e as Error).message);
    } finally {
      setReady(true);
    }
  }, []);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void reload();
    });
    return () => {
      active = false;
    };
  }, [reload]);
  const update = useCallback((recipe: (current: AppData) => AppData) => {
    if (!canSave.current) return;
    const next = reconcileSources(ref.current, recipe(ref.current));
    ref.current = next;
    revision.current++;
    setData(next);
  }, []);
  const save = useCallback(async () => {
    if (!canSave.current)
      throw new Error("Recupere o salvamento antes de continuar.");
    const rev = revision.current;
    try {
      await saveData(ref.current);
      savedRevision.current = rev;
      setSavedAt(new Date().toISOString());
      setError(null);
      setRecovered(false);
    } catch (e) {
      setError(
        "Falha ao salvar no dispositivo. Libere espaço e tente novamente.",
      );
      throw e;
    }
  }, []);
  useEffect(() => {
    if (!ready || !canSave.current) return;
    const timer = setTimeout(() => {
      if (revision.current !== savedRevision.current)
        void save().catch(() => undefined);
    }, 400);
    return () => clearTimeout(timer);
  }, [data, ready, save]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (status) => {
      if (status !== "active" && canSave.current)
        void save().catch(() => undefined);
    });
    return () => subscription.remove();
  }, [save]);
  const replace = useCallback(async (next: AppData) => {
    await saveData(next);
    canSave.current = true;
    ref.current = next;
    revision.current++;
    savedRevision.current = revision.current;
    setData(next);
    setError(null);
    setBlocked(false);
    setRecovered(false);
    setReady(true);
    setSavedAt(new Date().toISOString());
  }, []);
  return (
    <Context.Provider
      value={{
        data,
        update,
        replace,
        save,
        reload,
        ready,
        blocked,
        error,
        savedAt,
        recovered,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useApp() {
  const store = useContext(Context);
  if (!store) throw new Error("AppProvider ausente.");
  return store;
}
