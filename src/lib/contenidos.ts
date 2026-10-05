export type PDA = { grado: 1 | 2 | 3; contenido: string; pda: string; marcas: string[] };

// Anotaciones a mano en el documento: "13 – 25 SEP", "QUINCENA 1"
const MARCA = /^(QUINCENA\b.*|\d{1,2}\s*[–-]\s*\d{1,2}\s+[A-ZÁÉÍÓÚ]{3,}.*)$/i;

const decode = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

const all = (xml: string, re: RegExp) => [...xml.matchAll(re)].map((m) => m[1] ?? m[0]);

const parrafos = (celda: string) =>
  all(celda, /<w:p[ >][\s\S]*?<\/w:p>/g)
    .map((p) => decode(all(p, /<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g).join("")).replace(/\s+/g, " ").trim())
    .filter(Boolean);

// Texto convertido de PDF: palabras cortadas al final de línea ("estra-tegias")
const unirGuiones = (s: string) => s.replace(/([a-záéíóúñ])- ?([a-záéíóúñ])/g, "$1$2");

/** Lee las tablas de contenidos: col 0 = contenido, cols 1-3 = PDA de 1°, 2° y 3°.
 *  Acepta la tabla única de CONTENIDOS.docx o el Programa Sintético (una tabla por página). */
// pizzip se importa al usarse para no cargarlo en el navegador (el perfil usa las funciones de abajo en el cliente).
export async function parseContenidos(buf: ArrayBuffer | Buffer): Promise<PDA[]> {
  const { default: PizZip } = await import("pizzip");
  const xml = new PizZip(buf).file("word/document.xml")?.asText();
  const tablas = xml?.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g);
  if (!tablas) throw new Error("El documento no tiene una tabla de contenidos.");

  const out: PDA[] = [];
  let contenido = "";
  for (const fila of all(tablas.join(""), /<w:tr[ >][\s\S]*?<\/w:tr>/g)) {
    const celdas = all(fila, /<w:tc>[\s\S]*?<\/w:tc>/g).map(parrafos);
    if (celdas.length < 4 || celdas.slice(1).some((ps) => /grado$/i.test(ps.join(" ")))) continue;
    const marcasFila = celdas[0].filter((p) => MARCA.test(p));
    // Contenido vacío: la fila sigue al de la página anterior
    contenido = unirGuiones(celdas[0].filter((p) => !MARCA.test(p)).join(" ")) || contenido;
    if (!contenido || /^contenidos?$/i.test(contenido)) continue;

    celdas.slice(1, 4).forEach((ps, i) => {
      const grado = (i + 1) as 1 | 2 | 3;
      const inicio = out.length;
      for (const p of ps) {
        const prev = out.length > inicio ? out[out.length - 1] : null;
        // Un PDA partido en dos párrafos (o dos páginas): la continuación empieza en minúscula
        const ult = prev ?? out.findLast((q) => q.grado === grado && q.contenido === contenido);
        if (MARCA.test(p)) prev?.marcas.push(p);
        else if (ult && /^[a-záéíóúñ]/.test(p)) ult.pda = unirGuiones(ult.pda + " " + p);
        else out.push({ grado, contenido, pda: unirGuiones(p), marcas: [...marcasFila] });
      }
    });
  }
  if (!out.length) throw new Error("No se encontraron PDA en el documento.");
  return out;
}

const igual = (a: Omit<PDA, "marcas">, b: Omit<PDA, "marcas">) => a.grado === b.grado && a.contenido === b.contenido && a.pda === b.pda;

/** Agrega un PDA a mano: tras el último de su mismo contenido y grado, o al final de su grado. */
export function agregarPDA(lista: PDA[], nuevo: Omit<PDA, "marcas">): PDA[] {
  if (lista.some((p) => igual(p, nuevo))) return lista;
  const i = lista.findLastIndex((p) => p.grado === nuevo.grado && p.contenido === nuevo.contenido);
  const j = i >= 0 ? i : lista.findLastIndex((p) => p.grado === nuevo.grado);
  return lista.toSpliced(j >= 0 ? j + 1 : lista.length, 0, { ...nuevo, marcas: [] });
}

/** Quita un PDA por su texto (no por índice, por si la lista cambió desde que se mostró). */
export const quitarPDA = (lista: PDA[], x: Omit<PDA, "marcas">) => lista.filter((p) => !igual(p, x));

/** Reemplaza las marcas de "ya usado" de un PDA ([] las quita). */
export const marcarPDA = (lista: PDA[], x: Omit<PDA, "marcas">, marcas: string[]) => lista.map((p) => (igual(p, x) ? { ...p, marcas } : p));

export type Accion = "agregar" | "quitar" | "marcar" | "desmarcar";

/** Aplica una edición a mano; la misma función corre en el navegador (al instante) y en el servidor (al guardar). */
export const editarContenidos = (lista: PDA[], accion: Accion, x: Omit<PDA, "marcas">) =>
  accion === "quitar" ? quitarPDA(lista, x)
  : accion === "marcar" ? marcarPDA(lista, x, ["ya usado"])
  : accion === "desmarcar" ? marcarPDA(lista, x, [])
  : agregarPDA(lista, x);
