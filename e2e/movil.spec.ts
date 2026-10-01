import { test, expect } from "@playwright/test";

test("las pantallas no se desbordan a lo ancho en celular", async ({ page }) => {
  for (const ruta of ["/", "/perfil", "/nueva"]) {
    await page.goto(ruta);
    const { ancho, vista } = await page.evaluate(() => ({ ancho: document.documentElement.scrollWidth, vista: window.innerWidth }));
    expect(ancho, ruta).toBeLessThanOrEqual(vista);
  }
});

test("el formulario de nueva planeación se puede usar en celular", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 }); // celular angosto
  await page.goto("/nueva");
  await page.getByLabel("Por proyecto").check();
  await expect(page.getByLabel("Metodología")).toBeVisible();
  // Los <select> con opciones largas (escuela, metodología) no deben desbordar.
  for (const m of ["steam", "abpc", "abp", "as"]) await page.getByLabel("Metodología").selectOption(m);
  const ancho = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(ancho).toBeLessThanOrEqual(360);
  await page.getByLabel(/Número de sesiones/).fill("2");
  await expect(page.getByLabel(/Tipo de la sesión/)).toHaveCount(2);
  await page.getByLabel(/Usa diversas estrategias al convertir/).check();
  const boton = page.getByRole("button", { name: "Generar planeación" });
  await boton.scrollIntoViewIfNeeded();
  await expect(boton).toBeInViewport();
});
