# Planeaciones

App web (pensada primero para celular) para generar planeaciones de Matemáticas de secundaria con IA y descargarlas en `.docx` con el formato oficial de la escuela (SEC 27 con logos, SEC 21 sin logos).

- Planeación **por clases** (sesiones con inicio, desarrollo y cierre) o **por proyecto** (ABP comunitario, STEAM, ABP, Aprendizaje Servicio).
- Contenidos y PDA leídos del documento de contenidos de cada docente.
- **Actividades** por sesión (8 reactivos o 10 de cálculo mental) en un Word aparte.
- Todo editable antes de descargar; historial, duplicar y PDA ya planeados.
- Cuentas por **usuario y contraseña**, creadas por un administrador.

**Stack:** Next.js 16 · Tailwind + shadcn/ui · Supabase (Auth + Postgres con RLS) · Gemini · Playwright.

## Puesta en marcha

1. `npm install`
2. Copia `.env.example` a `.env.local` y llena las variables (Supabase, Gemini y la llave secreta de Supabase).
3. En Supabase: ejecuta `supabase/schema.sql` y desactiva *Authentication → Allow new users to sign up* (las cuentas se crean desde la app).
4. Crea el primer administrador: `npm run crear-admin -- usuario "Nombre del docente"`.
5. `npm run dev` y entra en http://localhost:3000.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm test` | Pruebas unitarias (lectura de contenidos, llenado de Word, reglas de IA, usuarios) |
| `npm run e2e` | Pruebas Playwright (necesita `E2E_USUARIO`/`E2E_PASSWORD` de un administrador en `.env.local`; usa Gemini real) |
| `npm run crear-admin` | Crea o promueve un administrador |

`templates/` contiene los formatos `.docx` que se llenan; `video/` es un proyecto aparte de Remotion con el video tutorial.
