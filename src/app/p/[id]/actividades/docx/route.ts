import { requireUser } from "@/lib/supabase/server";
import { docxActividades, periodo } from "@/lib/docx";
import type { Actividades, Planeacion } from "@/lib/planeacion";

export async function GET(_: Request, ctx: RouteContext<"/p/[id]/actividades/docx">) {
  const { id } = await ctx.params;
  const { sb, userId } = await requireUser();
  const [{ data: p }, { data: perfil }] = await Promise.all([
    sb.from("planeaciones").select("*").eq("id", id).maybeSingle<Planeacion>(),
    sb.from("profiles").select("nombre").eq("id", userId).single(),
  ]);
  if (!p?.actividades) return new Response("No encontrada", { status: 404 });

  const buf = docxActividades({ ...p, actividades: p.actividades as Actividades }, perfil?.nombre ?? "");
  const nombre = `Actividades ${periodo(p.periodo_inicio, p.periodo_fin)} SEC ${p.escuela} ${p.grado}°.docx`;
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="actividades.docx"; filename*=UTF-8''${encodeURIComponent(nombre)}`,
    },
  });
}
