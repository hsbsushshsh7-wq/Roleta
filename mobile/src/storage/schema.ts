import { z } from "zod";
import {
  initialRules,
  distributionTotal,
  migrateDistribution,
} from "../engine/rules";
import { getSource, rangeCount } from "../engine/options";
import { MODES } from "../models/types";
import type { AppData } from "../models/types";
import { laboratorySchema } from "./laboratorySchema";
const text = z.string().trim().min(1).max(500);
const id = z
  .string()
  .min(1)
  .max(120)
  .refine((s) => !["__proto__", "constructor", "prototype"].includes(s));
const list = z.array(text).max(50000);
const category = z.object({ id, name: text });
const categories = z
  .array(category)
  .min(1)
  .max(50)
  .refine(
    (items) => new Set(items.map((c) => c.id)).size === items.length,
    "Categorias duplicadas.",
  );
const range = z.object({ min: z.number(), max: z.number(), step: z.number() });
const character = z
  .object({
    id,
    categories,
    results: z.record(id, text),
    target: id.nullable(),
  })
  .superRefine((c, ctx) => {
    const ids = new Set(c.categories.map((x) => x.id));
    if (
      Object.keys(c.results).some((k) => !ids.has(k)) ||
      (c.target !== null && !ids.has(c.target))
    )
      ctx.addIssue({
        code: "custom",
        message: "Ficha contém categoria desconhecida.",
      });
  });
const modeSchema = z.enum(MODES);
const distribution = z.object({
  format: z.literal("relative").optional(),
  base: z.number().finite().nonnegative().max(1e16),
  overrides: z
    .record(
      z.string().regex(/^(0|[1-9]\d*)$/),
      z.number().finite().nonnegative().max(1e16),
    )
    .refine((v) => Object.keys(v).length <= 50000),
});
const appearanceSchema = z.object({
  palette: z.enum(["classic", "pastel", "neon", "ocean", "sunset"]),
  overrides: z
    .record(
      z.string().regex(/^(0|[1-9]\d*)$/),
      z.string().regex(/^#[0-9a-fA-F]{6}$/),
    )
    .refine((v) => Object.keys(v).length <= 50000),
  showLabels: z.boolean(),
  title: z.string().max(80),
});
const rulesSchema = z.object({
  appearance: appearanceSchema.default(() => ({
    palette: "classic" as const,
    overrides: {},
    showLabels: true,
    title: "",
  })),
  chance: z.boolean(),
  noRepeat: z.boolean(),
  distribution,
  drawn: z
    .array(z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER))
    .max(500000)
    .refine((v) => new Set(v).size === v.length),
  sessionId: z.string().max(120),
});
function checkRules(
  rules: z.infer<typeof rulesSchema>,
  count: number,
  ctx: z.RefinementCtx,
) {
  if (
    rules.drawn.some((i) => i >= count) ||
    [
      ...Object.keys(rules.distribution.overrides),
      ...Object.keys(rules.appearance.overrides),
    ].some((i) => !Number.isSafeInteger(Number(i)) || Number(i) >= count)
  )
    ctx.addIssue({
      code: "custom",
      message:
        "Chance ou resultado bloqueado aponta para uma opção inexistente.",
    });
  if (count > 0 && !(distributionTotal(rules.distribution, count) > 0))
    ctx.addIssue({
      code: "custom",
      message: "A distribuição precisa conter uma chance positiva.",
    });
}
const creatorFields = {
  categories,
  characters: z.array(character).min(1).max(30),
  activeCharacter: id,
};
function checkCreator(
  c: { characters: z.infer<typeof character>[]; activeCharacter: string },
  ctx: z.RefinementCtx,
) {
  if (
    !c.characters.some((x) => x.id === c.activeCharacter) ||
    new Set(c.characters.map((x) => x.id)).size !== c.characters.length
  )
    ctx.addIssue({
      code: "custom",
      message: "Seleção de personagem inválida.",
    });
}
const presetConfig = z
  .discriminatedUnion("mode", [
    z.object({ mode: z.literal("numbers"), range, rules: rulesSchema }),
    z.object({ mode: z.literal("percentage"), range, rules: rulesSchema }),
    z.object({ mode: z.literal("words"), options: list, rules: rulesSchema }),
    z.object({ mode: z.literal("powers"), options: list, rules: rulesSchema }),
    z.object({
      mode: z.literal("creator"),
      options: list,
      rules: rulesSchema,
      ...creatorFields,
    }),
  ])
  .superRefine((c, ctx) => {
    try {
      const count =
        c.mode === "numbers" || c.mode === "percentage"
          ? rangeCount(c.range, c.mode === "percentage")
          : c.options.length;
      checkRules(c.rules, count, ctx);
      if (c.mode === "creator") checkCreator(c, ctx);
    } catch (e) {
      ctx.addIssue({ code: "custom", message: (e as Error).message });
    }
  });
export const dataSchema = z
  .object({
    version: z.literal(1),
    lab: laboratorySchema,
    mode: modeSchema,
    ranges: z.object({ numbers: range, percentage: range }),
    lists: z.object({ words: list, powers: list, creator: list }),
    defaults: z.object({ powers: list, creator: list }),
    ...creatorFields,
    preferences: z.object({
      sound: z.boolean(),
      resultPopup: z.boolean().default(true),
      focusMode: z.boolean().default(false),
      haptics: z.boolean(),
      duration: z.number().min(1000).max(15000),
      repeat: z.boolean(),
      appearance: z.enum(["soft", "neutral"]),
    }),
    toolbox: z
      .object({
        batchResults: z.array(text).max(100),
        teams: z
          .array(z.array(text).max(5000))
          .max(20)
          .refine((t) => t.reduce((n, g) => n + g.length, 0) <= 5000),
        generatedAt: z.iso.datetime().nullable(),
      })
      .default(() => ({ batchResults: [], teams: [], generatedAt: null })),
    history: z
      .array(
        z
          .object({
            id,
            mode: modeSchema,
            value: text,
            index: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
            count: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
            at: z.iso.datetime(),
            characterId: id.optional(),
            categoryId: id.optional(),
            categoryName: text.optional(),
            tool: z.literal("batch").optional(),
            sessionId: z.string().max(120).optional(),
          })
          .refine((d) => d.index < d.count),
      )
      .max(200),
    rules: z
      .object({
        numbers: rulesSchema,
        percentage: rulesSchema,
        words: rulesSchema,
        powers: rulesSchema,
        creator: rulesSchema,
      })
      .optional(),
    presets: z
      .array(
        z.object({
          id,
          name: z.string().trim().min(1).max(80),
          createdAt: z.iso.datetime(),
          config: presetConfig,
        }),
      )
      .max(100)
      .default([])
      .refine(
        (items) =>
          new Set(items.map((p) => p.id)).size === items.length &&
          new Set(items.map((p) => p.name.toLocaleLowerCase("pt-BR"))).size ===
            items.length,
        "Predefinições duplicadas.",
      ),
  })
  .transform((data) => {
    const rules = data.rules ?? initialRules();
    for (const mode of MODES) {
      if (!data.rules) rules[mode].noRepeat = !data.preferences.repeat;
      try {
        const source = getSource(data, mode);
        rules[mode].distribution = migrateDistribution(
          rules[mode].distribution,
          source.count,
        );
        if (!data.rules)
          rules[mode].drawn = [
            ...new Set(
              data.history
                .filter(
                  (d) =>
                    d.mode === mode &&
                    d.count === source.count &&
                    source.label(d.index) === d.value,
                )
                .map((d) => d.index),
            ),
          ];
      } catch {
        /* Interval validation below reports malformed ranges. */
      }
    }
    const presets = data.presets.map((p) => {
      const c = p.config;
      const count =
        c.mode === "numbers" || c.mode === "percentage"
          ? rangeCount(c.range, c.mode === "percentage")
          : c.options.length;
      return {
        ...p,
        config: {
          ...c,
          rules: {
            ...c.rules,
            distribution: migrateDistribution(c.rules.distribution, count),
          },
        },
      };
    });
    return { ...data, rules, presets };
  })
  .superRefine((data, ctx) => {
    try {
      rangeCount(data.ranges.numbers);
      rangeCount(data.ranges.percentage, true);
      for (const mode of MODES)
        checkRules(data.rules[mode], getSource(data, mode).count, ctx);
    } catch (e) {
      ctx.addIssue({ code: "custom", message: (e as Error).message });
    }
    checkCreator(data, ctx);
  });
export const MAX_JSON_SIZE = 16 * 1024 * 1024;
export function decodeData(raw: string): AppData {
  if (raw.length > MAX_JSON_SIZE) throw new Error("O arquivo excede 16 MB.");
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("JSON inválido. Nenhum dado foi alterado.");
  }
  const result = dataSchema.safeParse(json);
  if (!result.success)
    throw new Error(
      `Dados incompatíveis: ${result.error.issues[0]?.message ?? "formato desconhecido"}. Nenhum dado foi alterado.`,
    );
  return result.data;
}
