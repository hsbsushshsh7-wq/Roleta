import { test, expect, type Page } from "@playwright/test";
import { initialData } from "../src/data/defaults";
const KEY = "@roleta/native/v1";
async function boot(page: Page, creator = false, count = 9) {
  const data = initialData();
  data.preferences.duration = 1000;
  if (creator) data.mode = "creator";
  if (count !== 9)
    data.lists.creator = Array.from(
      { length: count },
      (_, i) => `Fixture ${i + 1}`,
    );
  await page.addInitScript(
    ({ key, data }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(data));
    },
    { key: KEY, data },
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Predefinições", exact: true }),
  ).toBeVisible();
}
async function mode(page: Page, title: string) {
  await page.getByRole("button", { name: /Tipo de roleta:/ }).click();
  await page.getByRole("radio", { name: title, exact: true }).click();
}
async function alignToTop(page: Page, text: string) {
  await page.getByText(text, { exact: true }).evaluate((el) => {
    let parent = el.parentElement;
    while (parent) {
      if (
        parent.scrollHeight > parent.clientHeight &&
        /auto|scroll/.test(getComputedStyle(parent).overflowY)
      ) {
        parent.scrollTop +=
          el.getBoundingClientRect().top -
          parent.getBoundingClientRect().top -
          20;
        return;
      }
      parent = parent.parentElement;
    }
  });
}
async function spin(page: Page) {
  const before = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).history.length,
    KEY,
  );
  await page.getByRole("button", { name: "Girar roleta", exact: true }).click();
  await expect
    .poll(async () =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).history.length,
        KEY,
      ),
    )
    .toBe(before + 1);
  await expect(
    page.getByRole("button", { name: "Girar novamente", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Fechar resultado", exact: true })
    .click();
}
test("numeric, percentage, words and powers work and persist independently", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await boot(page);
  await spin(page);
  await page.getByLabel("Começa em", { exact: true }).fill("-3");
  await page.getByLabel("Termina em", { exact: true }).fill("0");
  await page
    .getByRole("button", { name: "Atualizar intervalo", exact: true })
    .click();
  await page.getByRole("button", { name: "Entendi", exact: true }).click();
  await spin(page);
  await mode(page, "Porcentagem");
  await page.getByLabel("Começa em", { exact: true }).fill("0");
  await page.getByLabel("Termina em", { exact: true }).fill("1");
  await page.getByLabel("Passo (%)", { exact: true }).fill("0,25");
  await page
    .getByRole("button", { name: "Atualizar intervalo", exact: true })
    .click();
  await page.getByRole("button", { name: "Entendi", exact: true }).click();
  await spin(page);
  await mode(page, "Palavras");
  await page
    .getByLabel("Lista de opções", { exact: true })
    .fill("São Paulo,\nOlá; Mundo");
  await page
    .getByRole("button", { name: "Atualizar lista", exact: true })
    .click();
  await page.getByRole("button", { name: "Entendi", exact: true }).click();
  await spin(page);
  await mode(page, "Poderes de anime");
  await page
    .getByLabel("Lista de opções", { exact: true })
    .fill("Poder do usuário 1, Poder do usuário 2");
  await page
    .getByRole("button", { name: "Atualizar lista", exact: true })
    .click();
  await page.getByRole("button", { name: "Entendi", exact: true }).click();
  await spin(page);
  await page.reload();
  await expect(page.getByLabel("Lista de opções", { exact: true })).toHaveValue(
    "Poder do usuário 1,\nPoder do usuário 2",
  );
  const data = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    KEY,
  );
  expect(data.history).toHaveLength(5);
  expect(data.ranges.numbers).toEqual({ min: -3, max: 0, step: 1 });
  expect(data.lists.words).toHaveLength(3);
  expect(errors).toEqual([]);
});
test("400-slice character wheel fills multiple independent sheets, completes and resets", async ({
  page,
}) => {
  await boot(page, true, 400);
  await alignToTop(page, "ELENCO ATUAL");
  await page.screenshot({ path: "docs/creator-wheel-400-fixture.png" });
  await page.getByLabel("Personagens", { exact: true }).fill("2");
  await page
    .getByRole("button", { name: "Atualizar personagens", exact: true })
    .click();
  await spin(page);
  await page.getByRole("tab", { name: "Personagem 2", exact: true }).click();
  await spin(page);
  let data = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    KEY,
  );
  expect(Object.keys(data.characters[0].results)).toHaveLength(1);
  expect(Object.keys(data.characters[1].results)).toHaveLength(1);
  for (let i = 0; i < 7; i++) await spin(page);
  await expect(
    page.getByText("Personagem 2 completo", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Reiniciar esta ficha", exact: true })
    .click();
  await page.getByRole("button", { name: "Reiniciar", exact: true }).click();
  await expect
    .poll(async () =>
      page.evaluate(
        (key) =>
          Object.keys(
            JSON.parse(localStorage.getItem(key)!).characters[1].results,
          ).length,
        KEY,
      ),
    )
    .toBe(0);
  data = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    KEY,
  );
  expect(Object.keys(data.characters[0].results)).toHaveLength(1);
});
test("category editing preserves filled results after renaming and reordering", async ({
  page,
}) => {
  await boot(page, true);
  await spin(page);
  const value = await page.evaluate(
    (key) =>
      JSON.parse(localStorage.getItem(key)!).characters[0].results[
        "category-1"
      ],
    KEY,
  );
  await page
    .getByRole("button", { name: "Editar categorias", exact: true })
    .click();
  await page.getByLabel("Categoria 1", { exact: true }).fill("Força física");
  await page
    .getByRole("button", { name: "Descer Força física", exact: true })
    .click();
  await page
    .getByLabel("Nova categoria", { exact: true })
    .fill("Minha categoria");
  await page
    .getByRole("button", { name: "Adicionar categoria", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Salvar categorias", exact: true })
    .click();
  await expect
    .poll(async () =>
      page.evaluate(
        (key) =>
          JSON.parse(localStorage.getItem(key)!).characters[0].categories
            .length,
        KEY,
      ),
    )
    .toBe(9);
  const data = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    KEY,
  );
  expect(data.characters[0].results["category-1"]).toBe(value);
  expect(data.characters[0].categories[1].name).toBe("Força física");
});
test("JSON export and import restore all application data", async ({
  page,
}) => {
  await boot(page);
  await spin(page);
  await page
    .getByRole("button", { name: "Configurações", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Preferências e backups", exact: true })
    .click();
  await page
    .getByRole("switch", { name: "Permitir repetição", exact: true })
    .click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportar backup JSON", exact: true })
    .click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  await page
    .getByRole("switch", { name: "Permitir repetição", exact: true })
    .click();
  await expect(
    page.getByRole("switch", { name: "Permitir repetição", exact: true }),
  ).toBeChecked();
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page
      .getByRole("button", { name: "Importar backup JSON", exact: true })
      .click(),
  ]);
  await chooser.setFiles(path!);
  await page
    .getByRole("button", { name: "Importar dados", exact: true })
    .click();
  await expect(
    page.getByRole("switch", { name: "Permitir repetição", exact: true }),
  ).not.toBeChecked();
});
test("visual captures and small/tablet layouts have no horizontal overflow", async ({
  page,
}) => {
  await boot(page);
  await page.screenshot({ path: "docs/numbers-mobile.png" });
  await alignToTop(page, "CONFIGURAÇÃO");
  await page.screenshot({ path: "docs/numbers-config-mobile.png" });
  await page
    .getByRole("button", { name: /Tipo de roleta:/ })
    .scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: /Tipo de roleta:/ }).click();
  await expect(
    page.getByRole("radio", { name: "Palavras", exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(350);
  await page.screenshot({ path: "docs/modes-mobile.png" });
  await page
    .getByRole("radio", { name: "Criador de personagem", exact: true })
    .click();
  await expect(
    page.getByRole("radio", { name: "Palavras", exact: true }),
  ).toHaveCount(0);
  await page.waitForTimeout(350);
  await page.screenshot({ path: "docs/creator-mobile.png", fullPage: true });
  await alignToTop(page, "CONFIGURAÇÃO");
  await page.screenshot({ path: "docs/roster-editor-mobile.png" });
  for (const width of [320, 390, 578, 834]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});

test("prevents simultaneous draws and validates incorrect intervals", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await boot(page);
  await page.getByLabel("Começa em", { exact: true }).fill("10");
  await page.getByLabel("Termina em", { exact: true }).fill("1");
  await page
    .getByRole("button", { name: "Atualizar intervalo", exact: true })
    .click();
  await expect(
    page.getByText("Confira a configuração", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Entendi", exact: true }).click();
  await page.getByRole("button", { name: "Girar roleta", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sorteio em andamento", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Sorteio em andamento", exact: true })
    .dispatchEvent("click");
  await expect
    .poll(async () =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).history.length,
        KEY,
      ),
    )
    .toBe(1);
});
test("confirmation stays above category editor when removing a filled category", async ({
  page,
}) => {
  await boot(page, true);
  await spin(page);
  await page
    .getByRole("button", { name: "Editar categorias", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Remover Força", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Salvar categorias", exact: true })
    .click();
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect
    .poll(async () =>
      page.evaluate(
        (key) =>
          JSON.parse(localStorage.getItem(key)!).characters[0].categories
            .length,
        KEY,
      ),
    )
    .toBe(7);
});

test("presets save chances and no-repeat, reload, overwrite and delete independently", async ({
  page,
}) => {
  await boot(page);
  await page
    .getByRole("button", { name: "Predefinições", exact: true })
    .click();
  await expect(
    page.getByText("Nenhuma predefinição salva.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.getByLabel("Começa em", { exact: true }).fill("0");
  await page.getByLabel("Termina em", { exact: true }).fill("3");
  await page
    .getByRole("button", { name: "Atualizar intervalo", exact: true })
    .click();
  await page.getByRole("button", { name: "Entendi", exact: true }).click();
  await page
    .getByRole("button", { name: "Configurações", exact: true })
    .click();
  await page.getByRole("checkbox", { name: "chance", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "não repetir", exact: true })
    .click();
  await page.getByLabel("Chance de 0, opção 1", { exact: true }).fill("60");
  await page.getByLabel("Chance de 0, opção 1", { exact: true }).press("Tab");
  await expect(
    page.getByLabel("Probabilidade total", { exact: true }),
  ).toHaveText("100%");
  await page.screenshot({ path: "docs/chances-mobile.png" });
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page
    .getByRole("button", { name: "Predefinições", exact: true })
    .click();
  await page
    .getByLabel("Nome da predefinição", { exact: true })
    .fill("Minha escolha");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Carregar Minha escolha", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Nome da predefinição", { exact: true })
    .fill("Outra escolha");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Carregar Outra escolha", exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(350);
  await page.screenshot({ path: "docs/presets-mobile.png" });
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Predefinições", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Configurações", exact: true })
    .click();
  await page.getByRole("checkbox", { name: "chance", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "não repetir", exact: true })
    .click();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page
    .getByRole("button", { name: "Predefinições", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Carregar Minha escolha", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Configurações", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "chance", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "não repetir", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByLabel("Chance de 0, opção 1", { exact: true }),
  ).toHaveValue("60");
  await page.getByRole("button", { name: "Igualar", exact: true }).click();
  await expect(
    page.getByLabel("Chance de 0, opção 1", { exact: true }),
  ).toHaveValue("100");
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page
    .getByRole("button", { name: "Predefinições", exact: true })
    .click();
  await page
    .getByLabel("Nome da predefinição", { exact: true })
    .fill("Minha escolha");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await page.getByRole("button", { name: "Substituir", exact: true }).click();
  await page
    .getByRole("button", { name: "Excluir Outra escolha", exact: true })
    .click();
  await page.getByRole("button", { name: "Excluir", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Carregar Outra escolha", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Carregar Minha escolha", exact: true }),
  ).toBeVisible();
});
test("result popup displays the real draw, repeats a draw, closes and does not reopen on reload", async ({
  page,
}) => {
  await boot(page);
  await page.getByRole("button", { name: "Girar roleta", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Girar novamente", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).history.length,
        KEY,
      ),
    )
    .toBe(1);
  const first = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).history[0].value as string,
    KEY,
  );
  await expect(
    page.getByRole("dialog").getByText(first, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Número sorteado", { exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(350);
  await page.screenshot({ path: "docs/result-mobile.png" });
  await page
    .getByRole("button", { name: "Girar novamente", exact: true })
    .click();
  await expect
    .poll(async () =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).history.length,
        KEY,
      ),
    )
    .toBe(2);
  const second = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).history[0].value as string,
    KEY,
  );
  await expect(
    page.getByRole("dialog").getByText(second, { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Fechar painel", { exact: true })
    .click({ position: { x: 2, y: 2 } });
  await expect(
    page.getByRole("button", { name: "Girar novamente", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Predefinições", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Girar novamente", exact: true }),
  ).toHaveCount(0);
});
test("all results are blocked until RESET, including after closing and reopening the app", async ({
  page,
}) => {
  await boot(page);
  await page.getByLabel("Começa em", { exact: true }).fill("0");
  await page.getByLabel("Termina em", { exact: true }).fill("2");
  await page
    .getByRole("button", { name: "Atualizar intervalo", exact: true })
    .click();
  await page.getByRole("button", { name: "Entendi", exact: true }).click();
  await page
    .getByRole("button", { name: "Configurações", exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: "não repetir", exact: true })
    .click();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await spin(page);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Predefinições", exact: true }),
  ).toBeVisible();
  await spin(page);
  await spin(page);
  const values = await page.evaluate(
    (key) =>
      JSON.parse(localStorage.getItem(key)!).history.map(
        (d: { value: string }) => d.value,
      ) as string[],
    KEY,
  );
  expect(new Set(values).size).toBe(3);
  await page.getByRole("button", { name: "Girar roleta", exact: true }).click();
  await expect(
    page.getByText("Todas as opções já foram sorteadas.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Entendi", exact: true }).click();
  await page
    .getByRole("button", { name: "Reiniciar sorteios", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Liberar resultados", exact: true })
    .click();
  await spin(page);
  const data = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    KEY,
  );
  expect(data.history).toHaveLength(4);
  expect(data.rules.numbers.drawn).toHaveLength(1);
});
test("chance editor searches and paginates a 400-character list without rendering 400 inputs", async ({
  page,
}) => {
  await boot(page, true, 400);
  await page
    .getByRole("button", { name: "Configurações", exact: true })
    .click();
  await page.getByRole("checkbox", { name: "chance", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: /Chance de Fixture/ }),
  ).toHaveCount(20);
  await page.getByRole("button", { name: "Próximas", exact: true }).click();
  await expect(
    page.getByLabel("Chance de Fixture 21, opção 21", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Buscar opção", { exact: true }).fill("Fixture 400");
  await expect(
    page.getByRole("textbox", { name: /Chance de Fixture/ }),
  ).toHaveCount(1);
  await page
    .getByLabel("Chance de Fixture 400, opção 400", { exact: true })
    .fill("50");
  await page
    .getByLabel("Chance de Fixture 400, opção 400", { exact: true })
    .press("Tab");
  await expect(
    page.getByLabel("Probabilidade total", { exact: true }),
  ).toHaveText("100%");
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await spin(page);
  const data = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    KEY,
  );
  expect(data.rules.creator.chance).toBe(true);
  expect(data.characters[0].results["category-1"]).toBe(data.history[0].value);
});

test("remake keeps independent weights, calculates 75/25 and preserves custom colors in presets", async ({
  page,
}) => {
  await boot(page);
  await mode(page, "Palavras");
  await page
    .getByLabel("Lista de opções", { exact: true })
    .fill("Opção A, Opção B");
  await page
    .getByRole("button", { name: "Atualizar lista", exact: true })
    .click();
  await page.getByRole("button", { name: "Entendi", exact: true }).click();
  await page
    .getByRole("button", { name: "Configurações", exact: true })
    .click();
  await page.getByRole("checkbox", { name: "chance", exact: true }).click();
  await page
    .getByLabel("Chance de Opção A, opção 1", { exact: true })
    .fill("90");
  await page
    .getByLabel("Chance de Opção B, opção 2", { exact: true })
    .fill("30");
  await expect(
    page.getByLabel("Chance de Opção A, opção 1", { exact: true }),
  ).toHaveValue("90");
  await expect(
    page.getByLabel("Chance real de Opção A, opção 1", { exact: true }),
  ).toHaveText("75% real");
  await expect(
    page.getByLabel("Chance real de Opção B, opção 2", { exact: true }),
  ).toHaveText("25% real");
  await page
    .getByLabel("Chance de Opção B, opção 2", { exact: true })
    .press("Tab");
  await page.screenshot({ path: "docs/remake-weights.png" });
  await page.getByRole("tab", { name: "Visual", exact: true }).click();
  await page
    .getByRole("radio", { name: "Paleta Macaron", exact: true })
    .click();
  await page
    .getByLabel("Título da roleta", { exact: true })
    .fill("Minha escolha");
  await page
    .getByLabel("Cor de Opção A, opção 1", { exact: true })
    .fill("#123456");
  await page
    .getByLabel("Cor de Opção A, opção 1", { exact: true })
    .press("Tab");
  await page
    .getByRole("switch", { name: "Mostrar nomes nas fatias", exact: true })
    .click();
  await page.screenshot({ path: "docs/remake-colors.png" });
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page
    .getByRole("button", { name: "Predefinições", exact: true })
    .click();
  await page
    .getByLabel("Nome da predefinição", { exact: true })
    .fill("Remake personalizado");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Carregar Remake personalizado",
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("Minha escolha", { exact: true })).toBeVisible();
  const d = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    KEY,
  );
  expect(d.rules.words.distribution.overrides).toEqual({ 0: 90, 1: 30 });
  expect(d.rules.words.appearance).toEqual({
    palette: "pastel",
    overrides: { 0: "#123456" },
    title: "Minha escolha",
    showLabels: false,
  });
  expect(d.presets[0].config.rules.appearance).toEqual(
    d.rules.words.appearance,
  );
  await page.screenshot({ path: "docs/remake-wheel.png" });
});

test("batch tool preserves elimination and fails atomically when exhausted", async ({
  page,
}) => {
  await boot(page);
  await page.getByLabel("Começa em", { exact: true }).fill("1");
  await page.getByLabel("Termina em", { exact: true }).fill("5");
  await page
    .getByRole("button", { name: "Atualizar intervalo", exact: true })
    .click();
  await page.getByRole("button", { name: "Entendi", exact: true }).click();
  await page
    .getByRole("button", { name: "Configurações", exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: "não repetir", exact: true })
    .click();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.getByRole("button", { name: "Ferramentas", exact: true }).click();
  await page.getByRole("tab", { name: "Em lote", exact: true }).click();
  await page.getByLabel("Quantidade de resultados", { exact: true }).fill("3");
  await page
    .getByRole("button", { name: "Sortear em lote", exact: true })
    .click();
  await expect
    .poll(async () =>
      page.evaluate(
        (key) =>
          JSON.parse(localStorage.getItem(key)!).toolbox.batchResults.length,
        KEY,
      ),
    )
    .toBe(3);
  let d = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    KEY,
  );
  expect(new Set(d.toolbox.batchResults).size).toBe(3);
  expect(d.history.every((h: { tool: string }) => h.tool === "batch")).toBe(
    true,
  );
  await page.screenshot({ path: "docs/remake-batch.png" });
  await page
    .getByRole("button", { name: "Sortear em lote", exact: true })
    .click();
  await expect(
    page.getByText("Restam 2 opções.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Entendi", exact: true }).click();
  d = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY);
  expect(d.history.length).toBe(3);
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.reload();
  await expect(
    page.getByText("2 de 5 opções disponíveis", { exact: false }),
  ).toBeVisible();
});

test("teams remain balanced and quick templates preserve the displaced list", async ({
  page,
}) => {
  await boot(page);
  await mode(page, "Palavras");
  await page
    .getByLabel("Lista de opções", { exact: true })
    .fill("Ana,Bia,Caio,Duda,Eva,Fábio,Gabi");
  await page
    .getByRole("button", { name: "Atualizar lista", exact: true })
    .click();
  await page.getByRole("button", { name: "Entendi", exact: true }).click();
  await page.getByRole("button", { name: "Ferramentas", exact: true }).click();
  await page.getByRole("tab", { name: "Equipes", exact: true }).click();
  await page.getByLabel("Quantidade de equipes", { exact: true }).fill("3");
  await page
    .getByRole("button", { name: "Formar equipes", exact: true })
    .click();
  await expect(
    page.getByText("Equipe 1 · 3 participantes", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).toolbox.teams.length,
        KEY,
      ),
    )
    .toBe(3);
  const d = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    KEY,
  );
  expect(d.toolbox.teams.map((t: string[]) => t.length)).toEqual([3, 2, 2]);
  expect(new Set(d.toolbox.teams.flat()).size).toBe(7);
  await page.screenshot({ path: "docs/remake-teams.png" });
  await page.getByRole("tab", { name: "Modelos", exact: true }).click();
  await page.screenshot({ path: "docs/remake-templates.png" });
  await page
    .getByRole("button", { name: "Usar modelo Cara ou coroa", exact: true })
    .click();
  await page.getByRole("button", { name: "Usar modelo", exact: true }).click();
  await expect(page.getByText("Cara ou coroa", { exact: true })).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).lists.words.join(","),
        KEY,
      ),
    )
    .toBe("Cara,Coroa");
  const applied = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    KEY,
  );
  expect(applied.presets[0].config.options).toEqual(d.lists.words);
  expect(applied.toolbox.teams).toEqual(d.toolbox.teams);
});

test("focus and popup preferences persist and narrow layouts fit", async ({
  page,
}) => {
  await boot(page);
  await page.getByRole("button", { name: "Modo foco", exact: true }).click();
  await expect(page.getByLabel("Começa em", { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Configurações", exact: true })
    .click();
  await page.getByRole("tab", { name: "Experiência", exact: true }).click();
  await page
    .getByRole("switch", { name: "Pop-up de resultado", exact: true })
    .click();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.getByRole("button", { name: "Girar roleta", exact: true }).click();
  await expect
    .poll(async () =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).history.length,
        KEY,
      ),
    )
    .toBe(1);
  await expect(
    page.getByRole("button", { name: "Girar novamente", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Sair do foco", exact: true }),
  ).toBeVisible();
  for (const width of [320, 390, 834]) {
    await page.setViewportSize({ width, height: 844 });
    await expect
      .poll(async () =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "docs/remake-focus.png" });
});
