import { exportData, importData } from "../src/services/transfer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialData } from "../src/data/defaults";
const native = vi.hoisted(() => ({
  files: new Map<string, { contents: string; modified: number }>(),
  picker: vi.fn(),
  share: vi.fn(),
  available: vi.fn(),
}));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("expo-sharing", () => ({
  shareAsync: native.share,
  isAvailableAsync: native.available,
}));
vi.mock("expo-document-picker", () => ({ getDocumentAsync: native.picker }));
vi.mock("expo-file-system", () => {
  class Directory {
    uri: string;
    constructor(parent: string, name: string) {
      this.uri = `${parent}/${name}`;
    }
    create() {}
    list() {
      return [...native.files.keys()]
        .filter((k) => k.startsWith(this.uri))
        .map((k) => new File(k));
    }
  }
  class File {
    uri: string;
    constructor(parent: string | Directory, name?: string) {
      this.uri = name
        ? `${typeof parent === "string" ? parent : parent.uri}/${name}`
        : (parent as string);
    }
    get exists() {
      return native.files.has(this.uri);
    }
    get modificationTime() {
      return native.files.get(this.uri)?.modified ?? null;
    }
    write(contents: string) {
      native.files.set(this.uri, { contents, modified: Date.now() });
    }
    async text() {
      return native.files.get(this.uri)?.contents ?? "";
    }
    delete() {
      native.files.delete(this.uri);
    }
  }
  return { File, Directory, Paths: { cache: "cache:" } };
});
beforeEach(() => {
  native.files.clear();
  native.picker.mockReset();
  native.share.mockReset();
  native.available.mockResolvedValue(true);
});
describe("native file transfer integration", () => {
  it("exports complete JSON and keeps the file available to the receiving application", async () => {
    const data = initialData();
    await exportData(data);
    expect(native.share).toHaveBeenCalledOnce();
    const uri = native.share.mock.calls[0]![0] as string;
    expect(JSON.parse(native.files.get(uri)!.contents)).toEqual(data);
  });
  it("removes only stale exports older than seven days", async () => {
    native.files.set("cache:/roleta-exports/old.json", {
      contents: "old",
      modified: 0,
    });
    native.files.set("cache:/roleta-exports/recent.json", {
      contents: "recent",
      modified: Date.now(),
    });
    await exportData(initialData());
    expect(native.files.has("cache:/roleta-exports/old.json")).toBe(false);
    expect(native.files.has("cache:/roleta-exports/recent.json")).toBe(true);
  });
  it("reports unavailable sharing without creating a dangling export", async () => {
    native.available.mockResolvedValue(false);
    await expect(exportData(initialData())).rejects.toThrow();
    expect(native.files.size).toBe(0);
  });
  it("imports a native file and removes only its temporary copy", async () => {
    const data = initialData();
    native.files.set("cache:/import.json", {
      contents: JSON.stringify(data),
      modified: Date.now(),
    });
    native.picker.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "cache:/import.json" }],
    });
    expect(await importData()).toEqual(data);
    expect(native.files.has("cache:/import.json")).toBe(false);
  });
  it("rejects incompatible data before returning an imported state", async () => {
    native.files.set("cache:/bad.json", {
      contents: '{"version":99}',
      modified: Date.now(),
    });
    native.picker.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "cache:/bad.json" }],
    });
    await expect(importData()).rejects.toThrow();
    expect(native.files.has("cache:/bad.json")).toBe(false);
  });
  it("supports cancelling the file picker without changing data", async () => {
    native.picker.mockResolvedValue({ canceled: true });
    expect(await importData()).toBeNull();
    expect(native.files.size).toBe(0);
  });
});
