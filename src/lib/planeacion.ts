import { z } from "zod";

export const ESCUELAS = { "27": "No. 27 Prof. Gilberto Pacheco Castillo", "21": "No. 21" } as const;
export type Escuela = keyof typeof ESCUELAS;

// Mismo orden que las columnas de la tabla "Ejes articuladores" del formato.
export const EJES = [
  "Inclusión",
  "Pensamiento crítico",
  "Interculturalidad crítica",
  "Igualdad de género",
  "Vida saludable",
  "Apropiación de las culturas a través de la lectura y la escritura",
  "Artes y experiencias estéticas",
] as const;

export const TIPOS_SESION = { clase: "Clase", calculo_mental: "Cálculo mental", evaluacion: "Evaluación" } as const;
export type SesionInput = { tipo: keyof typeof TIPOS_SESION; nota: string };
export type Seleccion = { contenido: string; pda: string };

// Metodologías sociocríticas de la NEM, con sus momentos/fases en orden.
export const METODOLOGIAS = {
  steam: {
    nombre: "Aprendizaje basado en indagación (STEAM como enfoque)",
    momentos: ["Introducción al tema", "Diseño de investigación", "Organizar y estructurar las respuestas a las preguntas específicas de indagación", "Presentación de los resultados de indagación", "Metacognición"],
  },
  abpc: {
    nombre: "Aprendizaje basado en proyectos comunitarios",
    momentos: ["Identificación", "Recuperación", "Planificación", "Acercamiento", "Comprensión y producción", "Reconocimiento", "Concreción", "Integración", "Difusión", "Consideraciones", "Avances"],
  },
  abp: {
    nombre: "Aprendizaje basado en problemas (ABP)",
    momentos: ["Presentemos", "Recolectemos", "Formulemos el problema", "Organicemos la experiencia", "Vivamos la experiencia", "Resultados y análisis"],
  },
  as: {
    nombre: "Aprendizaje servicio (AS)",
    momentos: ["Punto de partida", "Lo que sé y lo que quiero saber", "Organicemos las actividades", "Creatividad en marcha", "Compartimos y evaluamos lo aprendido"],
  },
} as const;
export type Metodologia = keyof typeof METODOLOGIAS;

export type Planeacion = {
  id: string;
  tipo: "clases" | "proyecto";
  escuela: Escuela;
  grado: number;
  grupos: string;
  periodo_inicio: string;
  periodo_fin: string;
  metodologia: Metodologia | null;
  instrucciones: string;
  seleccion: Seleccion[];
  sesiones_input: SesionInput[];
  resultado: ResultadoClases | ResultadoProyecto | null;
  actividades: Actividades | null;
  created_at: string;
};

/** Ciclo escolar ("2026-2027") de una fecha "AAAA-MM-DD": empieza en agosto. */
export function cicloEscolar(fecha: string) {
  const [anio, mes] = fecha.split("-").map(Number);
  return mes >= 8 ? `${anio}-${anio + 1}` : `${anio - 1}-${anio}`;
}

/*
 * Todos los campos de texto usan el mismo mini-formato, por línea:
 *   "# texto"  → párrafo en negritas
 *   "- texto"  → viñeta
 *   "-- texto" → sub-viñeta
 *   otro       → párrafo normal
 *   "**x**"    → negritas dentro de la línea
 * Así cada campo se edita con texto rico (ver markup.ts) y se convierte igual al .docx.
 */
const FORMATO = "Texto con una idea por línea. '# ' = subtítulo en negritas, '- ' = viñeta, '-- ' = sub-viñeta, '**palabra**' = negritas dentro del texto.";
const texto = (d: string) => z.string().describe(`${d} ${FORMATO}`);

// Estructura de las sesiones de "QUINCENA 2 14 - 25 SEP SEC 21.docx" (ver EJEMPLO_SESIONES en ia.ts).
const ACCIONES = "Viñetas '- ' que inician con verbo en infinitivo o sustantivo de acción, de máximo 12 palabras; una viñeta que termina en ':' introduce sub-viñetas '-- ' con preguntas o el problema; sin '# '.";
const sesionSchema = z.object({
  titulo: z.string().describe("Título breve de la sesión, sin el número, en gerundio o primera persona del plural. Ej: 'Descubriendo múltiplos y divisores', 'Calculamos el Mínimo Común Múltiplo (MCM)'."),
  inicio: texto(`Actividades de inicio: 1 a 3 viñetas que recuperan saberes previos con preguntas detonadoras o un problema contextual con datos concretos. ${ACCIONES}`),
  desarrollo: texto(`Actividades de desarrollo: 3 a 4 viñetas (explicación o modelado, ejercicios guiados, trabajo individual o en equipos, registro en el producto). ${ACCIONES}`),
  cierre: texto(`Actividades de cierre: 1 o 2 viñetas (socializar, comparar, conclusión o reflexión). Si es una sola acción va como párrafo sin '- '. ${ACCIONES}`),
  evaluacion: z.string().describe("Instrumento de evaluación formativa, breve. Ej: 'Cuaderno y observación.', 'Lista de cotejo.'"),
});

// Texto fijo copiado de la plantilla "QUINCENA 2 14 - 25 SEP SEC 21|27.docx"; no lo genera la IA.
export const FIJOS = {
  articulacion: `# Lenguajes
- Búsqueda y análisis de información: comprendidas como habilidades relacionadas con la identificación de una variedad de tipos de fuentes; el acceso a estas; su examen, para luego aceparlas o rechazarlas; y el análisis e interpretación de la información que dichas fuentes proveen.
# Ética, naturaleza y sociedad
- Reflexión crítica y responsable: referida a un conjunto de habilidades asociadas a la capacidad de reflexionar sobre tecnología, considerando criterios de impacto social y ambiental, de calidad, de efectividad, de respeto y ética.
# De lo humano y lo comunitario
- Trabajar colaborativamente, lo que se refleja en el compromiso por la prosecución de los objetivos del equipo; en asumir responsabilidades en el grupo y establecer maneras de trabajo eficiente; en aceptar consejos y críticas, escuchando y respetando al otro para llegar a acuerdos; en tomar conciencia y superar las dificultades personales y del trabajo; en aprender de los errores; en solicitar y prestar ayuda a sus pares para el cumplimiento de las metas del trabajo.`,
  rasgoPerfil:
    "Desarrollan el pensamiento crítico que les permita valorar los conocimientos y saberes de las ciencias y humanidades, reconociendo la importancia que tienen la historia y la cultura para examinar críticamente sus propias ideas y el valor de los puntos de vista de las y los demás como elementos centrales para proponer transformaciones en su comunidad desde una perspectiva solidaria.",
};

// Campos comunes a ambos formatos.
const comunes = {
  proposito: z.string().describe("Un párrafo que inicie con 'Que las y los estudiantes...'."),
  producto: texto("'# Nombre del producto', párrafo, viñetas con lo que elaborarán y párrafo de cómo se evalúa."),
  articulacion: z.string(),
  rasgoPerfil: z.string(),
  escenarios: z.string().describe("Ej: 'Aula y escuela'."),
  ejes: z.array(z.enum(EJES)).min(1).max(3).describe("Ejes articuladores que se trabajan."),
  recursos: z.string().describe("Materiales, uno por línea, sin viñetas."),
  adaptaciones: texto("'# Estudiantes con dificultades de aprendizaje' con viñetas y '# Estudiantes con mayor avance' con viñetas."),
};

export const resultadoClasesSchema = (n: number) =>
  z.object({
    ...comunes,
    problematica: texto("Párrafo introductorio, viñetas con las dificultades detectadas y un párrafo de cierre."),
    sesiones: z.array(sesionSchema).length(n),
  });

const momentoSchema = z.object({
  sesiones: z.string().describe("Sesiones que abarca este momento. Ej: 'Sesión 1' o 'Sesiones 2 y 3'."),
  actividades: texto(
    "Por cada sesión del momento: '# Sesión N. Título' y viñetas '- Inicio: ...', '- Desarrollo: ...', '- Cierre: ...' (máximo 20 palabras cada una); sub-viñetas solo para preguntas o ejemplos.",
  ),
  evaluacion: z.string().describe("Instrumento de evaluación formativa, breve. Ej: 'Bitácora y lista de cotejo.'"),
});

export const resultadoProyectoSchema = (momentos: number) =>
  z.object({
    ...comunes,
    titulo: z.string().describe("Título atractivo del proyecto."),
    problemaContexto: texto("Problema real de la comunidad que el proyecto atiende y las dificultades de los estudiantes relacionadas con el PDA."),
    momentos: z.array(momentoSchema).length(momentos).describe("Un elemento por momento de la metodología, en orden."),
  });

export type ResultadoClases = z.infer<ReturnType<typeof resultadoClasesSchema>>;
export type ResultadoProyecto = z.infer<ReturnType<typeof resultadoProyectoSchema>>;
export type Sesion = ResultadoClases["sesiones"][number];

/** Esquema del resultado según el tipo de planeación. */
export const schemaDe = (p: Pick<Planeacion, "tipo" | "metodologia" | "sesiones_input">) =>
  p.tipo === "proyecto" ? resultadoProyectoSchema(METODOLOGIAS[p.metodologia ?? "steam"].momentos.length) : resultadoClasesSchema(p.sesiones_input.length);

// ── Actividades (hoja de ejercicios por sesión) ──────────────────────────────
// Sesión de cálculo mental: 10 operaciones; cualquier otra: 8 reactivos (6 directos + 2 contextualizados).
export const REACTIVOS = { clase: 8, evaluacion: 8, calculo_mental: 10 } as const;

const reactivoSchema = z.object({
  enunciado: z.string().describe("El reactivo tal como se copia del pizarrón."),
  respuesta: z.string().describe("Respuesta correcta para el docente. Con fracciones: 'sin simplificar = simplificada', ej. '6/8 = 3/4'."),
});

export const actividadesSchema = (tipos: SesionInput["tipo"][]) =>
  z
    .object({
      sesiones: z
        .array(
          z.object({
            titulo: z.string().describe("Título claro y motivador de la actividad."),
            indicacion: z.string().describe("Instrucción breve para el alumnado, ej. 'Resuelve en tu cuaderno sin simplificar.'"),
            reactivos: z.array(reactivoSchema).min(8).max(10),
          }),
        )
        .length(tipos.length),
    })
    .superRefine((a, ctx) =>
      a.sesiones.forEach((s, i) => {
        if (s.reactivos.length !== REACTIVOS[tipos[i]])
          ctx.addIssue({ code: "custom", path: ["sesiones", i, "reactivos"], message: `La sesión ${i + 1} debe tener ${REACTIVOS[tipos[i]]} reactivos.` });
      }),
    );

export type Actividades = z.infer<ReturnType<typeof actividadesSchema>>;

/** Operaciones del cálculo mental más reciente (las planeaciones vienen de la más nueva a la más vieja). */
export function ultimoCalculoMental(previas: Pick<Planeacion, "sesiones_input" | "actividades">[]): string[] {
  for (const q of previas) {
    const i = q.sesiones_input.map((s) => s.tipo).lastIndexOf("calculo_mental");
    if (i >= 0 && q.actividades?.sesiones[i]) return q.actividades.sesiones[i].reactivos.map((r) => r.enunciado);
  }
  return [];
}
