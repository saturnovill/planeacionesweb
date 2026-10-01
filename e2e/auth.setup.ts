import { test as setup, expect } from "@playwright/test";

setup("iniciar sesión con el usuario de pruebas", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Usuario").fill(process.env.E2E_USUARIO!);
  await page.getByLabel("Contraseña").fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Mis planeaciones" })).toBeVisible();
  await page.context().storageState({ path: "e2e/.auth.json" });
});
