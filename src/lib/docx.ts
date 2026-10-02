import PizZip from "pizzip";
import { readFileSync } from "node:fs";
import path from "node:path";
import { EJES, ESCUELAS, cicloEscolar, METODOLOGIAS, TIPOS_SESION, type Actividades, type Planeacion, type ResultadoClases, type ResultadoProyecto } from "./planeacion.ts";

/*
 * Llena el .docx original localizando cada fila por su etiqueta y reemplazando el contenido
 * de la celda. Así se conservan estilos, bordes, encabezado y logos.
 *   templates/clases-27|21.docx   ← "QUINCENA 2 ... SEC 27|21.docx"
 *   templates/proyecto-27|21.docx ← "Formato planeación proyectos.docx" (el 21 con el encabezado de clases-21)
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const textoDe = (xml: string) => [...xml.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]).join("");
const filas = (xml: string) => [...xml.matchAll(/<w:tr[ >][\s\S]*?<\/w:tr>/g)].map((m) => m[0]);
const celdas = (fila: string) => [...fila.matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)].map((m) => m[0]);

// Viñetas propias (• y o), agregadas a numbering.xml porque no todas las plantillas traen una.
const NUM_ID = 90;
const VINETAS = `<w:abstractNum w:abstractNumId="${NUM_ID}"><w:multiLevelType w:val="hybridMultilevel"/>${[
  ["", "Symbol", 720],
  ["o", "Courier New", 1440],
]
  .map(
    ([txt, font, ind], i) =>
      `<w:lvl w:ilvl="${i}"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="${txt}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${ind}" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:hint="default"/><w:sz w:val="20"/></w:rPr></w:lvl>`,
  )
  .join("")}</w:abstractNum>`;

type Opc = { b?: boolean; nivel?: 0 | 1; centro?: boolean };
function parrafo(texto: string, { b, nivel, centro }: Opc = {}) {
  const rPr = `<w:rPr>${b ? "<w:b/><w:bCs/>" : ""}<w:lang w:val="es-MX"/></w:rPr>`;
  const rNeg = `<w:rPr><w:b/><w:bCs/><w:lang w:val="es-MX"/></w:rPr>`;
  const num = nivel === undefined ? "" : `<w:numPr><w:ilvl w:val="${nivel}"/><w:numId w:val="${NUM_ID}"/></w:numPr>`;
  const jc = centro ? '<w:jc w:val="center"/>' : "";
  // "**x**" → run en negritas dentro del párrafo.
  const runs = texto
    .split(/\*\*(.+?)\*\*/)
    .map((t, i) => (t ? `<w:r>${i % 2 ? rNeg : rPr}<w:t xml:space="preserve">${esc(t)}</w:t></w:r>` : ""))
    .join("");
  return `<w:p><w:pPr>${num}${jc}${rPr}</w:pPr>${runs || `<w:r>${rPr}<w:t xml:space="preserve"></w:t></w:r>`}</w:p>`;
}

/** Convierte el mini-formato (# negritas, - viñeta, -- sub-viñeta, **negritas en línea**) en párrafos. */
export function markup(texto: string, centro = false) {
  const ps = texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      if (l.startsWith("# ")) return parrafo(l.slice(2), { b: true, centro });
      if (l.startsWith("-- ")) return parrafo(l.slice(3), { nivel: 1 });
      if (/^[-•] /.test(l)) return parrafo(l.slice(2), { nivel: 0 });
      return parrafo(l, { centro });
    });
  return ps.join("") || parrafo("");
}

const conCelda = (celda: string, contenido: string) =>
  celda.replace(/^(<w:tc>(?:<w:tcPr>[\s\S]*?<\/w:tcPr>)?)[\s\S]*<\/w:tc>$/, `$1${contenido}</w:tc>`);

/** Nueva fila a partir de un prototipo, con un contenido por celda. */
const conCeldas = (fila: string, contenidos: string[]) => {
  const cs = celdas(fila);
  return fila.slice(0, fila.indexOf("<w:tc>")) + cs.map((c, i) => conCelda(c, contenidos[i] ?? parrafo(""))).join("") + "</w:tr>";
};

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export function periodo(inicio: string, fin: string) {
  const [a1, m1, d1] = inicio.split("-").map(Number);
  const [a2, m2, d2] = fin.split("-").map(Number);
  if (a1 === a2 && m1 === m2) return `${d1} – ${d2} de ${MESES[m2 - 1]} de ${a2}`;
  if (a1 === a2) return `${d1} de ${MESES[m1 - 1]} – ${d2} de ${MESES[m2 - 1]} de ${a2}`;
  return `${d1} de ${MESES[m1 - 1]} de ${a1} – ${d2} de ${MESES[m2 - 1]} de ${a2}`;
}

const secuencia = (n: number, s: ResultadoClases["sesiones"][number]) =>
  parrafo(`Sesión ${n}. ${s.titulo}`, { b: true }) +
  parrafo("Inicio", { b: true }) + markup(s.inicio) +
  parrafo("Desarrollo", { b: true }) + markup(s.desarrollo) +
  parrafo("Cierre", { b: true }) + markup(s.cierre);

export function generarDocx(p: Planeacion & { resultado: ResultadoClases | ResultadoProyecto }, docente: string): Buffer {
  const zip = new PizZip(readFileSync(path.join(process.cwd(), "templates", `${p.tipo}-${p.escuela}.docx`)));
  let xml = zip.file("word/document.xml")!.asText();
  const r = p.resultado;

  // Filas "Etiqueta | valor": se reemplaza la segunda celda.
  const valores: Record<string, string> = {
    "Nombre de la escuela": parrafo(ESCUELAS[p.escuela]),
    "Nombre del docente": parrafo(docente),
    Fase: parrafo("6"),
    Periodo: parrafo(periodo(p.periodo_inicio, p.periodo_fin)),
    "Grado y grupos": parrafo(`${p.grado} ${p.grupos}`),
    "Campo formativo": parrafo("Saberes y pensamiento científico"),
    Disciplina: parrafo("Matemáticas"),
    "Propósito": markup(r.proposito),
    "Rasgo del perfil": markup(r.rasgoPerfil),
    Escenarios: markup(r.escenarios),
    "Producto central": markup(r.producto),
  };
  // Encabezados de una sola celda cuyo contenido va en la fila siguiente.
  const siguiente: Record<string, string> = {
    "Articulación con otras disciplinas": markup(r.articulacion),
    "Recursos/materiales": markup(r.recursos),
    "Adaptaciones para atender": markup(r.adaptaciones),
    "Atención a la diversidad": markup(r.adaptaciones),
  };
  if ("sesiones" in r) valores["Situación o problemática"] = markup(r.problematica);
  if ("momentos" in r) {
    valores["Título del proyecto"] = parrafo(r.titulo);
    valores["Problema del contexto"] = markup(r.problemaContexto);
    valores["Metodología didáctica"] = parrafo(METODOLOGIAS[p.metodologia ?? "steam"].nombre);
  }

  const fs = filas(xml);
  const nuevas = new Map<string, string>(); // fila original → reemplazo
  const etiqueta = (f: string) => textoDe(celdas(f)[0] ?? "").trim();

  fs.forEach((f, i) => {
    const et = etiqueta(f);
    const cs = celdas(f);
    const clave = Object.keys(valores).find((k) => et.startsWith(k));
    if (clave && cs.length === 2) nuevas.set(f, f.replace(cs[1], () => conCelda(cs[1], valores[clave])));

    const sig = Object.keys(siguiente).find((k) => et.startsWith(k));
    if (sig && fs[i + 1]) nuevas.set(fs[i + 1], conCeldas(fs[i + 1], [siguiente[sig]]));

    if (et === "Temas/Contenido") {
      const grupos = Map.groupBy(p.seleccion, (s) => s.contenido);
      const proto = fs[i + 1];
      nuevas.set(proto, [...grupos].map(([c, ss]) => conCeldas(proto, [parrafo(c), ss.map((s) => parrafo(s.pda)).join("")])).join(""));
    }

    if (et === "Inclusión") {
      const proto = fs[i + 1];
      nuevas.set(proto, conCeldas(proto, EJES.map((e) => parrafo(r.ejes.includes(e) ? "x" : "", { centro: true }))));
    }

    // Clases: filas "Sesión N" bajo el encabezado "Sesiones".
    if (et === "Sesiones" && "sesiones" in r) {
      let j = i + 1;
      const proto = fs[j];
      while (fs[j] && etiqueta(fs[j]).startsWith("Sesión")) nuevas.set(fs[j++], "");
      nuevas.set(
        proto,
        r.sesiones
          .map((s, k) => conCeldas(proto, [parrafo(`Sesión ${k + 1}`, { b: true, centro: true }), secuencia(k + 1, s), markup(s.evaluacion, true)]))
          .join(""),
      );
    }

    // Proyecto: filas "1." … "11." bajo el encabezado "Momentos o fases".
    if (et === "Momentos o fases" && "momentos" in r) {
      let j = i + 1;
      const proto = fs[j];
      while (fs[j] && /^\d+\.$/.test(etiqueta(fs[j]))) nuevas.set(fs[j++], "");
      const nombres = METODOLOGIAS[p.metodologia ?? "steam"].momentos;
      nuevas.set(
        proto,
        r.momentos
          .map((m, k) =>
            conCeldas(proto, [
              parrafo(`${k + 1}. ${nombres[k]}`, { b: true }),
              markup(m.sesiones, true),
              markup(m.actividades),
              markup(m.evaluacion, true),
            ]),
          )
          .join(""),
      );
    }
  });

  for (const [vieja, nueva] of nuevas) xml = xml.replace(vieja, () => nueva);

  // Pie: el marcador "Nombre del docente" + espacios bajo "Realizó:" (la etiqueta de la tabla lleva ":" y no coincide).
  xml = xml.replace(/>Nombre del docente( {2,})/, (_, espacios: string) => ">" + esc(docente.padEnd(18 + espacios.length)));
  zip.file("word/document.xml", xml);
  return finalizar(zip, p);
}

/** Agrega las viñetas propias, actualiza el ciclo escolar del encabezado y empaqueta. */
function finalizar(zip: PizZip, p: Pick<Planeacion, "periodo_inicio">) {
  const numbering = zip.file("word/numbering.xml")!.asText();
  zip.file(
    "word/numbering.xml",
    numbering.replace(/<w:num /, `${VINETAS}<w:num `).replace("</w:numbering>", `<w:num w:numId="${NUM_ID}"><w:abstractNumId w:val="${NUM_ID}"/></w:num></w:numbering>`),
  );

  const ciclo = cicloEscolar(p.periodo_inicio);
  for (const h of zip.file(/^word\/header\d*\.xml$/))
    zip.file(h.name, h.asText().replace(/CICLO ESCOLAR \d{4}-\d{4}/g, `CICLO ESCOLAR ${ciclo}`));

  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
}

/** Hoja de actividades: el encabezado de la escuela (con logos en SEC 27) y un cuerpo nuevo. */
export function docxActividades(p: Planeacion & { actividades: Actividades }, docente: string): Buffer {
  const zip = new PizZip(readFileSync(path.join(process.cwd(), "templates", `clases-${p.escuela}.docx`)));
  const xml = zip.file("word/document.xml")!.asText();

  const run = (t: string, b = false) => `<w:r><w:rPr>${b ? "<w:b/><w:bCs/>" : ""}<w:lang w:val="es-MX"/></w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r>`;
  const espacio = '<w:pPr><w:spacing w:before="240"/></w:pPr>';
  const cuerpo = [
    // El margen superior de la plantilla es menor que el encabezado: se baja el título para no rodear los logos.
    `<w:p><w:pPr><w:spacing w:before="720"/><w:jc w:val="center"/></w:pPr>${run("ACTIVIDADES", true)}</w:p>`,
    parrafo(`${ESCUELAS[p.escuela]} · ${p.grado}° ${p.grupos} · ${periodo(p.periodo_inicio, p.periodo_fin)}`, { centro: true }),
    parrafo(`Docente: ${docente}`, { centro: true }),
    ...p.actividades.sesiones.map(
      (s, i) =>
        `<w:p>${espacio}${run(`Sesión ${i + 1}. ${s.titulo}`, true)}${run(p.sesiones_input[i]?.tipo === "calculo_mental" ? ` (${TIPOS_SESION.calculo_mental})` : "")}</w:p>` +
        parrafo(s.indicacion) +
        s.reactivos.map((r, k) => `<w:p>${run(`${k + 1}. ${r.enunciado}   `)}${run(`(${r.respuesta})`, true)}</w:p>`).join(""),
    ),
  ].join("");

  // Se conserva el sectPr final del cuerpo (márgenes y referencia al encabezado).
  const sectPr = xml.slice(xml.lastIndexOf("<w:sectPr"), xml.lastIndexOf("</w:body>"));
  zip.file("word/document.xml", xml.slice(0, xml.indexOf("<w:body>") + 8) + cuerpo + sectPr + xml.slice(xml.lastIndexOf("</w:body>")));
  return finalizar(zip, p);
}
