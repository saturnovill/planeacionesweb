import { expect, type Page } from "@playwright/test";
import PizZip from "pizzip";

/** Texto plano de word/document.xml (o de otra parte) de un .docx descargado. */
export async function textoDocx(page: Page, url: string, parte = "word/document.xml") {
  const res = await page.request.get(url);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("wordprocessingml");
  const xml = new PizZip(await res.body()).file(parte)!.asText();
  return { xml, texto: [...xml.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]).join(" ") };
}

/** Deja el perfil listo: nombre y CONTENIDOS.docx cargado. */
export async function prepararPerfil(page: Page, nombre = "Docente E2E") {
  await page.goto("/perfil");
  await page.getByLabel(/Nombre del docente/).fill(nombre);
  await page.getByLabel(/Documento de contenidos/).setInputFiles("fixtures/CONTENIDOS.docx");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Guardado")).toBeVisible();
}

export async function eliminarPlaneacion(page: Page, url: string) {
  await page.goto(url);
  await abrirEliminar(page);
  await page.getByRole("alertdialog").getByRole("button", { name: "Sí, eliminar" }).click();
  await expect(page).toHaveURL("/");
}

/** Abre el diálogo de eliminar; reintenta el clic si llegó antes de que el botón se hidratara. */
export async function abrirEliminar(page: Page) {
  await expect(async () => {
    await page.getByRole("button", { name: "Eliminar planeación" }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible({ timeout: 1_000 });
  }).toPass();
}

/** Falla si la página es más ancha que la pantalla (scroll horizontal). */
export async function sinDesborde(page: Page, ruta: string) {
  const { ancho, vista } = await page.evaluate(() => ({ ancho: document.documentElement.scrollWidth, vista: window.innerWidth }));
  expect(ancho, ruta).toBeLessThanOrEqual(vista);
}
