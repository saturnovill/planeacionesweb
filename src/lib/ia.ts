import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { FIJOS, cicloEscolar, METODOLOGIAS, REACTIVOS, TIPOS_SESION, actividadesSchema, schemaDe, type Actividades, type Planeacion, type ResultadoClases, type ResultadoProyecto } from "./planeacion.ts";

// Orden de modelos: el primero es el preferido; los demás se usan si falla (ver generarJSON).
// Sin reintentos del SDK y con corte a los 90 s por modelo: peor caso 3 × 90 s, dentro de maxDuration = 300.
// 3.8 Flash fijo (no el alias -latest, que puede cambiar de modelo y de precio); lite queda de último respaldo.
// Planeación: mejor secuencia y problemas que lite por ~$0.006 más por planeación (medido oct 2026).
export const MODELOS_PLANEACION = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-flash-lite-latest"];
// Actividades: Flash, porque calcula las respuestas y un error ahí pasa desapercibido.
export const MODELOS_ACTIVIDADES = MODELOS_PLANEACION;

const GRADOS = ["", "primer", "segundo", "tercer"];

type Entrada = Omit<Planeacion, "id" | "resultado" | "actividades" | "created_at">;

const CONTEXTO = (p: Entrada) =>
  `Actúa como un experto en planificación educativa para un docente de matemáticas de secundaria en un contexto socioeconómico medio-bajo, como Puerto Peñasco, Sonora, siguiendo el programa analítico mexicano del ciclo ${cicloEscolar(p.periodo_inicio)} para el campo formativo 'Saberes y Pensamiento Científico', disciplina de matemáticas, ${GRADOS[p.grado]} grado.`;

const temas = (p: Entrada) => p.seleccion.map((s) => `• Contenido: ${s.contenido}\n• PDA: ${s.pda}`).join("\n");

// La nota de una sesión aplica solo a esa sesión; las instrucciones generales, a todas.
const nota = (s: Entrada["sesiones_input"][number]) => (s.nota ? ` — instrucción SOLO para esta sesión: ${s.nota}` : "");

const generales = (p: Entrada) =>
  `${p.sesiones_input.some((s) => s.nota) ? "Cada instrucción marcada \"SOLO para esta sesión\" aplica únicamente a esa sesión; no la apliques a las demás.\n" : ""}${
    p.instrucciones ? `Instrucciones generales del docente (aplícalas a todas las sesiones siempre que sea posible): ${p.instrucciones}\n` : ""
  }`;

const indicaciones = (p: Entrada) => {
  const n = p.sesiones_input.length;
  const lista = p.sesiones_input.map((s, i) => `Sesión ${i + 1}: ${TIPOS_SESION[s.tipo]}${nota(s)}`).join("\n");
  return `Indicaciones por sesión (respétalas en orden; exactamente ${n} sesiones):
${lista}
En una sesión de "Cálculo mental" se practican operaciones básicas mentalmente con números enteros positivos y negativos. En una sesión de "Evaluación" se aplica un instrumento que valore el avance en el PDA.
${generales(p)}`;
};

const DIVERSIDAD = `Adaptaciones para atender la diversidad: estudiantes con dificultades de aprendizaje (problemas simplificados, apoyos visuales como pasos codificados por colores, roles estructurados en equipo) y estudiantes con mayor avance (problemas desafiantes, roles de liderazgo, crear problemas contextualizados). Considera barreras de lenguaje, necesidades motoras o visuales y el contexto socioeconómico (recursos mínimos: papel, lápices, pizarrón; valorar aportes orales tanto como escritos).`;

// Sesiones reales de "QUINCENA 2 14 - 25 SEP SEC 21.docx": el modelo copia esta estructura y extensión.
const EJEMPLO_SESIONES = `[
  {
    "titulo": "Descubriendo múltiplos y divisores",
    "inicio": "- Preguntar:\\n-- ¿Qué números aparecen cuando contamos de 5 en 5?\\n-- ¿Cómo sabemos si un número puede dividirse exactamente entre otro?\\n- Recuperar saberes previos mediante ejemplos cotidianos del comercio local.",
    "desarrollo": "- Explicación guiada sobre múltiplos y divisores.\\n- Resolver ejercicios individuales.\\n- En equipos elaborar una tabla de múltiplos y divisores de distintos números.\\n- Registrar conclusiones en el portafolio.",
    "cierre": "- Socializar respuestas.\\n- Elaborar una definición grupal de múltiplo y divisor.",
    "evaluacion": "Cuaderno y observación."
  },
  {
    "titulo": "Criterios de divisibilidad",
    "inicio": "- Juego rápido de identificación:\\n-- ¿Es divisible entre 2?\\n-- ¿Entre 3?\\n-- ¿Entre 5?",
    "desarrollo": "- Presentación de criterios de divisibilidad para 2, 3, 5, 6, 9 y 10.\\n- Trabajo en parejas clasificando números.\\n- Elaboración de una guía visual en el cuaderno.",
    "cierre": "Concurso breve de respuestas rápidas.",
    "evaluacion": "Cuaderno y lista de cotejo."
  },
  {
    "titulo": "Calculamos el Máximo Común Divisor (MCD)",
    "inicio": "- Problema contextual:\\n-- Una cooperativa turística tiene 24 chalecos salvavidas y 36 silbatos. ¿Cuál es el grupo más grande que puede formarse usando todo el material sin que sobre nada?",
    "desarrollo": "- Explicación del concepto de MCD.\\n- Resolución mediante factores primos.\\n- Problemas en equipos.",
    "cierre": "- Elaborar una conclusión:\\n-- ¿Cuándo conviene usar MCD?",
    "evaluacion": "Cuaderno, observación y participación."
  },
  {
    "titulo": "Integramos y resolvemos problemas",
    "inicio": "- Recuperar conceptos principales mediante preguntas detonadoras.",
    "desarrollo": "- Resolución de desafíos matemáticos que mezclen:\\n-- Divisibilidad.\\n-- Números primos.\\n-- MCD y MCM.\\n- Los estudiantes elaboran un problema propio contextualizado en Puerto Peñasco.",
    "cierre": "- Presentación de problemas.\\n- Autoevaluación y reflexión final del aprendizaje.",
    "evaluacion": "Lista de cotejo."
  }
]`;

const SESIONES = `- Para cada sesión, sigue EXACTAMENTE la estructura, el estilo y la extensión de este ejemplo real (otro contenido, mismo formato):
${EJEMPLO_SESIONES}
  Reglas que muestra el ejemplo:
  · Viñetas cortas (máximo 12 palabras) que inician con verbo en infinitivo ("Resolver", "Elaborar") o sustantivo de acción ("Explicación", "Resolución"); sin explicaciones largas.
  · Las preguntas detonadoras y los problemas van como sub-viñetas ('-- ') bajo una viñeta que termina en ':' ("Preguntar:", "Problema contextual:"). Los problemas llevan datos numéricos concretos y contexto de Puerto Peñasco (turismo, pesca, comercio).
  · Inicio: recupera saberes previos (1 a 3 viñetas). Desarrollo: explicación o modelado, práctica guiada, trabajo individual o en equipos y registro en el producto central (3 a 4 viñetas). Cierre: socializar, comparar o concluir (1 o 2 viñetas; si es una sola acción, va sin viñeta).
  · Las sesiones avanzan en secuencia: cada una retoma lo anterior y la última integra todo.
  · Evaluación: solo el instrumento, en pocas palabras.`;

function promptClases(p: Entrada) {
  const n = p.sesiones_input.length;
  return `${CONTEXTO(p)} Diseña un plan detallado para ${n} sesiones de clase, cada una de aproximadamente 35-45 minutos, con secciones de Inicio, Desarrollo y Cierre, para reforzar el siguiente contenido y Procesos de Desarrollo de Aprendizaje (PDA):
${temas(p)}

${indicaciones(p)}
Incluye:
- Propósito: un enunciado claro del objetivo de aprendizaje, enfocado en consolidar las habilidades en el contenido y PDA, contextualizado a la realidad de los estudiantes (ej. pesca, turismo o comercio en Puerto Peñasco), promoviendo el pensamiento crítico y la inclusión.
- Situación o problemática identificada: dificultades o carencias específicas de los estudiantes relacionadas con el contenido y PDA (ej. dificultad para transitar del pensamiento aritmético al algebraico, errores comunes observados en clase o en evaluaciones diagnósticas).
- Producto central a lograr: un resultado tangible y progresivo que los estudiantes construirán a lo largo de las sesiones, alineado con la evaluación formativa (cuaderno, lista de cotejo, observación).
- Escenarios y ejes articuladores.
- ${DIVERSIDAD}
- Actividades variadas alineadas con las orientaciones didácticas del programa (lluvia de ideas, trabajo colaborativo, uso del cuaderno, retroalimentación), prácticas, atractivas y contextualizadas al entorno socioeconómico y cultural de Puerto Peñasco.
${SESIONES}
- Recursos/materiales de todas las sesiones.

Redacta en español de México, claro y amigable para docentes. Sé conciso: la planeación completa debe caber en unas 4 páginas (cada sesión de 30 a 80 palabras en total, como el ejemplo; propósito, problemática, producto y adaptaciones de 40 a 80 palabras cada uno).`;
}

function promptProyecto(p: Entrada) {
  const n = p.sesiones_input.length;
  const m = METODOLOGIAS[p.metodologia ?? "steam"];
  return `${CONTEXTO(p)} Diseña un plan detallado para un PROYECTO integrador de la Nueva Escuela Mexicana (NEM) de ${n} sesiones de aproximadamente 35-45 minutos, cada una con Inicio, Desarrollo y Cierre, organizado con la metodología "${m.nombre}", para reforzar el siguiente contenido y Procesos de Desarrollo de Aprendizaje (PDA):
${temas(p)}

La metodología tiene ${m.momentos.length} momentos/fases, en este orden:
${m.momentos.map((x, i) => `${i + 1}. ${x}`).join("\n")}
Reparte las ${n} sesiones en orden entre los momentos. Si hay más momentos que sesiones, varios momentos consecutivos pueden compartir una misma sesión (indícalo en 'sesiones' y reparte las actividades); ningún momento puede quedar vacío.

${indicaciones(p)}
Incluye:
- Título del proyecto.
- Propósito: objetivo de aprendizaje del proyecto, enfocado en consolidar el contenido y PDA, contextualizado a la realidad de los estudiantes (ej. pesca, turismo o comercio en Puerto Peñasco), promoviendo el pensamiento crítico, la inclusión y la integración interdisciplinaria alineada con la NEM.
- Problema del contexto: la necesidad comunitaria o real que atiende el proyecto y las dificultades de los estudiantes relacionadas con el PDA (errores comunes o de evaluaciones diagnósticas).
- Producto central a lograr: resultado tangible y progresivo (ej. informe, modelo físico o digital, presentación en feria escolar) que se construye a lo largo del proyecto, alineado con la evaluación formativa (cuaderno, lista de cotejo, observación, portafolio).
- Escenarios y ejes articuladores.
- ${DIVERSIDAD}
- Para cada momento: actividades prácticas, atractivas y contextualizadas a Puerto Peñasco, alineadas con la NEM (aprendizaje basado en proyectos, trabajo colaborativo, uso del cuaderno, retroalimentación, integración comunitaria), que fomenten la investigación, la aplicación real y la presentación final, con su evaluación formativa.
- Recursos/materiales de todo el proyecto.

Redacta en español de México, claro y amigable para docentes. Sé conciso: la planeación completa debe caber en unas 5 páginas (propósito, problema, producto y adaptaciones de 40 a 80 palabras cada uno).`;
}

export async function generar(p: Entrada): Promise<ResultadoClases | ResultadoProyecto> {
  const schema = schemaDe(p);
  const prompt = p.tipo === "proyecto" ? promptProyecto(p) : promptClases(p);
  const paraIA = (schema as z.ZodObject).omit({ articulacion: true, rasgoPerfil: true });
  const res = (await generarJSON(MODELOS_PLANEACION, prompt, z.toJSONSchema(paraIA))) as object;
  return schema.parse({ ...res, ...FIJOS });
}

function promptActividades(p: Planeacion, anterior: string[]) {
  const n = p.sesiones_input.length;
  const titulos = p.resultado && "sesiones" in p.resultado ? p.resultado.sesiones.map((s) => s.titulo) : [];
  const lista = p.sesiones_input
    .map((s, i) => `Sesión ${i + 1}: ${TIPOS_SESION[s.tipo]} — ${REACTIVOS[s.tipo]} reactivos${titulos[i] ? ` — tema: ${titulos[i]}` : ""}${nota(s)}`)
    .join("\n");

  return `Analiza el grado, el número de sesiones, el contenido y el PDA. Con base en ese análisis, diseña una actividad por cada sesión de clase de matemáticas de ${GRADOS[p.grado]} grado de secundaria, considerando clases de 40 minutos, donde los estudiantes:
- Copien la actividad del pizarrón.
- Escuchen una explicación breve del docente (máximo 5-10 minutos).
- Resuelvan de manera individual el resto del tiempo.
Las actividades deben ser simples, claras y factibles, sin requerir más de 20-25 minutos de resolución individual.

${temas(p)}

Sesiones (exactamente ${n}, en este orden):
${lista}
${generales(p)}
Para cada sesión de Clase o Evaluación: exactamente 8 reactivos; los 6 primeros son operaciones puras y directas (sin contexto) y los 2 últimos son problemas contextualizados sencillos, cercanos a la vida de adolescentes (compras, distancias, tiempos), con precios reales aproximados en México cuando aplique (ej. $20 por un refresco).
Para cada sesión de Cálculo mental: exactamente 10 operaciones básicas (sumas, restas, multiplicaciones y divisiones) con enteros positivos y/o negativos, accesibles para práctica oral rápida${
    anterior.length
      ? `, con dificultad ligeramente mayor que el cálculo mental anterior (números un poco mayores o con signos). El anterior fue:\n${anterior.map((o) => `  ${o}`).join("\n")}`
      : "."
  }
Si se trabajan fracciones, la respuesta debe dar la versión sin simplificar y la simplificada ('6/8 = 3/4'); indica en la instrucción que se responda primero sin simplificar.
Cada sesión lleva un título claro; el enunciado no incluye la respuesta. Usa un lenguaje claro, conciso y motivador, adecuado para estudiantes de secundaria. Escribe las operaciones con símbolos simples (×, ÷, −, fracciones como 3/4, potencias como 2^3).`;
}

/** Genera las actividades; `anterior` son las operaciones del último cálculo mental del docente. */
export async function generarActividades(p: Planeacion, anterior: string[]): Promise<Actividades> {
  const tipos = p.sesiones_input.map((s) => s.tipo);
  const schema = actividadesSchema(tipos);
  const json = z.toJSONSchema(schema, { unrepresentable: "any" }) as unknown as { properties: { sesiones: { minItems?: number; maxItems?: number } } };
  // Gemini responde 400 si sesiones lleva minItems ≥ 9 junto al minItems de reactivos; el número lo exigen el prompt y schema.parse.
  delete json.properties.sesiones.minItems;
  delete json.properties.sesiones.maxItems;
  return schema.parse(await generarJSON(MODELOS_ACTIVIDADES, promptActividades(p, anterior), json));
}

/** ¿Probar con el siguiente modelo? Saturado/caído (5xx, 429), retirado (404), sin respuesta o JSON inválido (sin status). */
export function reintentable(e: unknown) {
  const status = (e as { status?: number }).status;
  return status === undefined || status >= 500 || status === 429 || status === 404;
}

async function generarJSON(modelos: string[], contents: string, responseJsonSchema: unknown): Promise<unknown> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { retryOptions: { attempts: 1 }, timeout: 90_000 } });
  for (const [i, model] of modelos.entries()) {
    const t = Date.now();
    try {
      const res = await ai.models.generateContent({ model, contents, config: { responseMimeType: "application/json", responseJsonSchema } });
      console.info(`[ia] ${model} ok en ${Date.now() - t} ms`);
      return JSON.parse(res.text ?? "");
    } catch (e) {
      console.warn(`[ia] ${model} falló (${(e as { status?: number }).status}) en ${Date.now() - t} ms`);
      if (i === modelos.length - 1 || !reintentable(e)) throw e;
    }
  }
}

/** Mensaje para el docente según por qué falló la IA. */
export function mensajeIA(e: unknown) {
  const status = (e as { status?: number }).status;
  if (status === undefined && !(e instanceof z.ZodError || e instanceof SyntaxError)) return "Gemini tardó demasiado en responder. Intenta de nuevo en un momento.";
  if (status === 429 || (status ?? 0) >= 500) return "Gemini está saturado o se alcanzó el límite gratuito. Espera 1-2 minutos e intenta de nuevo.";
  if (e instanceof z.ZodError || e instanceof SyntaxError) return "La IA devolvió una respuesta incompleta. Intenta de nuevo.";
  return "La IA no pudo generar el contenido. Intenta de nuevo.";
}
