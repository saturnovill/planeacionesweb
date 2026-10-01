/*
 * Capturas para el tutorial de docentes (vista de escritorio, paso a paso): perfil → planeación → actividades.
 *   npm run capturas:docente   → public/capturas-docente + public/capturas-docente.json
 * Requiere la app corriendo en producción:  (cd .. && npm run build && npx next start -p 3200)
 * Usa el usuario e2e de ../.env.local: le vacía el perfil para mostrar el primer ingreso,
 * lo vuelve a llenar con ../fixtures/CONTENIDOS.docx y borra la planeación que crea.
 */
import { chromium, type Locator } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { aCorreo } from "../src/lib/usuarios.ts";

process.loadEnvFile("../.env.local");
const BASE = "http://localhost:3200";
const OUT = "public/capturas-docente";
const VIEWPORT = { width: 1024, height: 800 };
mkdirSync(OUT, { recursive: true });

// 0. Perfil vacío, como el de un docente que entra por primera vez.
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
const { data: login, error } = await sb.auth.signInWithPassword({ email: aCorreo(process.env.E2E_USUARIO!), password: process.env.E2E_PASSWORD! });
if (error) throw error;
await sb.from("profiles").upsert({ id: login.user.id, nombre: "", contenidos: [] });

type Caja = { x: number; y: number; w: number; h: number };
const meta: Record<string, { alto: number; barra: boolean; ruta: string; marcas: Record<string, Caja> }> = {};

const browser = await chromium.launch({ channel: "chromium", args: ["--lang=es-MX"], env: { ...process.env, LANG: "es_MX.UTF-8", LANGUAGE: "es" } });
const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1.5, locale: "es-MX", acceptDownloads: true });
const page = await ctx.newPage();

/** Captura de página completa + cajas (px CSS, relativas al documento) de los elementos indicados. */
async function captura(nombre: string, marcas: Record<string, Locator> = {}, completa = true) {
  if (completa) await page.evaluate(() => window.scrollTo(0, 0));
  // Es un tutorial para docentes: sin el enlace de administración.
  await page.locator('a[aria-label="Docentes"]').evaluateAll((els) => els.forEach((el) => ((el as HTMLElement).style.display = "none")));
  // Y con un usuario de ejemplo en lugar del de pruebas.
  await page.locator("b", { hasText: `@${process.env.E2E_USUARIO}` }).evaluateAll((els) => els.forEach((el) => (el.textContent = "@ana.lopez")));
  const cajas: Record<string, Caja> = {};
  for (const [k, loc] of Object.entries(marcas)) {
    cajas[k] = await loc.first().evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height };
    });
  }
  // La barra fija de abajo (Guardar/Descargar) se captura aparte y en el video va pegada al fondo de la ventana.
  const fija = page.locator("div.fixed.bottom-0");
  const barra = completa && (await fija.count()) > 0;
  if (barra) {
    await fija.screenshot({ path: `${OUT}/${nombre}-barra.png` });
    await fija.evaluate((el) => (el.style.opacity = "0"));
  }
  await page.screenshot({ path: `${OUT}/${nombre}.png`, fullPage: completa });
  if (barra) await fija.evaluate((el) => (el.style.opacity = ""));
  const alto = completa ? await page.evaluate(() => document.documentElement.scrollHeight) : VIEWPORT.height;
  meta[nombre] = { alto, barra, ruta: new URL(page.url()).pathname.replace(/[0-9a-f-]{36}/, "8f3c…"), marcas: cajas };
  console.log("✓", nombre, alto);
}

/** .docx → primera página como imagen. */
function hoja(docx: string, nombre: string) {
  execFileSync("soffice", ["--headless", "--convert-to", "pdf", "--outdir", OUT, docx], { stdio: "ignore" });
  const pdf = `${OUT}/${docx.split("/").pop()!.replace(/\.docx$/, ".pdf")}`;
  execFileSync("pdftoppm", ["-r", "110", "-png", "-f", "1", "-l", "1", "-singlefile", pdf, `${OUT}/${nombre}`]);
  console.log("✓", nombre, "(Word)");
}

async function word(enlace: Locator, nombre: string) {
  const [d] = await Promise.all([page.waitForEvent("download"), enlace.click()]);
  await d.saveAs(`${OUT}/${nombre}.docx`);
  hoja(`${OUT}/${nombre}.docx`, nombre);
}

// 1. Login
await page.goto(`${BASE}/login`);
await page.getByLabel("Usuario").fill("ana.lopez");
await page.getByLabel("Contraseña").fill("contraseña");
await captura("d01-login", { usuario: page.getByLabel("Usuario"), password: page.getByLabel("Contraseña"), entrar: page.getByRole("button", { name: "Entrar" }) });
await page.getByLabel("Usuario").fill(process.env.E2E_USUARIO!);
await page.getByLabel("Contraseña").fill(process.env.E2E_PASSWORD!);
await page.getByRole("button", { name: "Entrar" }).click();
await page.getByRole("heading", { name: "Mis planeaciones" }).waitFor();

// 2. Inicio con el aviso "Antes de empezar"
await captura("d02-inicio", { perfil: page.getByRole("link", { name: "Perfil", exact: true }), aviso: page.getByText("Antes de empezar"), ir: page.getByRole("link", { name: "Ir a Perfil" }) });

// 3. Perfil: vacío → lleno → guardado
await page.getByRole("link", { name: "Ir a Perfil" }).click();
await page.getByLabel(/Nombre del docente/).waitFor();
const marcasPerfil = () => ({
  nombre: page.getByLabel(/Nombre del docente/),
  archivo: page.getByLabel(/Documento de contenidos/),
  guardar: page.getByRole("button", { name: "Guardar" }),
});
await captura("d03-perfil-vacio", marcasPerfil());
await page.getByLabel(/Nombre del docente/).fill("Mtra. Ana López");
await page.getByLabel(/Documento de contenidos/).setInputFiles("../fixtures/CONTENIDOS.docx");
await captura("d04-perfil-lleno", marcasPerfil());
await page.getByRole("button", { name: "Guardar" }).click();
await page.getByText("Guardado").waitFor();
const segundo = page.locator("details").filter({ hasText: /^2° grado/ });
await segundo.locator("summary").click();
await captura("d05-perfil-guardado", {
  aviso: page.getByText("Guardado"),
  cargados: page.getByRole("heading", { name: "Contenidos cargados" }),
  segundo: segundo.locator("summary"),
  marca: segundo.getByText("13 – 25 SEP"),
});
hoja("../fixtures/CONTENIDOS.docx", "d06-contenidos");

// 4. Nueva planeación por clases
await page.goto(`${BASE}/`);
await page.getByRole("link", { name: "Nueva planeación" }).waitFor();
await captura("d07-inicio-listo", { nueva: page.getByRole("link", { name: "Nueva planeación" }) });
await page.getByRole("link", { name: "Nueva planeación" }).click();
await page.getByLabel("Escuela").waitFor();
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
await captura("d08-nueva", {
  tipo: page.getByText("Por clases"),
  escuela: page.getByLabel("Escuela"),
  grado: page.getByLabel("Grado"),
  grupos: page.getByLabel("Grupos"),
  inicio: page.getByLabel("Periodo: inicio"),
  fin: page.getByLabel("Periodo: fin"),
  seccion2: page.getByText(/Contenido y PDA ·/),
  pda,
  usado: pda.getByText("usado: 13 – 25 SEP"),
  sesiones: page.getByLabel(/Número de sesiones/),
  calculo: page.getByLabel("Tipo de la sesión 3"),
  nota: page.getByLabel("Instrucción de la sesión 2"),
  generar: page.getByRole("button", { name: "Generar planeación" }),
});
await page.getByRole("button", { name: "Generar planeación" }).click();
await page.getByRole("button", { name: /Generando/ }).scrollIntoViewIfNeeded();
await captura("d09-generando", { generando: page.getByRole("button", { name: /Generando/ }) }, false);

// 5. Editor
await page.waitForURL(/\/p\/[0-9a-f-]{36}$/, { timeout: 300_000 });
const url = page.url();
await captura("d10-editor", {
  actividades: page.getByRole("link", { name: /Actividades por sesión/ }),
  proposito: page.getByLabel("Propósito"),
  sesion: page.locator("details").first(),
  guardar: page.getByRole("button", { name: "Guardar" }),
  descargar: page.getByRole("link", { name: "Descargar .docx" }),
});
await word(page.getByRole("link", { name: "Descargar .docx" }), "d11-word");

// 6. Actividades: antes y después de generarlas
await page.getByRole("link", { name: /Actividades por sesión/ }).click();
await page.getByRole("button", { name: "Generar actividades" }).waitFor();
await captura("d12-actividades-antes", { lista: page.locator("ul.divide-y"), generar: page.getByRole("button", { name: "Generar actividades" }) });
await page.getByRole("button", { name: "Generar actividades" }).click();
await page.getByText("Actividades generadas").waitFor({ timeout: 300_000 });
await captura("d13-actividades", {
  aviso: page.getByText("Actividades generadas"),
  reactivo: page.getByLabel("Sesión 1, reactivo 1", { exact: true }),
  respuesta: page.getByLabel("Sesión 1, respuesta 1", { exact: true }),
  guardar: page.getByRole("button", { name: "Guardar" }),
  descargar: page.getByRole("link", { name: "Descargar .docx" }),
});
await word(page.getByRole("link", { name: "Descargar .docx" }), "d14-word-actividades");

writeFileSync(`${OUT}.json`, JSON.stringify(meta, null, 2));

// Limpieza
await page.goto(url);
await page.getByRole("button", { name: "Eliminar planeación" }).click();
await page.getByRole("alertdialog").getByRole("button", { name: "Sí, eliminar" }).click();
await page.waitForURL(`${BASE}/`);
await browser.close();
console.log("listo");
