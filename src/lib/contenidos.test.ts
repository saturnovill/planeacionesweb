import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { agregarPDA, parseContenidos, quitarPDA, type PDA } from "./contenidos.ts";

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

test("agrega y quita PDA a mano", () => {
  const lista: PDA[] = [
    { grado: 1, contenido: "A", pda: "a1", marcas: ["13 – 25 SEP"] },
    { grado: 1, contenido: "B", pda: "b1", marcas: [] },
    { grado: 2, contenido: "A", pda: "a2", marcas: [] },
  ];
  const pdas = (l: PDA[]) => l.map((p) => p.pda);
  assert.deepEqual(pdas(agregarPDA(lista, { grado: 1, contenido: "A", pda: "nuevo" })), ["a1", "nuevo", "b1", "a2"], "junto a su contenido");
  assert.deepEqual(pdas(agregarPDA(lista, { grado: 1, contenido: "Z", pda: "nuevo" })), ["a1", "b1", "nuevo", "a2"], "contenido nuevo: al final del grado");
  assert.deepEqual(pdas(agregarPDA(lista, { grado: 3, contenido: "Z", pda: "nuevo" })), ["a1", "b1", "a2", "nuevo"], "grado vacío: al final");
  assert.equal(agregarPDA(lista, { grado: 1, contenido: "A", pda: "a1" }), lista, "sin duplicados");
  assert.deepEqual(pdas(quitarPDA(lista, { grado: 1, contenido: "A", pda: "a1" })), ["b1", "a2"]);
  assert.equal(quitarPDA(lista, { grado: 2, contenido: "A", pda: "a1" }).length, 3, "solo el del mismo grado");
});
