import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, RefreshCw, Save, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { REACTIVOS, TIPOS_SESION, type Planeacion } from "@/lib/planeacion";
import { Avisos, Enviar } from "@/components/app";
import { Pagina, Plegable } from "@/components/pagina";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { generar, guardar } from "./actions";

export const maxDuration = 300;

export default async function Actividades({ params, searchParams }: PageProps<"/p/[id]/actividades">) {
  const [{ id }, { error, msg }] = await Promise.all([params, searchParams]);
  const { sb } = await requireUser();
  const { data: p } = await sb.from("planeaciones").select("*").eq("id", id).maybeSingle<Planeacion>();
  if (!p) notFound();
  const a = p.actividades;
  const titulos = p.resultado && "sesiones" in p.resultado ? p.resultado.sesiones.map((s) => s.titulo) : [];

  return (
    <Pagina className="pb-28">
      <Link href={`/p/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Volver a la planeación
      </Link>
      <div className="mb-6 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Actividades · SEC {p.escuela}</h1>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">
            {p.grado}° {p.grupos}
          </Badge>
          <Badge variant="outline">{p.sesiones_input.length} sesiones</Badge>
          <Badge variant="outline">8 reactivos por clase · 10 en cálculo mental</Badge>
        </div>
      </div>
      <Avisos error={error} msg={msg} />

      {!a ? (
        <Card>
          <CardHeader>
            <CardTitle>Hoja de ejercicios</CardTitle>
            <CardDescription>Genera una actividad por sesión, con las respuestas para el docente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="divide-y rounded-lg border text-sm">
              {p.sesiones_input.map((s, i) => (
                <li key={i} className="px-3 py-2">
                  Sesión {i + 1}: {TIPOS_SESION[s.tipo]} · {REACTIVOS[s.tipo]} reactivos{titulos[i] ? ` · ${titulos[i]}` : ""}
                </li>
              ))}
            </ul>
            <form action={generar.bind(null, id)}>
              <Enviar pendiente="Generando con IA… (≈1 min)">
                <Sparkles /> Generar actividades
              </Enviar>
            </form>
          </CardContent>
        </Card>
      ) : (
        <>
          <form action={guardar.bind(null, id)} className="flex flex-col gap-3">
            {a.sesiones.map((s, i) => (
              <Plegable
                key={i}
                abierto={i === 0}
                titulo={`Sesión ${i + 1}. ${s.titulo}`}
                extra={p.sesiones_input[i]?.tipo === "calculo_mental" && <Badge variant="secondary">Cálculo mental</Badge>}
              >
                <div className="flex flex-col gap-4">
                  <Field>
                    <FieldLabel htmlFor={`a${i}_titulo`}>Título</FieldLabel>
                    <Input id={`a${i}_titulo`} name={`a${i}_titulo`} defaultValue={s.titulo} className="h-10" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`a${i}_indicacion`}>Indicación</FieldLabel>
                    <Input id={`a${i}_indicacion`} name={`a${i}_indicacion`} defaultValue={s.indicacion} className="h-10" />
                  </Field>
                  <div>
                    <div className="mb-2 grid grid-cols-[1.75rem_1fr] gap-2 text-xs font-medium text-muted-foreground sm:grid-cols-[1.75rem_1fr_9rem]">
                      <span />
                      <span>Reactivo</span>
                      <span className="hidden sm:block">Respuesta</span>
                    </div>
                    <ol className="flex flex-col gap-2">
                      {s.reactivos.map((r, k) => (
                        <li key={k} className="grid grid-cols-[1.75rem_1fr] items-start gap-x-2 gap-y-1 sm:grid-cols-[1.75rem_1fr_9rem]">
                          <span className="flex h-9 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">{k + 1}</span>
                          <Input name={`a${i}_r${k}_e`} defaultValue={r.enunciado} aria-label={`Sesión ${i + 1}, reactivo ${k + 1}`} className="h-9" />
                          <Input
                            name={`a${i}_r${k}_r`}
                            defaultValue={r.respuesta}
                            aria-label={`Sesión ${i + 1}, respuesta ${k + 1}`}
                            className="col-start-2 h-9 border-amber-200 bg-amber-50 font-semibold sm:col-start-3"
                          />
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </Plegable>
            ))}

            <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-3 backdrop-blur">
              <div className="mx-auto flex max-w-3xl gap-2">
                <Enviar pendiente="Guardando…" className="h-10 flex-1 sm:flex-none sm:px-5">
                  <Save /> Guardar
                </Enviar>
                <a href={`/p/${id}/actividades/docx`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10 flex-1 sm:flex-none sm:px-5")}>
                  <Download /> Descargar .docx
                </a>
              </div>
            </div>
          </form>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Más acciones</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={generar.bind(null, id)}>
                <Enviar variant="outline" size="default" pendiente="Generando… (≈1 min)">
                  <RefreshCw /> Regenerar actividades (se pierden los cambios)
                </Enviar>
              </form>
            </CardContent>
          </Card>
        </>
      )}
    </Pagina>
  );
}
