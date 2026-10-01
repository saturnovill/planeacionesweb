import { test } from "node:test";
import assert from "node:assert/strict";
import PizZip from "pizzip";
import { docxActividades, generarDocx, periodo } from "./docx.ts";
import { actividadesSchema, ultimoCalculoMental, type Actividades, type Planeacion, type ResultadoClases, type ResultadoProyecto } from "./planeacion.ts";

const resultado: ResultadoClases = {
  proposito: "Que las y los estudiantes <practiquen> & aprendan.",
  problematica: "Se identifica que:\n- No suman\n- No restan\nFin.",
  producto: "# Portafolio\nIncluye:\n- Tablas",
  articulacion: "# Lenguajes\n- Búsqueda de información",
  rasgoPerfil: "Pensamiento crítico.",
  escenarios: "Aula",
  ejes: ["Pensamiento crítico", "Vida saludable"],
  sesiones: [1, 2, 3].map((n) => ({ titulo: `Tema ${n}`, inicio: "- Preguntar:\n-- ¿Qué es?", desarrollo: "- Hacer", cierre: "- Cerrar", evaluacion: `Eval ${n}` })),
  recursos: "Cuaderno\nLápiz",
  adaptaciones: "# Estudiantes con dificultades de aprendizaje\n- Apoyo",
};

const base: Planeacion & { resultado: ResultadoClases } = {
  id: "x", tipo: "clases", escuela: "27", grado: 2, grupos: "(A y B)", periodo_inicio: "2026-09-14", periodo_fin: "2026-09-25",
  metodologia: null, instrucciones: "", seleccion: [{ contenido: "C1", pda: "P1" }, { contenido: "C1", pda: "P2" }, { contenido: "C2", pda: "P3" }],
  sesiones_input: [], resultado, actividades: null, created_at: "",
};

const texto = (buf: Buffer) => new PizZip(buf).file("word/document.xml")!.asText();

test("periodo", () => {
  assert.equal(periodo("2026-09-14", "2026-09-25"), "14 – 25 de septiembre de 2026");
  assert.equal(periodo("2026-09-28", "2026-10-09"), "28 de septiembre – 9 de octubre de 2026");
});

test("llena el formato SEC 27 y SEC 21", () => {
  for (const escuela of ["27", "21"] as const) {
    const xml = texto(generarDocx({ ...base, escuela }, "Docente Prueba"));
    for (const s of ["Docente Prueba", "14 – 25 de septiembre de 2026", "2 (A y B)", "&lt;practiquen&gt; &amp;", "Sesión 3. Tema 3", "Eval 3", "¿Qué es?", "P3", "Apoyo"])
      assert.ok(xml.includes(s), `${escuela}: falta ${s}`);
    for (const s of [">Nombre del docente ", "Descubriendo", "Suspensión", "Sesión 4", "Cuaderno de matemáticas.", "Imagen 4"])
      assert.ok(!xml.includes(s), `${escuela}: sobra ${s}`);
    assert.ok(xml.includes(escuela === "27" ? "Gilberto Pacheco" : ">No. 21<"));
    assert.equal((xml.match(/>x</g) ?? []).length, 2);
    const header = new PizZip(generarDocx({ ...base, escuela }, "D")).file("word/header1.xml")!.asText();
    assert.ok(header.includes("CICLO ESCOLAR 2026-2027") && !header.includes("2024-2025"));
  }
});

const proyecto: ResultadoProyecto = {
  ...resultado,
  titulo: "Feria de la pesca",
  problemaContexto: "Reparto injusto de la pesca.\n- No calculan MCD",
  momentos: [1, 2, 3, 4, 5].map((n) => ({ sesiones: `Sesión ${n}`, actividades: `# Sesión ${n}. Tema\n- Inicio: algo\n-- ¿Pregunta ${n}?`, evaluacion: `Bitácora ${n}` })),
};
const baseProyecto = { ...base, tipo: "proyecto" as const, metodologia: "steam" as const, resultado: proyecto };

test("llena el formato de proyecto SEC 27 y SEC 21", () => {
  for (const escuela of ["27", "21"] as const) {
    const zip = new PizZip(generarDocx({ ...baseProyecto, escuela }, "Docente Prueba"));
    const xml = zip.file("word/document.xml")!.asText();
    for (const s of ["Feria de la pesca", "Reparto injusto", "Aprendizaje basado en indagación", "1. Introducción al tema", "5. Metacognición", "¿Pregunta 5?", "Bitácora 5", "Saberes y pensamiento científico", "Matemáticas", "P3", "Apoyo", "Docente Prueba"])
      assert.ok(xml.includes(s), `${escuela}: falta ${s}`);
    assert.ok(!/>\s*(6|7|8|9|10|11)\.\s*</.test(xml), `${escuela}: sobran filas de momentos vacíos`);
    assert.ok(!xml.includes("Nombre del docente  "), "firma reemplazada");
    assert.equal((xml.match(/>x</g) ?? []).length, 2);
    assert.ok(zip.file("word/numbering.xml")!.asText().includes('w:numId="90"'), "viñetas propias");
    const header = zip.file("word/header1.xml")!.asText();
    assert.ok(header.includes("CICLO ESCOLAR 2026-2027"));
    assert.equal(header.includes("r:embed"), escuela === "27", "logos solo en SEC 27");
  }
});

test("ABP comunitario usa 11 momentos", () => {
  const momentos = Array.from({ length: 11 }, () => ({ sesiones: "Sesión 1", actividades: "- x", evaluacion: "e" }));
  const xml = new PizZip(generarDocx({ ...baseProyecto, metodologia: "abpc", resultado: { ...proyecto, momentos } }, "D")).file("word/document.xml")!.asText();
  assert.ok(xml.includes("1. Identificación") && xml.includes("11. Avances"));
});

const actividades: Actividades = {
  sesiones: [8, 10].map((n, i) => ({
    titulo: `Actividad ${i + 1}`,
    indicacion: "Resuelve sin simplificar.",
    reactivos: Array.from({ length: n }, (_, k) => ({ enunciado: `${k} × 3 <`, respuesta: `${k * 3}` })),
  })),
};

test("valida el número de reactivos por tipo de sesión", () => {
  assert.ok(actividadesSchema(["clase", "calculo_mental"]).safeParse(actividades).success);
  assert.ok(!actividadesSchema(["calculo_mental", "clase"]).safeParse(actividades).success);
  assert.ok(!actividadesSchema(["clase"]).safeParse(actividades).success);
});

test("toma el cálculo mental más reciente", () => {
  const sin = { sesiones_input: [{ tipo: "clase" as const, nota: "" }], actividades: null };
  const con = { sesiones_input: [{ tipo: "clase" as const, nota: "" }, { tipo: "calculo_mental" as const, nota: "" }], actividades };
  assert.deepEqual(ultimoCalculoMental([]), []);
  assert.deepEqual(ultimoCalculoMental([sin]), []);
  assert.equal(ultimoCalculoMental([sin, con]).length, 10);
  assert.equal(ultimoCalculoMental([sin, con])[9], "9 × 3 <");
});

test("genera la hoja de actividades con el encabezado de la escuela", () => {
  for (const escuela of ["27", "21"] as const) {
    const sesiones_input = [{ tipo: "clase" as const, nota: "" }, { tipo: "calculo_mental" as const, nota: "" }];
    const zip = new PizZip(docxActividades({ ...base, escuela, sesiones_input, actividades }, "Docente Prueba"));
    const xml = zip.file("word/document.xml")!.asText();
    for (const s of ["ACTIVIDADES", "Docente: Docente Prueba", "Sesión 2. Actividad 2", "(Cálculo mental)", "10. 9 × 3 &lt;", "(27)", "<w:sectPr"])
      assert.ok(xml.includes(s), `${escuela}: falta ${s}`);
    assert.ok(!xml.includes("PLANEACIÓN DOCENTE") && !xml.includes("Descubriendo"), "sin el contenido de la plantilla");
    assert.equal(zip.file("word/header1.xml")!.asText().includes("r:embed"), escuela === "27");
  }
});

if (process.env.OUT) {
  const { writeFileSync } = await import("node:fs");
  writeFileSync(process.env.OUT, generarDocx(base, "Docente Prueba"));
  writeFileSync(process.env.OUT.replace(".docx", "-proyecto.docx"), generarDocx(baseProyecto, "Docente Prueba"));
  writeFileSync(process.env.OUT.replace(".docx", "-actividades.docx"), docxActividades({ ...base, escuela: "27", sesiones_input: [{ tipo: "clase", nota: "" }, { tipo: "calculo_mental", nota: "" }], actividades }, "Docente Prueba"));
}
