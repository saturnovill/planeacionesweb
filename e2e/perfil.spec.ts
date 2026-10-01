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
