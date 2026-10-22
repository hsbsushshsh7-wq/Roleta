import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialData } from "../src/data/defaults";
import { decodeData } from "../src/storage/schema";
import {
  BACKUP_KEY,
  loadData,
  saveData,
  STORAGE_KEY,
} from "../src/storage/persistence";
const storage = vi.hoisted(() => new Map<string, string>());
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
  },
}));
beforeEach(() => storage.clear());
describe("local persistence and JSON validation", () => {
  it("roundtrips all modes, Unicode, characters, defaults and preferences", async () => {
    const data = initialData();
    data.mode = "creator";
    data.preferences.repeat = false;
    data.lists.words = ["ação", "São Paulo"];
    await saveData(data);
    expect((await loadData()).data).toEqual(data);
    expect(decodeData(JSON.stringify(data))).toEqual(data);
  });
  it("serializes writes to prevent an old autosave overwriting a new one", async () => {
    const one = initialData();
    const two = { ...one, mode: "words" as const };
    await Promise.all([saveData(one), saveData(two)]);
    expect((await loadData()).data?.mode).toBe("words");
    expect(decodeData(storage.get(BACKUP_KEY)!).mode).toBe("numbers");
  });
  it("recovers the previous valid state from a corrupted save", async () => {
    storage.set(STORAGE_KEY, "corrupted");
    storage.set(BACKUP_KEY, JSON.stringify(initialData()));
    expect((await loadData()).recovered).toBe(true);
    expect(storage.get(STORAGE_KEY)).toBe("corrupted");
  });
  it("preserves corrupted files when recovery is impossible", async () => {
    storage.set(STORAGE_KEY, "bad");
    await expect(loadData()).rejects.toThrow();
    expect(storage.get(STORAGE_KEY)).toBe("bad");
  });
  it("handles first installation without a save", async () =>
    expect((await loadData()).data).toBeNull());
  it("rejects invalid JSON, incompatible schemas and unsafe ranges", () => {
    expect(() => decodeData("{")).toThrow();
    expect(() => decodeData('{"version":2}')).toThrow();
    const data = initialData();
    data.ranges.numbers.min = 15;
    expect(() => decodeData(JSON.stringify(data))).toThrow();
  });
  it("rejects invalid character selection, duplicate IDs and stray result keys", () => {
    const data = initialData();
    data.activeCharacter = "missing";
    expect(() => decodeData(JSON.stringify(data))).toThrow();
    data.activeCharacter = data.characters[0]!.id;
    data.characters.push(data.characters[0]!);
    expect(() => decodeData(JSON.stringify(data))).toThrow();
    data.characters.pop();
    data.characters[0]!.results.unknown = "Goku";
    expect(() => decodeData(JSON.stringify(data))).toThrow();
  });
  it("rejects oversized files and dangerous object keys", () => {
    expect(() => decodeData(" ".repeat(16 * 1024 * 1024 + 1))).toThrow();
    const data = initialData();
    data.categories[0]!.id = "__proto__";
    expect(() => decodeData(JSON.stringify(data))).toThrow();
  });
});
