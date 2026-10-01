import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseContenidos } from "./contenidos.ts";

test("lee CONTENIDOS.docx de referencia", () => {
  const pdas = parseContenidos(readFileSync("fixtures/CONTENIDOS.docx"));
  const g = (n: number) => pdas.filter((p) => p.grado === n);

  assert.ok(g(1).length > 30 && g(2).length > 15 && g(3).length > 15);
  assert.ok(pdas.every((p) => !/QUINCENA|SEP$/.test(p.pda)), "las marcas no son PDA");

  const mcd = pdas.find((p) => p.pda.startsWith("Usa criterios de divisibilidad"));
  assert.equal(mcd?.grado, 2);
  assert.equal(mcd?.contenido, "Extensión del significado de las operaciones y sus relaciones inversas.");
  assert.deepEqual(mcd?.marcas, ["13 – 25 SEP"]);

  const conv = pdas.find((p) => p.pda.startsWith("Resuelve problemas que implican conversiones"));
  assert.match(conv!.pda, /múltiplos y submúltiplos/, "une PDA partidos");

  assert.ok(pdas.some((p) => p.contenido.startsWith("Interpretación de la información a través")));
  assert.ok(pdas.filter((p) => p.contenido.startsWith("Suma y resta")).every((p) => p.marcas.includes("QUINCENA 1")));
});
