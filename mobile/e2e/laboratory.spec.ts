import { test, expect, type Page } from "@playwright/test";
import { initialData } from "../src/data/defaults";
import type { AppData } from "../src/models/types";

const KEY = "@roleta/native/v1";
async function boot(page: Page, data = initialData()) {
  await page.addInitScript(
    ({ key, data }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(data));
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: async (content: { title?: string; text?: string }) => {
          sessionStorage.setItem(
            "test-shared-content",
            JSON.stringify(content),
          );
        },
      });
    },
    { key: KEY, data },
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Explorar laboratório", exact: true }),
  ).toBeVisible();
}
async function saved(page: Page): Promise<AppData> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY);
}
async function open(page: Page, title?: string) {
  await page
    .getByRole("button", { name: "Explorar laboratório", exact: true })
    .click();
  if (title)
    await page
      .getByRole("button", { name: `Abrir ${title}`, exact: true })
      .click();
}
async function switchTool(page: Page, title: string) {
  await page
    .getByRole("button", { name: "Voltar às ferramentas", exact: true })
    .click();
  await page
    .getByRole("button", { name: `Abrir ${title}`, exact: true })
    .click();
}

test("laboratory search, categories and mobile layout expose real tools", async ({
  page,
}) => {
  await boot(page);
  await open(page);
  await expect(page.getByRole("button", { name: /^Abrir / })).toHaveCount(12);
  await page.screenshot({
    animations: "disabled",
    path: "docs/v3-laboratory.png",
  });
  await page
    .getByLabel("Buscar ferramenta", { exact: true })
    .fill("estatisticas");
  await expect(page.getByRole("button", { name: /^Abrir / })).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Abrir Estatísticas", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Buscar ferramenta", { exact: true }).fill("");
  await page.getByRole("tab", { name: "Jogar", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Abrir / })).toHaveCount(4);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.screenshot({
    animations: "disabled",
    path: "docs/v3-laboratory-small.png",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  for (const button of await page
    .getByRole("button", { name: /^Abrir / })
    .all()) {
    const bounds = await button.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
  }
});

test("RPG dice validate inputs, persist settings and apply advantage and modifier", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await boot(page);
  await open(page, "Dados de RPG");
  await page.getByLabel("Quantidade de dados", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Rolar dados", exact: true }).click();
  await expect(
    page.getByText("Escolha de 1 a 30 dados.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Entendi", exact: true }).click();
  expect((await saved(page)).lab.dice).toBeNull();
  await page.getByRole("button", { name: "Vantagem", exact: true }).click();
  await page.getByLabel("Modificador", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Rolar dados", exact: true }).click();
  await expect
    .poll(async () => (await saved(page)).lab.dice?.rolls.length)
    .toBe(2);
  const lab = (await saved(page)).lab;
  expect(lab.diceSetup).toEqual({
    count: 1,
    sides: 20,
    modifier: 3,
    mode: "advantage",
  });
  expect(lab.dice!.total).toBe(Math.max(...lab.dice!.rolls) + 3);
  expect(lab.dice!.rolls.every((n) => n >= 1 && n <= 20)).toBe(true);
  await page
    .getByRole("button", { name: "Compartilhar jogada", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => JSON.parse(sessionStorage.getItem("test-shared-content")!).text,
    ),
  ).toContain(String(lab.dice!.total));
  await page.screenshot({ animations: "disabled", path: "docs/v3-dice.png" });
  await page.reload();
  await open(page, "Dados de RPG");
  await expect(page.getByLabel("Faces por dado", { exact: true })).toHaveValue(
    "20",
  );
  await expect(page.getByLabel("Modificador", { exact: true })).toHaveValue(
    "3",
  );
  expect((await saved(page)).lab.dice).toEqual(lab.dice);
  expect(errors).toEqual([]);
});

test("card deck survives reload and successive hands never reuse drawn cards", async ({
  page,
}) => {
  await boot(page);
  await open(page, "Baralho");
  await page
    .getByRole("switch", { name: "Incluir coringas", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Preparar baralho", exact: true })
    .click();
  await expect.poll(async () => (await saved(page)).lab.deck.length).toBe(54);
  await page.getByLabel("Cartas para comprar", { exact: true }).fill("10");
  await page
    .getByRole("button", { name: "Comprar cartas", exact: true })
    .click();
  await expect.poll(async () => (await saved(page)).lab.deck.length).toBe(44);
  const first = (await saved(page)).lab;
  expect(first.hand).toHaveLength(10);
  expect(
    new Set([...first.hand, ...first.deck].map((card) => card.id)).size,
  ).toBe(54);
  await page.screenshot({ animations: "disabled", path: "docs/v3-cards.png" });
  await page.reload();
  await open(page, "Baralho");
  expect((await saved(page)).lab.hand).toEqual(first.hand);
  await page.getByLabel("Cartas para comprar", { exact: true }).fill("10");
  await page
    .getByRole("button", { name: "Comprar cartas", exact: true })
    .click();
  await expect.poll(async () => (await saved(page)).lab.deck.length).toBe(34);
  const second = (await saved(page)).lab;
  expect(
    new Set([...first.hand, ...second.hand].map((card) => card.id)).size,
  ).toBe(20);
  await page.getByRole("button", { name: "Novo baralho", exact: true }).click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  expect((await saved(page)).lab.deck).toEqual(second.deck);
});

test("random order preserves duplicate entries and secret Santa reveals one recipient at a time", async ({
  page,
}) => {
  await boot(page);
  await open(page, "Ordem aleatória");
  await page
    .getByLabel("Lista para embaralhar", { exact: true })
    .fill("Ana, Bia;Ana\nCaio");
  await page
    .getByRole("button", { name: "Embaralhar lista", exact: true })
    .click();
  await expect.poll(async () => (await saved(page)).lab.order.length).toBe(4);
  expect((await saved(page)).lab.order.slice().sort()).toEqual([
    "Ana",
    "Ana",
    "Bia",
    "Caio",
  ]);
  await switchTool(page, "Amigo secreto");
  await page
    .getByLabel("Participantes do amigo secreto", { exact: true })
    .fill("Ana, Bia, Caio, Dani");
  await page
    .getByRole("button", { name: "Sortear amigo secreto", exact: true })
    .click();
  await expect.poll(async () => (await saved(page)).lab.secret.length).toBe(4);
  const pairs = (await saved(page)).lab.secret;
  expect(pairs.every((pair) => pair.giverIndex !== pair.receiverIndex)).toBe(
    true,
  );
  expect(new Set(pairs.map((pair) => pair.receiverIndex)).size).toBe(4);
  await expect(
    page.getByText("SEU AMIGO SECRETO", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "1. Ana", exact: true }).click();
  await expect(
    page.getByText("SEU AMIGO SECRETO", { exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("dialog").getByText(pairs[0]!.receiver, { exact: true }),
  ).toHaveCount(2);
  await page.screenshot({ animations: "disabled", path: "docs/v3-secret.png" });
  await page
    .getByRole("button", { name: "Ocultar resultado", exact: true })
    .click();
  await expect(
    page.getByText("SEU AMIGO SECRETO", { exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await open(page, "Amigo secreto");
  expect((await saved(page)).lab.secret).toEqual(pairs);
  await expect(
    page.getByText("SEU AMIGO SECRETO", { exact: true }),
  ).toHaveCount(0);
});

test("tournament handles a bye, produces a champion, undoes and restores the bracket", async ({
  page,
}) => {
  await boot(page);
  await open(page, "Torneio");
  await page
    .getByLabel("Participantes do torneio", { exact: true })
    .fill("Ana, Bia, Caio");
  await page
    .getByRole("button", { name: "Montar torneio", exact: true })
    .click();
  await expect
    .poll(async () => (await saved(page)).lab.tournament?.participants.length)
    .toBe(3);
  await expect(
    page.getByText("Avança automaticamente nesta rodada.", { exact: true }),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: /^Sortear vencedor · partida/ })
    .click();
  await expect
    .poll(async () => (await saved(page)).lab.tournament?.decisions.length)
    .toBe(1);
  await page
    .getByRole("button", { name: "Próxima rodada", exact: true })
    .click();
  await page
    .getByRole("button", { name: /^Vencedor / })
    .first()
    .click();
  await expect(
    page.getByText("CAMPEÃO DO TORNEIO", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => (await saved(page)).lab.tournament?.decisions.length)
    .toBe(2);
  await page.screenshot({
    animations: "disabled",
    path: "docs/v3-tournament.png",
  });
  const complete = (await saved(page)).lab.tournament!;
  await page
    .getByRole("button", { name: "Desfazer último resultado", exact: true })
    .click();
  await expect(
    page.getByText("CAMPEÃO DO TORNEIO", { exact: true }),
  ).toHaveCount(0);
  await expect
    .poll(async () => (await saved(page)).lab.tournament?.decisions.length)
    .toBe(1);
  await page.reload();
  await open(page, "Torneio");
  const restored = (await saved(page)).lab.tournament!;
  expect(restored.participants).toEqual(complete.participants);
  expect(restored.seeds).toEqual(complete.seeds);
  expect(restored.decisions).toEqual(complete.decisions.slice(0, 1));
  await page
    .getByRole("button", { name: "Próxima rodada", exact: true })
    .click();
  await page
    .getByRole("button", { name: /^Sortear vencedor · partida/ })
    .click();
  await expect(
    page.getByText("CAMPEÃO DO TORNEIO", { exact: true }),
  ).toBeVisible();
});

test("date filtering handles leap day and timer resumes across panel closure and reload", async ({
  page,
}) => {
  await boot(page);
  await open(page, "Sorteio de datas");
  await page
    .getByLabel("Data inicial (AAAA-MM-DD)", { exact: true })
    .fill("2024-02-28");
  await page
    .getByLabel("Data final (AAAA-MM-DD)", { exact: true })
    .fill("2024-03-03");
  for (const day of ["Dom", "Seg", "Ter", "Qua", "Sex", "Sáb"])
    await page.getByRole("checkbox", { name: day, exact: true }).click();
  await page
    .getByRole("button", { name: "Sortear datas", exact: true })
    .click();
  await expect
    .poll(async () => (await saved(page)).lab.dates)
    .toEqual(["2024-02-29"]);
  await page
    .getByLabel("Data inicial (AAAA-MM-DD)", { exact: true })
    .fill("2024-02-30");
  await page
    .getByRole("button", { name: "Sortear datas", exact: true })
    .click();
  await expect(
    page.getByText("Use uma data válida entre 1900 e 2100.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Entendi", exact: true }).click();
  expect((await saved(page)).lab.dates).toEqual(["2024-02-29"]);
  await expect(
    page.getByLabel("Data inicial (AAAA-MM-DD)", { exact: true }),
  ).toHaveValue("2024-02-30");
  expect((await saved(page)).lab.dateSetup).toEqual({
    start: "2024-02-28",
    end: "2024-03-03",
    weekdays: [4],
    quantity: 1,
  });

  await switchTool(page, "Temporizador");
  await page.getByLabel("Duração em segundos", { exact: true }).fill("90");
  await page
    .getByRole("button", { name: "Definir duração", exact: true })
    .click();
  await expect(page.getByLabel("Tempo restante", { exact: true })).toHaveText(
    "01:30",
  );
  await page.getByRole("button", { name: "Iniciar", exact: true }).click();
  await expect
    .poll(async () => (await saved(page)).lab.timer.endsAt)
    .not.toBeNull();
  const end = (await saved(page)).lab.timer.endsAt!;
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.reload();
  await open(page, "Temporizador");
  expect((await saved(page)).lab.timer.endsAt).toBe(end);
  await expect(
    page.getByLabel("Tempo restante", { exact: true }),
  ).not.toHaveText("01:30");
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  await expect
    .poll(async () => (await saved(page)).lab.timer.endsAt)
    .toBeNull();
  const remaining = (await saved(page)).lab.timer.remainingMs;
  expect(remaining).toBeLessThan(90000);
  expect(remaining).toBeGreaterThan(0);
  await page.screenshot({ animations: "disabled", path: "docs/v3-timer.png" });
});

test("list studio keeps exact names, saves a backup and preserves other modalities", async ({
  page,
}) => {
  const data = initialData();
  data.lists.words = ["Antes A", "Antes B"];
  data.lists.powers = ["Poder preservado"];
  await boot(page, data);
  await open(page, "Estúdio de listas");
  await page
    .getByLabel("Lista no estúdio", { exact: true })
    .fill("  Zeta  \nAna, Bia\nZeta\nÁlvaro\nana");
  await page
    .getByRole("button", { name: "Remover duplicatas exatas", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ordenar de A a Z", exact: true })
    .click();
  await expect(
    page.getByLabel("Lista no estúdio", { exact: true }),
  ).toHaveValue("Álvaro\nana\nAna, Bia\nZeta");
  await page.screenshot({
    animations: "disabled",
    path: "docs/v3-list-studio.png",
  });
  await page
    .getByRole("button", { name: "Aplicar lista à roleta", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(
    page.getByLabel("Lista no estúdio", { exact: true }),
  ).toHaveValue("Álvaro\nana\nAna, Bia\nZeta");
  expect((await saved(page)).lists.words).toEqual(data.lists.words);

  await page
    .getByRole("button", { name: "Aplicar lista à roleta", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Aplicar lista", exact: true })
    .click();
  await page.getByRole("button", { name: "Entendi", exact: true }).click();
  await expect
    .poll(async () => (await saved(page)).lists.words)
    .toEqual(["Álvaro", "ana", "Ana, Bia", "Zeta"]);
  const after = await saved(page);
  expect(after.lists.powers).toEqual(data.lists.powers);
  expect(after.lists.creator).toEqual(data.lists.creator);
  expect(after.characters).toEqual(data.characters);
  expect(after.presets).toHaveLength(1);
  expect(after.presets[0]!.config).toMatchObject({
    mode: "words",
    options: data.lists.words,
  });
  await page.reload();
  expect((await saved(page)).lists.words).toEqual(after.lists.words);
});

test("statistics use real wheel and batch history and share filtered CSV", async ({
  page,
}) => {
  const data = initialData();
  data.preferences.duration = 1000;
  data.ranges.numbers = { min: 7, max: 7, step: 1 };
  await boot(page, data);
  await page.getByRole("button", { name: "Girar roleta", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Fechar resultado", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Fechar resultado", exact: true })
    .click();
  await expect.poll(async () => (await saved(page)).history.length).toBe(1);
  await open(page);
  await page
    .getByRole("button", { name: "Abrir Sorteio em lote", exact: true })
    .click();
  await page.getByLabel("Quantidade de resultados", { exact: true }).fill("3");
  await page
    .getByRole("button", { name: "Sortear em lote", exact: true })
    .click();
  await expect.poll(async () => (await saved(page)).history.length).toBe(4);
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await open(page, "Estatísticas");
  await expect(
    page.getByText("4 ocorrência(s) · 100% dos resultados filtrados", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Somente lotes", exact: true })
    .click();
  await expect(
    page.getByText("3 ocorrência(s) · 100% dos resultados filtrados", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Compartilhar histórico em CSV", exact: true })
    .click();
  const csv = await page.evaluate(
    () =>
      JSON.parse(sessionStorage.getItem("test-shared-content")!).text as string,
  );
  expect(csv.split("\r\n")).toHaveLength(4);
  expect(csv.match(/"lote"/g)).toHaveLength(3);
  expect(csv).not.toContain('"roleta"');
  await page
    .getByRole("button", { name: "Giros individuais", exact: true })
    .click();
  await expect(
    page.getByText("1 ocorrência(s) · 100% dos resultados filtrados", {
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({
    animations: "disabled",
    path: "docs/v3-statistics.png",
  });
});
