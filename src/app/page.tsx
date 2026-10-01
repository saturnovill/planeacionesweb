import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { periodo } from "@/lib/docx";
import type { Seleccion } from "@/lib/planeacion";
import { ArrowRight, BookOpen, CalendarDays, ChevronRight, Circle, CircleCheck, FileText, FolderKanban, Plus, Sparkles } from "lucide-react";
import { Encabezado, Pagina } from "@/components/pagina";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

export default async function Inicio() {
  const { sb, userId } = await requireUser();
  const [{ data: perfil }, { data: planeaciones }] = await Promise.all([
    sb.from("profiles").select("nombre, contenidos").eq("id", userId).maybeSingle(),
    sb
      .from("planeaciones")
      .select("id, tipo, escuela, grado, grupos, periodo_inicio, periodo_fin, metodologia, seleccion, con_actividades:actividades->sesiones")
      .order("created_at", { ascending: false }),
  ]);
  const listo = perfil?.nombre && perfil.contenidos?.length;

  return (
    <Pagina>
      <Encabezado
        titulo="Mis planeaciones"
        descripcion={planeaciones?.length ? `${planeaciones.length} en tu historial` : undefined}
        accion={
          listo && (
            <Link href="/nueva" className={buttonVariants({ size: "lg" })}>
              <Plus /> Nueva planeación
            </Link>
          )
        }
      />

      {!listo && (
        <Card className="mb-6 border-primary/20 bg-accent/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> Antes de empezar
            </CardTitle>
            <CardDescription>Captura tu nombre y sube tu documento de contenidos una sola vez.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="mb-4 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                {perfil?.nombre ? <CircleCheck className="size-4 text-emerald-600" /> : <Circle className="size-4 text-muted-foreground" />} Nombre del docente
              </li>
              <li className="flex items-center gap-2">
                {perfil?.contenidos?.length ? <CircleCheck className="size-4 text-emerald-600" /> : <Circle className="size-4 text-muted-foreground" />} Documento de contenidos
              </li>
            </ul>
            <Link href="/perfil" className={buttonVariants()}>
              Ir a Perfil <ArrowRight />
            </Link>
          </CardContent>
        </Card>
      )}

      {planeaciones?.length ? (
        <ul className="grid gap-3">
          {planeaciones.map((p) => {
            const proyecto = p.tipo === "proyecto";
            const Icono = proyecto ? FolderKanban : BookOpen;
            return (
              <li key={p.id}>
                <Link
                  href={`/p/${p.id}`}
                  className="group flex items-start gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition hover:ring-primary/40 hover:shadow-md"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Icono className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1 space-y-1.5">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium">
                        {proyecto ? "Por proyecto" : "Por clases"} · {p.grado}° {p.grupos}
                      </span>
                      <Badge variant="secondary">SEC {p.escuela}</Badge>
                      {p.con_actividades && <Badge variant="outline">Con actividades</Badge>}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <CalendarDays className="size-3.5" /> {periodo(p.periodo_inicio, p.periodo_fin)}
                    </span>
                    <span className="line-clamp-1 text-sm text-muted-foreground">{(p.seleccion as Seleccion[]).map((s) => s.pda).join(" · ")}</span>
                  </span>
                  <ChevronRight className="mt-2 size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        listo && (
          <Empty className="border bg-card">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileText />
              </EmptyMedia>
              <EmptyTitle>Aún no tienes planeaciones</EmptyTitle>
              <EmptyDescription>Elige los PDA, el número de sesiones y deja que la IA redacte la primera versión.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Link href="/nueva" className={buttonVariants()}>
                <Plus /> Crear mi primera planeación
              </Link>
            </EmptyContent>
          </Empty>
        )
      )}
    </Pagina>
  );
}
