import { test, expect } from "@playwright/test";
import { eliminarPlaneacion, prepararPerfil, textoDocx } from "./utils";

test.describe.configure({ mode: "serial" });

let url = "";

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage({ storageState: "e2e/.auth.json" });
  await prepararPerfil(page);
  await page.close();
});

test.afterAll(async ({ browser }) => {
  if (!url) return;
  const page = await browser.newPage({ storageState: "e2e/.auth.json" });
  if ((await page.request.get(url)).status() === 200) await eliminarPlaneacion(page, url);
  await page.close();
});

test("genera un proyecto con Aprendizaje basado en problemas", async ({ page }) => {
  await page.goto("/nueva");
  await expect(page.getByLabel("Metodología")).toHaveCount(0);
  await page.getByLabel("Por proyecto").check();
  await page.getByLabel("Metodología").selectOption("abp");
  await page.getByLabel("Escuela").selectOption("27");
  await page.getByLabel("Grado").selectOption("3");
  await page.getByLabel("Grupos").fill("(A y B)");
  await page.getByLabel("Periodo: inicio").fill("2026-10-19");
  await page.getByLabel("Periodo: fin").fill("2026-10-30");
  await page.getByLabel(/Resuelve ecuaciones de la forma Ax2/).check();
  await page.getByLabel(/Número de sesiones/).fill("4");
  await page.getByRole("button", { name: "Generar planeación" }).click();

  await page.waitForURL(/\/p\/[0-9a-f-]{36}$/, { timeout: 200_000 });
  url = new URL(page.url()).pathname;
  await expect(page.getByRole("heading", { name: "Planeación por proyecto · SEC 27" })).toBeVisible();
  await expect(page.getByText("Aprendizaje basado en problemas (ABP)", { exact: false })).toBeVisible();
  await expect(page.locator("details summary").filter({ hasText: /^\d\. / })).toHaveCount(6);
  await expect(page.locator("summary").filter({ hasText: "6. Resultados y análisis" })).toBeVisible();
  await expect(page.getByLabel("Título del proyecto")).not.toHaveValue("");
});

test("edita el proyecto y descarga el .docx SEC 27", async ({ page }) => {
  await page.goto(url);
  await page.getByLabel("Título del proyecto").fill("Proyecto E2E: la feria de la pesca");
  await page.getByLabel("Secuencia de actividades").first().fill("# Sesión 1. Arranque E2E\n- Inicio: pregunta detonadora\n-- ¿Cuántas lanchas?");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Guardado")).toBeVisible();

  const { texto } = await textoDocx(page, `${url}/docx`);
  for (const s of ["Proyecto E2E: la feria de la pesca", "Arranque E2E", "¿Cuántas lanchas?", "1. Presentemos", "6. Resultados y análisis", "Aprendizaje basado en problemas (ABP)", "No. 27 Prof. Gilberto Pacheco Castillo", "Docente E2E", "3 (A y B)", "Resuelve ecuaciones de la forma"])
    expect(texto).toContain(s);
  expect(texto).not.toMatch(/\s7\.\s/);

  const header = await textoDocx(page, `${url}/docx`, "word/header1.xml");
  expect(header.xml).toContain("r:embed");
  expect(header.texto).toContain("CICLO ESCOLAR 2026-2027");
});

test("elimina el proyecto", async ({ page }) => {
  await eliminarPlaneacion(page, url);
});
