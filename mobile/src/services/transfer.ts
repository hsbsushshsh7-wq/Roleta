import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { Platform } from "react-native";
import { decodeData, MAX_JSON_SIZE } from "../storage/schema";
import type { AppData } from "../models/types";
export async function exportData(data: AppData): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  const name = `roleta-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(
      new Blob([json], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("Compartilhamento indisponível neste dispositivo.");
  const directory = new Directory(Paths.cache, "roleta-exports");
  directory.create({ idempotent: true, intermediates: true });
  // Keep the current export readable by the receiving app after the share sheet closes.
  // Old files are expendable cache and are removed on the next export after seven days.
  for (const entry of directory.list()) {
    if (
      entry instanceof File &&
      entry.modificationTime !== null &&
      entry.modificationTime < Date.now() - 7 * 86400000
    )
      entry.delete();
  }
  const file = new File(directory, name);
  file.write(json);
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/json",
    UTI: "public.json",
    dialogTitle: "Salvar backup da Roleta",
  });
}
export async function importData(): Promise<AppData | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/plain"],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  if ((asset.size ?? 0) > MAX_JSON_SIZE)
    throw new Error("O arquivo excede 16 MB.");
  try {
    const raw =
      Platform.OS === "web" && asset.file
        ? await asset.file.text()
        : await new File(asset.uri).text();
    return decodeData(raw);
  } finally {
    if (Platform.OS !== "web") {
      const file = new File(asset.uri);
      if (file.exists) file.delete();
    }
  }
}
