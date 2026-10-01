import { test } from "node:test";
import assert from "node:assert/strict";
import { aCorreo, deCorreo, esValido, normalizar } from "./usuarios.ts";

test("usuarios ↔ correo interno", () => {
  assert.equal(aCorreo(" Ana.Lopez "), "ana.lopez@usuarios.planeaciones.local");
  assert.equal(deCorreo("ana.lopez@usuarios.planeaciones.local"), "ana.lopez");
  assert.equal(deCorreo("otro@gmail.com"), "otro@gmail.com");
  for (const u of ["ana", "ana.lopez", "mtra_ana-2"]) assert.ok(esValido(normalizar(u)), u);
  for (const u of ["ab", ".ana", "ana.", "ana lopez", "ana@x", "a".repeat(31), "ñandú"]) assert.ok(!esValido(normalizar(u)), u);
});
