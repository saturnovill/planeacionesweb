# Planeaciones — Plan del proyecto

App Next.js, pensada primero para celular y optimizada para navegador, para generar con IA las planeaciones de Matemáticas de secundaria y exportarlas en `.docx` con el formato oficial.

## Alcance acordado

| Tema | Decisión |
|---|---|
| Usuarios | Varios docentes, cada uno con su login |
| Persistencia | Historial en BD: abrir, editar y volver a descargar |
| IA | Gemini (Flash), con salida JSON estructurada |
| Disciplina | Solo Matemáticas. El contexto (Puerto Peñasco, nivel medio-bajo) es fijo en los prompts |
| Escuelas | Fijas: **SEC 27** (con logos) y **SEC 21** (sin logos) |
| Contenidos | Cada docente sube `CONTENIDOS.docx` una vez; se procesa y se guarda, y se puede reemplazar |
| Días sin clase | No se incluyen; solo hay sesiones con clase |
| Campos del documento | La IA propone todos y el docente los edita a mano (no hay regeneración por sección) |
| Exportación | Solo `.docx` |
| Modos | Planeación por clases, planeación por proyecto, actividades (8 reactivos) y cálculo mental (10 operaciones) |
| Actividades | Un `.docx` aparte, generado desde una planeación guardada |
| Proyecto | Formato propio (`Formato planeación proyectos.docx`); el docente elige la metodología |

## Stack

- **Next.js** (App Router, TS) + **Tailwind** → Vercel
- **Supabase**: Auth (correo/Google) + Postgres con RLS
- **@google/genai**: Gemini con `responseMimeType: application/json` + `responseJsonSchema`
- **zod**: esquema de la salida de la IA; también valida la respuesta
- **pizzip**: abre el `.docx` original (`templates/clases-27|21.docx`), localiza cada fila por su etiqueta y reemplaza la celda (se conservan estilos, tablas y logos). También lee `CONTENIDOS.docx`.
- Los campos de texto usan un mini-formato por línea: `# ` negritas, `- ` viñeta, `-- ` sub-viñeta.

No se necesita nada más: sin ORM, sin librería de estado y sin librería de componentes. Las sesiones se muestran con `<details>` nativo y las fechas con `<input type="date">`.

## Plantillas `.docx` (en `/templates`)

Se crean a partir de los archivos originales, reemplazando el texto por etiquetas `{...}`:

| Archivo | Base |
|---|---|
| `clases-27.docx` / `clases-21.docx` | `QUINCENA 2 ... SEC 27/21.docx` |
| `proyecto-27.docx` / `proyecto-21.docx` | `Formato planeación proyectos.docx` (la versión 21 sin imágenes en el encabezado) |
| `actividades.docx` | Nuevo y sencillo: título, sesiones y reactivos con su respuesta |

Tener 4 plantillas es más simple que quitar el encabezado con código. Las filas de sesiones y de momentos se generan con bucles (`{#sesiones}…{/sesiones}`), y los ejes articuladores se marcan con `{x_inclusion}` y similares.

## Modelo de datos (Supabase)

```sql
profiles (
  id uuid pk references auth.users,
  nombre text,                -- "Mtra. Ana López"
  contenidos jsonb            -- [{contenido, grado: 1|2|3, pdas: [{texto, marcas: ["13 – 25 SEP"]}]}]
)

planeaciones (
  id uuid pk, user_id uuid references auth.users,
  tipo text check (tipo in ('clases','proyecto')),
  escuela text check (escuela in ('27','21')),
  grado int, grupos text, periodo_inicio date, periodo_fin date,
  metodologia text,           -- solo en proyecto
  seleccion jsonb,            -- [{contenido, pda}]
  sesiones_input jsonb,       -- [{tipo: 'clase'|'calculo_mental'|'evaluacion', nota}]
  resultado jsonb,            -- lo que generó la IA, ya editado por el docente
  actividades jsonb,          -- null hasta que se generan
  created_at timestamptz default now()
)
-- RLS: user_id = auth.uid() / id = auth.uid()
```

## Pantallas

1. **Login** (Supabase Auth).
2. **Perfil**: nombre del docente y el botón para subir o reemplazar `CONTENIDOS.docx`, con una vista previa de lo que se procesó.
3. **Mis planeaciones**: lista con acciones para abrir, duplicar y descargar.
4. **Nueva planeación** (asistente de pasos en celular, un solo formulario largo en escritorio):
   1. Tipo (clases o proyecto), escuela (27 o 21), grado, grupos y periodo.
   2. Contenido y PDA: se filtran por grado desde los contenidos del docente. Los PDA con marcas como "13 – 25 SEP" o "QUINCENA 1" aparecen como *ya usados*.
   3. Sesiones: número de sesiones y, en cada una, el tipo y una nota libre. Si es proyecto, también la metodología.
   4. **Generar** → lleva al editor.
5. **Editor**: un textarea por campo, las sesiones en `<details>` y casillas para los ejes. Tiene los botones **Guardar**, **Descargar .docx** y **Generar actividades**, que luego permite **Descargar actividades .docx**.

## Metodologías (constante en el código)

| Metodología | Momentos |
|---|---|
| ABP Comunitario | 11: Identificación, Recuperación, Planificación, Acercamiento, Comprensión y producción, Reconocimiento, Concreción, Integración, Difusión, Consideraciones, Avances |
| STEAM (indagación) | 5: Introducción al campo, Diseño de investigación, Organizar y estructurar respuestas, Presentación de resultados, Metacognición |
| ABPr (problemas) | 6: Presentemos, Recolectemos, Formulemos el problema, Organicemos la experiencia, Vivamos la experiencia, Resultados y análisis |
| Aprendizaje Servicio | 5: Punto de partida, Lo que sé y quiero saber, Organicemos las actividades, Creatividad en marcha, Compartimos y evaluamos |

La IA reparte las N sesiones entre los momentos, y la tabla del `.docx` tiene tantas filas como momentos.

## IA (Gemini)

Cada modo es una función que arma el prompt con el texto de `PROMPT.docx` como base y le pasa un esquema zod:

- **Clases** → `{proposito, problematica, producto, articulacion, rasgoPerfil, escenarios, ejes[], sesiones[{titulo, inicio[], desarrollo[], cierre[], evaluacion}], recursos[], adaptaciones{dificultades[], avanzados[]}}`
- **Proyecto** → lo mismo más `{titulo, problemaContexto, articulacion{d1,d2,d3}, metodologia, momentos[{momento, sesiones[], actividades, evaluacion}]}`
- **Actividades** → `[{sesion, titulo, reactivos[{enunciado, respuesta}]}]` con 8 reactivos (6 operaciones directas y 2 problemas con contexto). En la sesión de cálculo mental son 10 operaciones y se incluyen las del **cálculo mental anterior** del historial para subir un poco la dificultad.

Las notas de cada sesión (por ejemplo, "actividad conmemorativa de Independencia") se agregan al prompt. La parte del prompt que pide "explicar cómo el plan aborda la problemática" se quita, porque no tiene un campo en el formato.

Las llamadas se hacen en un Route Handler en el servidor (`GEMINI_API_KEY` nunca llega al cliente) con `export const maxDuration = 60`.

## Lectura de `CONTENIDOS.docx`

Pizzip lee `word/document.xml` → se separan filas, celdas y párrafos con regex → se omiten las 2 filas de encabezado → la columna 0 es el contenido (sus párrafos se unen con un espacio) y las columnas 1 a 3 son los PDA de 1°, 2° y 3° (un PDA por párrafo). Los párrafos que coinciden con `/QUINCENA|\d+\s*[–-]\s*\d+\s+[A-Z]{3}/` se guardan como `marcas`, no como PDA. Se incluye una sola prueba contra el `CONTENIDOS.docx` real.

## Estado

- [x] Fase 1: base, Supabase y contenidos
- [x] Fase 2: planeación por clases de principio a fin (Gemini: planeación con `gemini-flash-lite-latest` ~10 s y actividades con `gemini-flash-latest`, cada uno con respaldo)
- [x] Fase 3: proyecto (4 metodologías; plantillas `proyecto-27|21.docx`)
- [x] Pruebas: `npm test` (unitarias) y `npm run e2e` (Playwright: login, perfil, clases, proyecto, 404, móvil)
- [x] Fase 4: actividades (8 reactivos / 10 de cálculo mental, editables, .docx aparte con el encabezado de la escuela)
- [x] Fase 5: pulido (duplicar, PDA "planeado" según historial, confirmar al eliminar, errores de IA claros, cambio de modelo con corte de 90 s)
- [ ] Publicar: git, Vercel, Redirect URLs de producción, control de registro, rotar llave de Gemini

## Fases de implementación

1. **Base**: crear el proyecto Next y Supabase (auth, tablas, RLS), y el perfil con la carga y lectura de contenidos.
2. **Clases (de principio a fin)**: asistente → Gemini → editor → guardar → exportar `clases-27/21.docx`. Validar que el Word salga igual al original.
3. **Proyecto**: metodologías, prompt, plantillas `proyecto-27/21.docx` y editor de momentos.
4. **Actividades y cálculo mental**: generar desde una planeación guardada y exportar `actividades.docx`.
5. **Pulido**: duplicar una planeación, marcar los PDA ya usados según el historial, y revisar el diseño en celular.

## Fuera de alcance (por ahora)

Exportar a PDF, regenerar una sola sección con la IA, calendario automático de días sin clase, otras disciplinas y escuelas configurables.
