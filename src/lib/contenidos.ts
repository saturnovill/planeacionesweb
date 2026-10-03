import PizZip from "pizzip";

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

/** Lee la primera tabla de CONTENIDOS.docx: col 0 = contenido, cols 1-3 = PDA de 1°, 2° y 3°. */
export function parseContenidos(buf: ArrayBuffer | Buffer): PDA[] {
  const xml = new PizZip(buf).file("word/document.xml")?.asText();
  const tabla = xml?.match(/<w:tbl>[\s\S]*?<\/w:tbl>/)?.[0];
  if (!tabla) throw new Error("El documento no tiene una tabla de contenidos.");

  const out: PDA[] = [];
  for (const fila of all(tabla, /<w:tr[ >][\s\S]*?<\/w:tr>/g)) {
    const celdas = all(fila, /<w:tc>[\s\S]*?<\/w:tc>/g).map(parrafos);
    if (celdas.length < 4) continue;
    const marcasFila = celdas[0].filter((p) => MARCA.test(p));
    const contenido = celdas[0].filter((p) => !MARCA.test(p)).join(" ");
    if (!contenido || /^contenidos?$/i.test(contenido)) continue;

    celdas.slice(1, 4).forEach((ps, i) => {
      const grado = (i + 1) as 1 | 2 | 3;
      const inicio = out.length;
      for (const p of ps) {
        const prev = out.length > inicio ? out[out.length - 1] : null;
        if (MARCA.test(p)) prev?.marcas.push(p);
        // Un PDA partido en dos párrafos: la continuación empieza en minúscula
        else if (prev && /^[a-záéíóúñ]/.test(p)) prev.pda += " " + p;
        else out.push({ grado, contenido, pda: p, marcas: [...marcasFila] });
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
