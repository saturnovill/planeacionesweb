import { test, expect } from "@playwright/test";
import { EJES } from "../src/lib/planeacion";
import { abrirEliminar, eliminarPlaneacion, prepararPerfil, sinDesborde, textoDocx } from "./utils";

test.describe.configure({ mode: "serial" });

let url = "";

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage({ storageState: "e2e/.auth.json" });
  await prepararPerfil(page);
  await page.close();
});

// Si una prueba falla a la mitad, no dejar la planeación en la base de datos.
test.afterAll(async ({ browser }) => {
  if (!url) return;
  const page = await browser.newPage({ storageState: "e2e/.auth.json" });
  if ((await page.request.get(url)).status() === 200) await eliminarPlaneacion(page, url);
  await page.close();
});

test("valida que se elija al menos un PDA", async ({ page }) => {
  await page.goto("/nueva");
  await page.getByLabel("Grupos", { exact: true }).fill("G");
  await page.getByLabel("Periodo: inicio").fill("2026-10-05");
  await page.getByLabel("Periodo: fin").fill("2026-10-16");
  await page.getByRole("button", { name: "Generar planeación" }).click();
  await expect(page.getByText("Selecciona al menos un PDA.")).toBeVisible();
});

test("genera una planeación por clases con Gemini", async ({ page }) => {
  await page.goto("/nueva");
  await page.getByLabel("Escuela").selectOption("21");
  await page.getByLabel("Grado").selectOption("2");
  await page.getByLabel("Grupos", { exact: true }).fill("G");
  await page.getByLabel("Periodo: inicio").fill("2026-10-05");
  await page.getByLabel("Periodo: fin").fill("2026-10-16");
  await page.getByLabel(/Usa criterios de divisibilidad/).check();
  await page.getByLabel(/Número de sesiones/).fill("3");
  await expect(page.getByLabel(/Tipo de la sesión/)).toHaveCount(3);
  await page.getByLabel("Tipo de la sesión 2").selectOption("calculo_mental");
  await page.getByLabel("Instrucción de la sesión 3").fill("Cierre con un juego de repaso");
  await page.getByLabel("Observaciones (opcional)").fill("el grupo h va atrasado con las tablas de multiplicar");
  await page.getByRole("button", { name: "Generar planeación" }).click();
  await expect(page.getByRole("button", { name: /Generando/ })).toBeDisabled();

  await page.waitForURL(/\/p\/[0-9a-f-]{36}$/, { timeout: 200_000 });
  url = new URL(page.url()).pathname;
  await expect(page.getByRole("heading", { name: "Planeación por clases · SEC 21" })).toBeVisible();
  await expect(page.locator("details summary").filter({ hasText: /^Sesión \d\./ })).toHaveCount(3);
  await expect(page.locator("summary").filter({ hasText: "Cálculo mental" })).toHaveCount(1);
  await expect(page.getByLabel("Propósito")).not.toBeEmpty();
  await expect(page.getByLabel("Observaciones", { exact: true })).toContainText(/tablas/i);
});

test("edita, valida y guarda", async ({ page }) => {
  await page.goto(url);
  await page.getByLabel("Propósito").fill("Propósito editado por E2E");
  await page.getByLabel("Grupos", { exact: true }).fill("G y H");

  // Sin ejes articuladores no se guarda.
  for (const eje of EJES) await page.getByRole("checkbox", { name: eje, exact: true }).uncheck();
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText(/selecciona de 1 a 3 ejes/)).toBeVisible();

  await page.getByLabel("Propósito").fill("Propósito editado por E2E");
  await page.getByLabel("Grupos", { exact: true }).fill("G y H");
  // Tras el error, la página vuelve con los ejes guardados: se dejan exactamente dos.
  for (const eje of EJES) await page.getByRole("checkbox", { name: eje, exact: true }).uncheck();
  await page.getByRole("checkbox", { name: "Pensamiento crítico" }).check();
  await page.getByRole("checkbox", { name: "Inclusión" }).check();
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Guardado")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Propósito")).toHaveText("Propósito editado por E2E");
  await expect(page.getByLabel("Grupos", { exact: true })).toHaveValue("G y H");
});

test("edita con texto rico (negritas y viñetas)", async ({ page }) => {
  await page.goto(url);
  const producto = page.getByLabel("Producto central por lograr");
  await producto.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("Portafolio con ");
  await page.keyboard.press("ControlOrMeta+B");
  await page.keyboard.type("evidencias");
  await page.keyboard.press("ControlOrMeta+B");
  await page.keyboard.press("Enter");
  await page.keyboard.type("- Tablas"); // "- " al inicio crea la viñeta
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Gráficas");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Guardado")).toBeVisible();

  await page.reload();
  await expect(producto.locator("strong")).toHaveText("evidencias");
  await expect(producto.locator("ul > li > ul > li")).toHaveText("Gráficas");
  await expect(producto).not.toContainText("**");
});

test("descarga el .docx con el formato SEC 21", async ({ page }) => {
  await page.goto(url);
  const [descarga] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Descargar .docx" }).click()]);
  expect(descarga.suggestedFilename()).toBe("Planeación 5 – 16 de octubre de 2026 SEC 21 2°.docx");

  const { texto, xml } = await textoDocx(page, `${url}/docx`);
  for (const s of ["No. 21", "Docente E2E", "5 – 16 de octubre de 2026", "2 G y H", "Propósito editado por E2E", "Sesión 3.", "Usa criterios de divisibilidad"])
    expect(texto).toContain(s);
  expect(texto).not.toContain("Sesión 4");
  expect(texto).toMatch(/Observaciones:[\s\S]*tablas/i);
  expect(texto).not.toMatch(/Nombre del docente\s{2,}/); // el marcador del pie se reemplazó
  expect((xml.match(/>x</g) ?? []).length).toBe(2);
  expect(xml).toContain('<w:b/><w:bCs/><w:lang w:val="es-MX"/></w:rPr><w:t xml:space="preserve">evidencias</w:t>'); // negritas dentro de la línea
  expect(texto).toContain("Gráficas");
  expect(texto).not.toContain("**");

  const header = await textoDocx(page, `${url}/docx`, "word/header1.xml");
  expect(header.texto).toContain("CICLO ESCOLAR 2026-2027");
  expect(header.xml).not.toContain("r:embed");
});

test("genera, edita y descarga las actividades", async ({ page }) => {
  await page.goto(url);
  await page.getByRole("link", { name: /Actividades por sesión/ }).click();
  await expect(page).toHaveURL(`${url}/actividades`);
  await expect(page.getByText("Sesión 2: Cálculo mental · 10 reactivos")).toBeVisible();
  await page.getByRole("button", { name: "Generar actividades" }).click();
  await expect(page.getByText("Actividades generadas")).toBeVisible({ timeout: 200_000 });

  await expect(page.locator("details summary").filter({ hasText: /^Sesión \d\./ })).toHaveCount(3);
  for (const [sesion, n] of [[1, 8], [2, 10], [3, 8]]) {
    await expect(page.getByLabel(new RegExp(`^Sesión ${sesion}, respuesta \\d+$`))).toHaveCount(n);
    await expect(page.getByLabel(`Sesión ${sesion}, respuesta 1`, { exact: true })).not.toHaveValue("");
  }

  await page.getByLabel("Sesión 1, reactivo 1", { exact: true }).fill("Reactivo editado E2E: 12 ÷ 4");
  await page.getByLabel("Sesión 1, respuesta 1", { exact: true }).fill("3");
  // Quitar un renglón y agregar otro a mano.
  const filas = page.getByLabel(/^Sesión 1, reactivo \d+$/);
  const n = await filas.count();
  const segundo = await page.getByLabel("Sesión 1, reactivo 2", { exact: true }).inputValue();
  await page.getByRole("button", { name: "Quitar reactivo 2 de la sesión 1" }).click();
  await expect(filas).toHaveCount(n - 1);
  await page.getByRole("button", { name: "Agregar reactivo" }).first().click();
  await page.getByLabel(`Sesión 1, reactivo ${n}`, { exact: true }).fill("Agregado E2E: 7 + 5");
  await page.getByLabel(`Sesión 1, respuesta ${n}`, { exact: true }).fill("12");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Guardado")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Sesión 1, reactivo 1", { exact: true })).toHaveValue("Reactivo editado E2E: 12 ÷ 4");
  await expect(filas).toHaveCount(n);
  await expect(page.getByLabel(`Sesión 1, reactivo ${n}`, { exact: true })).toHaveValue("Agregado E2E: 7 + 5");
  await expect(page.getByLabel("Sesión 1, reactivo 2", { exact: true })).not.toHaveValue(segundo);

  const [descarga] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Descargar con respuestas" }).click()]);
  expect(descarga.suggestedFilename()).toBe("Actividades 5 – 16 de octubre de 2026 SEC 21 2°.docx");
  const { texto } = await textoDocx(page, `${url}/actividades/docx`);
  for (const s of ["ACTIVIDADES", "Docente: Docente E2E", "Reactivo editado E2E: 12 ÷ 4", "(3)", "Agregado E2E: 7 + 5", "(Cálculo mental)", "Sesión 3."]) expect(texto).toContain(s);
  const [sinResp] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Descargar sin respuestas" }).click()]);
  expect(sinResp.suggestedFilename()).toBe("Actividades 5 – 16 de octubre de 2026 SEC 21 2° sin respuestas.docx");
  const { texto: alumno } = await textoDocx(page, `${url}/actividades/docx?sin-respuestas`);
  expect(alumno).toContain("Reactivo editado E2E: 12 ÷ 4");
  expect(alumno).not.toContain("(3)");

  await page.setViewportSize({ width: 390, height: 844 });
  await sinDesborde(page, "actividades");
  await page.goto(url);
  await sinDesborde(page, "editor");
  await expect(page.getByRole("link", { name: /Actividades por sesión generadas/ })).toBeVisible();
});

test("el PDA ya planeado aparece marcado en una nueva planeación", async ({ page }) => {
  await page.goto("/nueva");
  await page.getByLabel("Grado").selectOption("2");
  await expect(page.getByLabel(/Usa criterios de divisibilidad/)).toBeVisible();
  await expect(page.locator("label").filter({ hasText: /Usa criterios de divisibilidad/ }).getByText("planeado: 5 – 16 de octubre de 2026")).toBeVisible();
});

test("duplica la planeación con las actividades", async ({ page }) => {
  await page.goto(url);
  const proposito = await page.getByLabel("Propósito").innerText();
  await expect(page.getByLabel("Escuela de la copia")).toHaveValue("21");
  await page.getByLabel("Escuela de la copia").selectOption("27");
  await page.getByRole("button", { name: "Duplicar planeación" }).click();
  await expect(page.getByText("Copia creada: ajusta el periodo y guarda.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Planeación por clases · SEC 27" })).toBeVisible();
  const copia = new URL(page.url()).pathname;
  expect(copia).not.toBe(url);
  await expect(page.getByLabel("Propósito")).toHaveText(proposito);
  await expect(page.getByRole("link", { name: /Actividades por sesión generadas/ })).toBeVisible();
  const { texto } = await textoDocx(page, `${copia}/actividades/docx`);
  expect(texto).toContain("Agregado E2E: 7 + 5");

  // Se elimina desde "Mis planeaciones".
  await page.goto("/");
  // Por CSS: con el diálogo abierto el resto de la página queda fuera del árbol de accesibilidad.
  const tarjeta = (ruta: string) => page.locator("li").filter({ has: page.locator(`a[href="${ruta}"]`) });
  await tarjeta(copia).getByRole("button", { name: "Eliminar planeación 2° G y H SEC 27 5 – 16 de octubre de 2026" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Sí, eliminar" }).click();
  await expect(page.getByRole("alertdialog")).toBeHidden();
  await expect(tarjeta(copia)).toHaveCount(0);
  expect((await page.request.get(`${copia}/actividades/docx`)).status()).toBe(404);
  await expect(tarjeta(url)).toBeVisible();
});

test("eliminar pide confirmación", async ({ page }) => {
  await page.goto(url);
  await abrirEliminar(page);
  const dialogo = page.getByRole("alertdialog");
  await expect(dialogo.getByText("¿Eliminar esta planeación?")).toBeVisible();
  await dialogo.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialogo).toBeHidden();
  expect((await page.request.get(url)).status()).toBe(200);
});

test("aparece en la lista y se puede regenerar", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Por clases · 2° G y H.*SEC 21/ }).click();
  await expect(page).toHaveURL(url);

  await page.getByRole("button", { name: /Regenerar todo/ }).click();
  await expect(page.getByText("Generada de nuevo")).toBeVisible({ timeout: 200_000 });
  await expect(page.getByLabel("Propósito")).not.toHaveText("Propósito editado por E2E");
});

test("elimina la planeación", async ({ page }) => {
  await eliminarPlaneacion(page, url);
  await expect(page.getByRole("link", { name: /Por clases · 2° G y H.*SEC 21/ })).toHaveCount(0);
  expect((await page.request.get(url)).status()).toBe(404);
});
