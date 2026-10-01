import { test, expect, type Browser } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { aCorreo } from "../src/lib/usuarios";

test.describe.configure({ mode: "serial" });

// Docente desechable para esta corrida.
const usuario = `e2e-docente-${Date.now().toString(36)}`;
const inicial = "inicial-12345";
const restablecida = "restablecida-678";
const propia = "propia-9876543";

async function entrarComo(browser: Browser, u: string, password: string) {
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();
  await page.goto("/login");
  await page.getByLabel("Usuario").fill(u);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  return { page, ctx };
}

// Si algo falla a la mitad, no dejar la cuenta creada.
test.afterAll(async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: "e2e/.auth.json" });
  const page = await ctx.newPage();
  await page.goto("/admin");
  const fila = page.locator("details").filter({ hasText: `@${usuario}` });
  if (await fila.count()) {
    await fila.locator("summary").click();
    await fila.getByRole("button", { name: `Eliminar a @${usuario}` }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Sí, eliminar" }).click();
  }
  await ctx.close();
});

test("el administrador ve la pantalla de docentes", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Docentes" }).click();
  await expect(page.getByRole("heading", { name: "Docentes" })).toBeVisible();
  await expect(page.locator("summary").filter({ hasText: `@${process.env.E2E_USUARIO}` })).toContainText("Tú");
});

test("valida el usuario al dar de alta", async ({ page }) => {
  await page.goto("/admin");
  await page.getByLabel("Usuario", { exact: true }).fill("Ana López");
  await page.getByLabel("Nombre del docente").fill("Ana");
  await page.getByLabel("Contraseña inicial").fill(inicial);
  await page.getByRole("button", { name: "Crear docente" }).click();
  await expect(page.getByText(/Usuario inválido/)).toBeVisible();
});

test("da de alta un docente y rechaza usuarios repetidos", async ({ page }) => {
  for (const intento of [1, 2]) {
    await page.goto("/admin");
    await page.getByLabel("Usuario", { exact: true }).fill(usuario.toUpperCase()); // se normaliza a minúsculas
    await page.getByLabel("Nombre del docente").fill("Docente Desechable");
    await page.getByLabel("Contraseña inicial").fill(inicial);
    await page.getByRole("button", { name: "Crear docente" }).click();
    if (intento === 1) await expect(page.getByText(`Docente "${usuario}" creado.`)).toBeVisible();
    else await expect(page.getByText(`El usuario "${usuario}" ya existe.`)).toBeVisible();
  }
  await expect(page.locator("summary").filter({ hasText: `@${usuario}` })).toContainText("Docente Desechable");
});

test("el docente entra, no es administrador y no puede volverse uno", async ({ browser }) => {
  const { page, ctx } = await entrarComo(browser, usuario, inicial);
  await expect(page.getByRole("heading", { name: "Mis planeaciones" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Docentes" })).toHaveCount(0);
  expect((await page.request.get("/admin")).status()).toBe(404);

  // Intentar darse el rol con la API pública: solo puede escribir user_metadata, no app_metadata.
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  await sb.auth.signInWithPassword({ email: aCorreo(usuario), password: inicial });
  await sb.auth.updateUser({ data: { rol: "admin" } });
  const { data } = await sb.auth.getUser();
  expect(data.user?.app_metadata.rol).toBeUndefined();
  await page.reload();
  expect((await page.request.get("/admin")).status()).toBe(404);
  await ctx.close();
});

test("el administrador restablece la contraseña", async ({ page, browser }) => {
  await page.goto("/admin");
  const fila = page.locator("details").filter({ hasText: `@${usuario}` });
  await fila.locator("summary").click();
  await fila.getByLabel(`Nueva contraseña para @${usuario}`).fill(restablecida);
  await fila.getByRole("button", { name: "Restablecer" }).click();
  await expect(page.getByText(`Contraseña de "${usuario}" actualizada.`)).toBeVisible();

  const vieja = await entrarComo(browser, usuario, inicial);
  await expect(vieja.page.getByText("Usuario o contraseña incorrectos.")).toBeVisible();
  await vieja.ctx.close();
  const nueva = await entrarComo(browser, usuario, restablecida);
  await expect(nueva.page.getByRole("heading", { name: "Mis planeaciones" })).toBeVisible();
  await nueva.ctx.close();
});

test("el docente cambia su propia contraseña en Perfil", async ({ browser }) => {
  const { page, ctx } = await entrarComo(browser, usuario, restablecida);
  await expect(page.getByRole("heading", { name: "Mis planeaciones" })).toBeVisible(); // sesión lista antes de navegar
  await page.goto("/perfil");
  await expect(page.getByText(`@${usuario}`)).toBeVisible();

  await page.getByLabel("Contraseña actual").fill("equivocada-000");
  await page.getByLabel("Nueva contraseña").fill(propia);
  await page.getByRole("button", { name: "Cambiar contraseña" }).click();
  await expect(page.getByText("La contraseña actual no es correcta.")).toBeVisible();

  await page.getByLabel("Contraseña actual").fill(restablecida);
  await page.getByLabel("Nueva contraseña").fill(propia);
  await page.getByRole("button", { name: "Cambiar contraseña" }).click();
  await expect(page.getByText("Contraseña actualizada")).toBeVisible();
  await ctx.close();

  const otra = await entrarComo(browser, usuario, propia);
  await expect(otra.page.getByRole("heading", { name: "Mis planeaciones" })).toBeVisible();
  await otra.ctx.close();
});

test("el administrador elimina al docente", async ({ page, browser }) => {
  await page.goto("/admin");
  const fila = page.locator("details").filter({ hasText: `@${usuario}` });
  await fila.locator("summary").click();
  const miFila = page.locator("details").filter({ has: page.locator("summary", { hasText: "Tú" }) });
  await miFila.locator("summary").click();
  await expect(miFila.getByRole("button", { name: /Eliminar a/ })).toHaveCount(0); // no puede borrarse a sí mismo
  await fila.getByRole("button", { name: `Eliminar a @${usuario}` }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Sí, eliminar" }).click();
  await expect(page.getByText(`Docente "${usuario}" eliminado.`)).toBeVisible();
  await expect(fila).toHaveCount(0);

  const { page: p2, ctx } = await entrarComo(browser, usuario, propia);
  await expect(p2.getByText("Usuario o contraseña incorrectos.")).toBeVisible();
  await ctx.close();
});
