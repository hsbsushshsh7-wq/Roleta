import type { AppData, Draw, Range } from "../models/types";
import { getSource } from "./options";
import { planSpin, uniformIndex, type RandomWords } from "./draw";
import { availableCount, defaultRules } from "./rules";
import { newId } from "../data/ids";
import { savePreset } from "./presets";
export function drawBatch(
  data: AppData,
  quantity: number,
  random: RandomWords,
): AppData {
  if (data.mode === "creator")
    throw new Error(
      "No criador, use os giros individuais para preencher a ficha.",
    );
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100)
    throw new Error("Escolha de 1 a 100 resultados.");
  const source = getSource(data);
  let rules = data.rules[data.mode];
  const available = availableCount(rules, source.count);
  if (!available)
    throw new Error("Nenhuma opção elegível. Use RESET ou ajuste as chances.");
  if (rules.noRepeat && quantity > available)
    throw new Error(
      `Restam ${available} opções. Reduza a quantidade ou use RESET.`,
    );
  const draws: Draw[] = [];
  const at = new Date().toISOString();
  for (let i = 0; i < quantity; i++) {
    const plan = planSpin(source, 0, random, rules);
    draws.push({
      id: newId("batch"),
      tool: "batch",
      mode: data.mode,
      value: plan.value,
      index: plan.index,
      count: plan.count,
      at,
      sessionId: rules.sessionId,
    });
    if (!rules.drawn.includes(plan.index))
      rules = { ...rules, drawn: [...rules.drawn, plan.index] };
  }
  return {
    ...data,
    rules: { ...data.rules, [data.mode]: rules },
    history: [...draws].reverse().concat(data.history).slice(0, 200),
    toolbox: {
      ...data.toolbox,
      batchResults: draws.map((d) => d.value),
      generatedAt: at,
    },
  };
}
export function balancedTeams(
  names: string[],
  count: number,
  random: RandomWords,
): string[][] {
  if (names.length < 2 || names.length > 5000)
    throw new Error("Use uma lista de 2 a 5.000 participantes.");
  if (
    !Number.isInteger(count) ||
    count < 2 ||
    count > 20 ||
    count > names.length
  )
    throw new Error(
      "Escolha de 2 a 20 equipes, sem ultrapassar o número de participantes.",
    );
  const shuffled = [...names];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = uniformIndex(i + 1, random);
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  const teams = Array.from({ length: count }, () => [] as string[]);
  shuffled.forEach((name, i) => teams[i % count]!.push(name));
  return teams;
}
export type QuickTemplate =
  | {
      id: string;
      title: string;
      description: string;
      badge: string;
      mode: "words";
      options: string[];
    }
  | {
      id: string;
      title: string;
      description: string;
      badge: string;
      mode: "numbers";
      range: Range;
    };
export const QUICK_TEMPLATES: QuickTemplate[] = [
  {
    id: "yesno",
    title: "Sim ou não",
    description: "Uma decisão, duas possibilidades",
    badge: "?",
    mode: "words",
    options: ["Sim", "Não"],
  },
  {
    id: "coin",
    title: "Cara ou coroa",
    description: "Sua moeda de bolso",
    badge: "◐",
    mode: "words",
    options: ["Cara", "Coroa"],
  },
  {
    id: "dice",
    title: "Dado de 6 faces",
    description: "Para jogos e desafios",
    badge: "D6",
    mode: "numbers",
    range: { min: 1, max: 6, step: 1 },
  },
  {
    id: "rpg",
    title: "Dado de RPG",
    description: "Vinte caminhos para a aventura",
    badge: "D20",
    mode: "numbers",
    range: { min: 1, max: 20, step: 1 },
  },
  {
    id: "letters",
    title: "Letras",
    description: "De A a Z, sem complicar",
    badge: "Aa",
    mode: "words",
    options: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  },
  {
    id: "days",
    title: "Dia da semana",
    description: "Encontre um dia para acontecer",
    badge: "7",
    mode: "words",
    options: [
      "Segunda-feira",
      "Terça-feira",
      "Quarta-feira",
      "Quinta-feira",
      "Sexta-feira",
      "Sábado",
      "Domingo",
    ],
  },
];
export function applyTemplate(data: AppData, template: QuickTemplate): AppData {
  const target = { ...data, mode: template.mode };
  const hasOptions = getSource(target).count > 0;
  const preserved = hasOptions
    ? savePreset(
        target,
        `Antes de ${template.title} · ${newId("copia").slice(-14)}`,
      )
    : target;
  const rules = defaultRules();
  rules.appearance.title = template.title;
  rules.sessionId = newId("session");
  return {
    ...preserved,
    mode: template.mode,
    rules: { ...preserved.rules, [template.mode]: rules },
    ...(template.mode === "words"
      ? { lists: { ...preserved.lists, words: [...template.options] } }
      : { ranges: { ...preserved.ranges, numbers: { ...template.range } } }),
  };
}
