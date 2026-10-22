import AsyncStorage from "@react-native-async-storage/async-storage";
import { decodeData } from "./schema";
import type { AppData } from "../models/types";
export const STORAGE_KEY = "@roleta/native/v1";
export const BACKUP_KEY = "@roleta/native/backup/v1";
let queue: Promise<void> = Promise.resolve();
export async function loadData(): Promise<{
  data: AppData | null;
  recovered: boolean;
}> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw === null) return { data: null, recovered: false };
  try {
    return { data: decodeData(raw), recovered: false };
  } catch {
    const backup = await AsyncStorage.getItem(BACKUP_KEY);
    if (backup) {
      try {
        return { data: decodeData(backup), recovered: true };
      } catch {
        /* Preserve both damaged files until explicit recovery. */
      }
    }
    throw new Error(
      "Não foi possível ler o salvamento. Seus arquivos foram preservados. Importe um backup JSON ou tente carregar novamente.",
    );
  }
}
export function saveData(data: AppData): Promise<void> {
  const raw = JSON.stringify(data);
  decodeData(raw);
  const pending = queue
    .catch(() => undefined)
    .then(async () => {
      const previous = await AsyncStorage.getItem(STORAGE_KEY);
      if (previous) {
        try {
          decodeData(previous);
          await AsyncStorage.setItem(BACKUP_KEY, previous);
        } catch {
          /* Never replace a valid backup with corrupted data. */
        }
      }
      await AsyncStorage.setItem(STORAGE_KEY, raw);
    });
  queue = pending;
  return pending;
}
