import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { mensajeIA, reintentable } from "./ia.ts";

test("decide cuándo probar con el siguiente modelo", () => {
  for (const status of [404, 429, 500, 503, 504]) assert.ok(reintentable({ status }), String(status));
  assert.ok(reintentable(new Error("timeout")), "sin status");
  assert.ok(reintentable(new SyntaxError("JSON")), "JSON inválido");
  for (const status of [400, 401, 403]) assert.ok(!reintentable({ status }), String(status));
});

test("mensaje para el docente según el error", () => {
  assert.match(mensajeIA({ status: 504 }), /saturado/);
  assert.match(mensajeIA({ status: 429 }), /límite gratuito/);
  assert.match(mensajeIA(new Error("timeout")), /tardó demasiado/);
  assert.match(mensajeIA(new SyntaxError("x")), /incompleta/);
  assert.match(mensajeIA(z.string().safeParse(1).error), /incompleta/);
  assert.match(mensajeIA({ status: 400 }), /no pudo generar/);
});
