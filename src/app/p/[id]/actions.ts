"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { EJES, schemaDe, type Planeacion, type ResultadoProyecto } from "@/lib/planeacion";
import { generar, mensajeIA } from "@/lib/ia";

const volver = (id: string, q: string) => redirect(`/p/${id}?${q}`);

async function cargar(id: string) {
  const { sb } = await requireUser();
  const { data } = await sb.from("planeaciones").select("*").eq("id", id).single<Planeacion>();
  if (!data) redirect("/");
  return { sb, p: data };
}

export async function guardar(id: string, fd: FormData) {
  const { sb, p } = await cargar(id);
  const s = (k: string) => String(fd.get(k) ?? "").trim();
  const n = p.sesiones_input.length;
  const r = schemaDe(p).safeParse({
    proposito: s("proposito"),
    problematica: s("problematica"),
    titulo: s("titulo"),
    problemaContexto: s("problemaContexto"),
    momentos: ((p.resultado as ResultadoProyecto | null)?.momentos ?? []).map((_, i) => ({
      sesiones: s(`m${i}_sesiones`),
      actividades: s(`m${i}_actividades`),
      evaluacion: s(`m${i}_evaluacion`),
    })),
    producto: s("producto"),
    articulacion: s("articulacion"),
    rasgoPerfil: s("rasgoPerfil"),
    escenarios: s("escenarios"),
    ejes: EJES.filter((e) => fd.getAll("ejes").includes(e)),
    sesiones: Array.from({ length: n }, (_, i) => ({
      titulo: s(`s${i}_titulo`),
      inicio: s(`s${i}_inicio`),
      desarrollo: s(`s${i}_desarrollo`),
      cierre: s(`s${i}_cierre`),
      evaluacion: s(`s${i}_evaluacion`),
    })),
    recursos: s("recursos"),
    adaptaciones: s("adaptaciones"),
  });
  if (!r.success) volver(id, "error=" + encodeURIComponent("Revisa los campos: selecciona de 1 a 3 ejes articuladores."));
  const { error } = await sb
    .from("planeaciones")
    .update({ resultado: r.data, grupos: s("grupos") || p.grupos, periodo_inicio: s("periodo_inicio") || p.periodo_inicio, periodo_fin: s("periodo_fin") || p.periodo_fin })
    .eq("id", id);
  volver(id, error ? "error=" + encodeURIComponent(error.message) : "msg=Guardado");
}

export async function regenerar(id: string) {
  const { sb, p } = await cargar(id);
  try {
    const resultado = await generar(p);
    await sb.from("planeaciones").update({ resultado }).eq("id", id);
  } catch (e) {
    console.error(e);
    volver(id, "error=" + encodeURIComponent(mensajeIA(e)));
  }
  volver(id, "msg=Generada de nuevo");
}

export async function duplicar(id: string) {
  const { sb, p } = await cargar(id);
  // Las actividades no se copian: se generan de nuevo para el nuevo periodo.
  const { tipo, escuela, grado, grupos, periodo_inicio, periodo_fin, metodologia, instrucciones, seleccion, sesiones_input, resultado } = p;
  const copia = { tipo, escuela, grado, grupos, periodo_inicio, periodo_fin, metodologia, instrucciones, seleccion, sesiones_input, resultado };
  const { data, error } = await sb.from("planeaciones").insert(copia).select("id").single();
  if (error) volver(id, "error=" + encodeURIComponent(error.message));
  redirect(`/p/${data!.id}?msg=${encodeURIComponent("Copia creada: ajusta el periodo y guarda.")}`);
}

export async function eliminar(id: string, fd: FormData) {
  if (fd.get("confirmar") !== "si") volver(id, "error=" + encodeURIComponent("Marca la casilla para confirmar."));
  const { sb } = await cargar(id);
  await sb.from("planeaciones").delete().eq("id", id);
  redirect("/");
}
