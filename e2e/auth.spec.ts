import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("sin sesión redirige al login", async ({ page }) => {
  for (const ruta of ["/", "/perfil", "/nueva", "/p/00000000-0000-0000-0000-000000000000"]) {
    await page.goto(ruta);
    await expect(page).toHaveURL(/\/login$/);
  }
});

test("contraseña incorrecta muestra error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Usuario").fill(process.env.E2E_USUARIO!);
  await page.getByLabel("Contraseña").fill("incorrecta-123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Usuario o contraseña incorrectos.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("un usuario que no existe da el mismo error que una contraseña incorrecta", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Usuario").fill("no-existe-nadie");
  await page.getByLabel("Contraseña").fill("lo-que-sea-123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Usuario o contraseña incorrectos.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Crear cuenta" })).toHaveCount(0);
});

test("iniciar y cerrar sesión", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Usuario").fill(process.env.E2E_USUARIO!);
  await page.getByLabel("Contraseña").fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Mis planeaciones" })).toBeVisible();

  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});
