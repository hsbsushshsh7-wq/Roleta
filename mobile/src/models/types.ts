import type { Laboratory } from "./laboratory";
export const MODES = [
  "numbers",
  "percentage",
  "words",
  "powers",
  "creator",
] as const;
export type Mode = (typeof MODES)[number];
export interface Range {
  min: number;
  max: number;
  step: number;
}
export interface Category {
  id: string;
  name: string;
}
export interface Character {
  id: string;
  categories: Category[];
  results: Record<string, string>;
  target: string | null;
}
export interface Draw {
  id: string;
  mode: Mode;
  value: string;
  index: number;
  count: number;
  at: string;
  characterId?: string;
  categoryId?: string;
  sessionId?: string;
  categoryName?: string;
  tool?: "batch";
}
export interface Preferences {
  sound: boolean;
  resultPopup: boolean;
  focusMode: boolean;
  haptics: boolean;
  duration: number;
  repeat: boolean;
  appearance: "soft" | "neutral";
}
export interface Distribution {
  format?: "relative";
  base: number;
  overrides: Record<string, number>;
}
export interface WheelAppearance {
  palette: "classic" | "pastel" | "neon" | "ocean" | "sunset";
  overrides: Record<string, string>;
  showLabels: boolean;
  title: string;
}
export interface ModeRules {
  appearance: WheelAppearance;
  chance: boolean;
  noRepeat: boolean;
  distribution: Distribution;
  drawn: number[];
  sessionId: string;
}
export type PresetConfiguration =
  | { mode: "numbers"; range: Range; rules: ModeRules }
  | { mode: "percentage"; range: Range; rules: ModeRules }
  | { mode: "words"; options: string[]; rules: ModeRules }
  | { mode: "powers"; options: string[]; rules: ModeRules }
  | {
      mode: "creator";
      options: string[];
      rules: ModeRules;
      categories: Category[];
      characters: Character[];
      activeCharacter: string;
    };
export interface Preset {
  id: string;
  name: string;
  createdAt: string;
  config: PresetConfiguration;
}
export interface WheelLayout {
  count: number;
  boundaries: number[];
}
export interface AppData {
  lab: Laboratory;
  version: 1;
  mode: Mode;
  ranges: { numbers: Range; percentage: Range };
  lists: { words: string[]; powers: string[]; creator: string[] };
  defaults: { powers: string[]; creator: string[] };
  categories: Category[];
  characters: Character[];
  activeCharacter: string;
  preferences: Preferences;
  history: Draw[];
  rules: Record<Mode, ModeRules>;
  presets: Preset[];
  toolbox: {
    batchResults: string[];
    teams: string[][];
    generatedAt: string | null;
  };
}
export interface OptionSource {
  count: number;
  label: (index: number) => string;
}
export interface SpinPlan {
  index: number;
  value: string;
  count: number;
  displayCount: number;
  visualIndex: number;
  angle: number;
}
