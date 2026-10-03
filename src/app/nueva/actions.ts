"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import type { PDA } from "@/lib/contenidos";
import { ESCUELAS, METODOLOGIAS, TIPOS_SESION, type Metodologia, type SesionInput } from "@/lib/planeacion";
import { generar, mensajeIA } from "@/lib/ia";

export async function crear(_: { error?: string }, fd: FormData): Promise<{ error?: string }> {
  const { sb, userId } = await requireUser();
  const { data: perfil } = await sb.from("profiles").select("contenidos").eq("id", userId).single();
  const contenidos: PDA[] = perfil?.contenidos ?? [];

  const s = (k: string) => String(fd.get(k) ?? "").trim();
  const n = Number(fd.get("n"));
  const input = {
    tipo: s("tipo") === "proyecto" ? ("proyecto" as const) : ("clases" as const),
    metodologia: s("tipo") === "proyecto" ? (s("metodologia") as Metodologia) : null,
    escuela: s("escuela") as keyof typeof ESCUELAS,
    grado: Number(fd.get("grado")),
    grupos: s("grupos"),
    periodo_inicio: s("periodo_inicio"),
    periodo_fin: s("periodo_fin"),
    instrucciones: s("instrucciones"),
    observaciones: s("observaciones"),
    seleccion: fd.getAll("pda").map((i) => contenidos[Number(i)]).filter(Boolean).map(({ contenido, pda }) => ({ contenido, pda })),
    sesiones_input: Array.from({ length: n }, (_, i): SesionInput => ({
      tipo: s(`tipo_${i}`) in TIPOS_SESION ? (s(`tipo_${i}`) as SesionInput["tipo"]) : "clase",
      nota: s(`nota_${i}`),
    })),
  };

  if (input.tipo === "proyecto" && !(input.metodologia! in METODOLOGIAS)) return { error: "Elige una metodología." };
  if (!(input.escuela in ESCUELAS) || ![1, 2, 3].includes(input.grado)) return { error: "Escuela o grado inválido." };
  if (!input.grupos || !input.periodo_inicio || !input.periodo_fin) return { error: "Completa grupos y periodo." };
  if (input.periodo_fin < input.periodo_inicio) return { error: "El periodo termina antes de empezar." };
  if (!input.seleccion.length) return { error: "Selecciona al menos un PDA." };
  if (!(n >= 1 && n <= 20)) return { error: "El número de sesiones debe estar entre 1 y 20." };

  const { data: fila, error } = await sb.from("planeaciones").insert(input).select("id").single();
  if (error) return { error: error.message };

  let msg = "";
  try {
    const resultado = await generar(input);
    await sb.from("planeaciones").update({ resultado }).eq("id", fila.id);
  } catch (e) {
    console.error(e);
    msg = "?error=" + encodeURIComponent(mensajeIA(e));
  }
  redirect(`/p/${fila.id}${msg}`);
}
