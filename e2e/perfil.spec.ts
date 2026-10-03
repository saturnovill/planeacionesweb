import { test, expect } from "@playwright/test";
import { prepararPerfil } from "./utils";

test("rechaza un .docx sin tabla de contenidos", async ({ page }) => {
  await page.goto("/perfil");
  await page.getByLabel(/Nombre del docente/).fill("Docente E2E");
  await page.getByLabel(/Documento de contenidos/).setInputFiles("fixtures/PROMPT.docx");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("El documento no tiene una tabla de contenidos.")).toBeVisible();
});

test("guarda nombre y contenidos, y muestra los PDA por grado", async ({ page }) => {
  await prepararPerfil(page);
  await expect(page.getByLabel(/Nombre del docente/)).toHaveValue("Docente E2E");
  for (const g of [1, 2, 3]) await expect(page.getByText(new RegExp(`^${g}° grado · \\d+ PDA$`))).toBeVisible();

  const segundo = page.locator("details").filter({ hasText: /^2° grado/ });
  await segundo.getByText(/^2° grado/).click();
  await expect(segundo.getByText("Usa criterios de divisibilidad y números primos", { exact: false })).toBeVisible();
  await expect(segundo.getByText("13 – 25 SEP")).toBeVisible();

  // Sin archivo nuevo se conservan los contenidos.
  await page.getByLabel(/Nombre del docente/).fill("Docente E2E");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Guardado")).toBeVisible();
  await expect(page.getByText(/^2° grado · \d+ PDA$/)).toBeVisible();
});

test("agrega, marca y quita PDA a mano en Contenidos cargados, sin recargar", async ({ page }) => {
  await prepararPerfil(page);
  const primero = page.locator("details").filter({ hasText: /^1° grado/ });
  const titulo = primero.locator("summary");
  const n = Number((await titulo.innerText()).match(/(\d+) PDA/)![1]);
  const texto = "PDA manual E2E: resuelve problemas de prueba.";
  // Espera a que el servidor guarde lo que la pantalla ya muestra.
  const guardado = () => page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/perfil"));
  await titulo.click();
  await page.evaluate(() => ((window as unknown as { sinRecarga: boolean }).sinRecarga = true));

  const contenido = primero.getByLabel("Contenido del nuevo PDA de 1°", { exact: true });
  await contenido.fill("Contenido manual E2E");
  await primero.getByLabel("Nuevo PDA de 1°", { exact: true }).fill(texto);
  let g = guardado();
  await primero.getByRole("button", { name: "Agregar PDA" }).click();
  await expect(titulo).toHaveText(`1° grado · ${n + 1} PDA`);
  await expect(primero.getByText(texto)).toBeVisible();
  await expect(contenido).toHaveValue(""); // limpia los campos
  await g;

  g = guardado();
  await primero.getByRole("button", { name: `Marcar como usado: ${texto}` }).click();
  await expect(primero.getByRole("button", { name: `Quitar marca de usado: ${texto}` })).toBeVisible();
  await g;
  expect(await page.evaluate(() => (window as unknown as { sinRecarga?: boolean }).sinRecarga)).toBe(true);

  // Quedó guardado: aparece marcado en una nueva planeación.
  await page.goto("/nueva");
  await page.getByLabel("Grado").selectOption("1");
  await expect(page.locator("label").filter({ hasText: texto }).getByText("ya usado")).toBeVisible();

  await page.goto("/perfil");
  await titulo.click();
  g = guardado();
  await primero.getByRole("button", { name: `Quitar marca de usado: ${texto}` }).click();
  await expect(primero.getByRole("button", { name: `Marcar como usado: ${texto}` })).toBeVisible();
  await g;
  g = guardado();
  await primero.getByRole("button", { name: `Quitar PDA: ${texto}` }).click();
  await expect(titulo).toHaveText(`1° grado · ${n} PDA`);
  await expect(primero.getByText("PDA manual E2E")).toHaveCount(0);
  await g;

  await page.reload();
  await expect(titulo).toHaveText(`1° grado · ${n} PDA`);
});
