"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { actividadesEditadasSchema, ultimoCalculoMental, type Planeacion } from "@/lib/planeacion";
import { generarActividades, mensajeIA } from "@/lib/ia";

const volver = (id: string, q: string) => redirect(`/p/${id}/actividades?${q}`);

async function cargar(id: string) {
  const { sb } = await requireUser();
  const { data } = await sb.from("planeaciones").select("*").eq("id", id).single<Planeacion>();
  if (!data) redirect("/");
  return { sb, p: data };
}

export async function generar(id: string) {
  const { sb, p } = await cargar(id);

  // Operaciones del cálculo mental más reciente de otra planeación, para subir la dificultad.
  const { data: previas } = await sb
    .from("planeaciones")
    .select("sesiones_input, actividades")
    .neq("id", id)
    .not("actividades", "is", null)
    .order("created_at", { ascending: false })
    .limit(10);
  const anterior = ultimoCalculoMental((previas ?? []) as Pick<Planeacion, "sesiones_input" | "actividades">[]);

  try {
    const actividades = await generarActividades(p, anterior);
    await sb.from("planeaciones").update({ actividades }).eq("id", id);
  } catch (e) {
    console.error(e);
    volver(id, "error=" + encodeURIComponent(mensajeIA(e)));
  }
  volver(id, "msg=Actividades generadas");
}

export async function guardar(id: string, fd: FormData) {
  const { sb, p } = await cargar(id);
  const s = (k: string) => String(fd.get(k) ?? "").trim();
  const todos = (k: string) => fd.getAll(k).map((v) => String(v).trim());
  const r = actividadesEditadasSchema(p.sesiones_input.length).safeParse({
    sesiones: (p.actividades?.sesiones ?? []).map((_, i) => {
      const respuestas = todos(`a${i}_r`);
      return {
        titulo: s(`a${i}_titulo`),
        indicacion: s(`a${i}_indicacion`),
        // Renglones en orden del formulario; los que quedaron vacíos se descartan.
        reactivos: todos(`a${i}_e`)
          .map((enunciado, k) => ({ enunciado, respuesta: respuestas[k] ?? "" }))
          .filter((x) => x.enunciado || x.respuesta),
      };
    }),
  });
  if (!r.success) volver(id, "error=" + encodeURIComponent("Cada sesión necesita al menos un reactivo."));
  const { error } = await sb.from("planeaciones").update({ actividades: r.data }).eq("id", id);
  volver(id, error ? "error=" + encodeURIComponent(error.message) : "msg=Guardado");
}
