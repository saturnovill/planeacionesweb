/*
 * Toma las capturas reales de la app para el video.
 *   npm run capturas              → vista de celular (public/capturas)
 *   npm run capturas:escritorio   → vista de escritorio (public/capturas-escritorio)
 * Requiere la app corriendo en producción:  (cd .. && npm run build && npx next start -p 3200)
 * Usa el usuario e2e de ../.env.local y borra las planeaciones que crea.
 */
import { chromium, type Locator, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

process.loadEnvFile("../.env.local");
const BASE = "http://localhost:3200";
const VISTA = process.env.VISTA === "escritorio" ? "escritorio" : "movil";
const OUT = VISTA === "escritorio" ? "public/capturas-escritorio" : "public/capturas";
const VIEWPORT = VISTA === "escritorio" ? { width: 1024, height: 800 } : { width: 390, height: 844 };
mkdirSync(OUT, { recursive: true });

type Caja = { x: number; y: number; w: number; h: number };
const meta: Record<string, { alto: number; barra: boolean; marcas: Record<string, Caja> }> = {};

// Chromium completo (no el "headless shell") con idioma español: así los controles nativos dicen "Seleccionar archivo".
const browser = await chromium.launch({ channel: "chromium", args: ["--lang=es-MX"], env: { ...process.env, LANG: "es_MX.UTF-8", LANGUAGE: "es" } });
const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: VISTA === "escritorio" ? 1.5 : 2, locale: "es-MX", acceptDownloads: true });
const page = await ctx.newPage();

/** Captura de página completa + cajas (en px CSS, relativas al documento) de los elementos indicados. */
async function captura(nombre: string, marcas: Record<string, Locator> = {}) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const cajas: Record<string, Caja> = {};
  for (const [k, loc] of Object.entries(marcas)) {
    const b = await loc.first().evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height };
    });
    cajas[k] = b;
  }
  // La barra fija de abajo (Guardar/Descargar) se captura aparte: en el video va pegada al fondo del teléfono.
  const fija = page.locator("div.fixed");
  const barra = (await fija.count()) > 0;
  if (barra) {
    await fija.screenshot({ path: `${OUT}/${nombre}-barra.png` });
    await fija.evaluate((el) => (el.style.visibility = "hidden"));
  }
  await page.screenshot({ path: `${OUT}/${nombre}.png`, fullPage: true });
  if (barra) await fija.evaluate((el) => (el.style.visibility = ""));
  const alto = await page.evaluate(() => document.documentElement.scrollHeight);
  meta[nombre] = { alto, barra, marcas: cajas };
  console.log("✓", nombre, alto);
}

/** Descarga un .docx desde un enlace y guarda la primera página como imagen. */
async function word(enlace: Locator, nombre: string) {
  const [d] = await Promise.all([page.waitForEvent("download"), enlace.click()]);
  const docx = `${OUT}/${nombre}.docx`;
  await d.saveAs(docx);
  execFileSync("soffice", ["--headless", "--convert-to", "pdf", "--outdir", OUT, docx], { stdio: "ignore" });
  execFileSync("pdftoppm", ["-r", "110", "-png", "-f", "1", "-l", "1", "-singlefile", `${OUT}/${nombre}.pdf`, `${OUT}/${nombre}`]);
  console.log("✓", nombre, "(Word)");
}

const esperarIA = (p: Page) => p.waitForURL(/\/p\/[0-9a-f-]{36}$/, { timeout: 300_000 });

// 1. Login
await page.goto(`${BASE}/login`);
await page.getByLabel("Usuario").fill("ana.lopez");
await captura("01-login", { entrar: page.getByRole("button", { name: "Entrar" }) });
await page.getByLabel("Usuario").fill(process.env.E2E_USUARIO!);
await page.getByLabel("Contraseña").fill(process.env.E2E_PASSWORD!);
await page.getByRole("button", { name: "Entrar" }).click();
await page.getByRole("heading", { name: "Mis planeaciones" }).waitFor();

// 2. Perfil: nombre + contenidos
await page.goto(`${BASE}/perfil`);
await page.getByLabel(/Nombre del docente/).fill("Mtra. Ana López");
await page.getByLabel(/Documento de contenidos/).setInputFiles("../fixtures/CONTENIDOS.docx");
await page.getByRole("button", { name: "Guardar" }).click();
await page.getByText("Guardado").waitFor();
const segundo = page.locator("details").filter({ hasText: /^2° grado/ });
await segundo.locator("summary").click();
await captura("02-perfil", { archivo: page.getByLabel(/Documento de contenidos/), segundo: segundo.locator("summary"), marca: segundo.getByText("13 – 25 SEP") });

// 3. Nueva planeación por clases
await page.goto(`${BASE}/nueva`);
await page.getByLabel("Escuela").selectOption("27");
await page.getByLabel("Grado").selectOption("2");
await page.getByLabel("Grupos").fill("(A, B y C)");
await page.getByLabel("Periodo: inicio").fill("2026-10-05");
await page.getByLabel("Periodo: fin").fill("2026-10-16");
const pda = page.locator("label").filter({ hasText: /Usa criterios de divisibilidad/ });
await pda.getByRole("checkbox").check();
await page.getByLabel(/Número de sesiones/).fill("5");
await page.getByLabel("Tipo de la sesión 3").selectOption("calculo_mental");
await page.getByLabel("Tipo de la sesión 5").selectOption("evaluacion");
await page.getByLabel("Instrucción de la sesión 2").fill("Problemas con la pesca del día");
await captura("03-nueva", {
  tipo: page.getByText("Por clases"),
  escuela: page.getByLabel("Escuela"),
  pda,
  sesiones: page.getByLabel(/Número de sesiones/),
  calculo: page.getByLabel("Tipo de la sesión 3"),
  nota: page.getByLabel("Instrucción de la sesión 2"),
  generar: page.getByRole("button", { name: "Generar planeación" }),
});
await page.getByRole("button", { name: "Generar planeación" }).click();
await page.getByRole("button", { name: /Generando/ }).scrollIntoViewIfNeeded();
await page.screenshot({ path: `${OUT}/04-generando.png` });
meta["04-generando"] = { alto: VIEWPORT.height, barra: false, marcas: {} };
console.log("✓ 04-generando");

// 4. Editor
await esperarIA(page);
const clases = page.url();
await captura("05-editor", {
  proposito: page.getByLabel("Propósito"),
  sesion: page.locator("details").first(),
  guardar: page.getByRole("button", { name: "Guardar" }),
  descargar: page.getByRole("link", { name: "Descargar .docx" }),
});
await word(page.getByRole("link", { name: "Descargar .docx" }), "06-word");

// 5. Actividades
await page.getByRole("link", { name: /Actividades por sesión/ }).click();
await page.getByRole("button", { name: "Generar actividades" }).click();
await page.getByText("Actividades generadas").waitFor({ timeout: 300_000 });
await captura("07-actividades", { respuesta: page.getByLabel("Sesión 1, respuesta 1", { exact: true }), descargar: page.getByRole("link", { name: "Descargar .docx" }) });
await word(page.getByRole("link", { name: "Descargar .docx" }), "08-word-actividades");

// 6. Proyecto
await page.goto(`${BASE}/nueva`);
await page.getByLabel("Por proyecto").check();
await page.getByLabel("Metodología").selectOption("abpc");
await page.getByLabel("Grado").selectOption("3");
await page.getByLabel("Grupos").fill("(A y B)");
await page.getByLabel("Periodo: inicio").fill("2026-10-19");
await page.getByLabel("Periodo: fin").fill("2026-10-30");
await page.locator("label").filter({ hasText: /Resuelve problemas cuyo planteamiento es una ecuación cuadrática/ }).getByRole("checkbox").check();
await page.getByLabel(/Número de sesiones/).fill("6");
await captura("09-proyecto", { proyecto: page.getByText("Por proyecto"), metodologia: page.getByLabel("Metodología") });
await page.getByRole("button", { name: "Generar planeación" }).click();
await esperarIA(page);
const proyecto = page.url();
await captura("10-proyecto-editor", { momentos: page.getByRole("heading", { name: "Momentos" }) });
await word(page.getByRole("link", { name: "Descargar .docx" }), "11-word-proyecto");

// 7. Lista
await page.goto(`${BASE}/`);
await captura("12-inicio");

writeFileSync(`${OUT}.json`, JSON.stringify(meta, null, 2));

// Limpieza
for (const url of [clases, proyecto]) {
  await page.goto(url);
  await page.getByRole("button", { name: "Eliminar planeación" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Sí, eliminar" }).click();
  await page.waitForURL(`${BASE}/`);
}
await browser.close();
console.log("listo");
