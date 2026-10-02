import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, ChevronRight, Copy, Download, ListChecks, RefreshCw, Save, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { periodo } from "@/lib/docx";
import { EJES, METODOLOGIAS, TIPOS_SESION, type Planeacion } from "@/lib/planeacion";
import { Avisos, Enviar } from "@/components/app";
import { Eliminar } from "@/components/eliminar";
import { Pagina, Plegable } from "@/components/pagina";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { TextoRico } from "@/components/editor";
import { duplicar, eliminar, guardar, regenerar } from "./actions";

export const maxDuration = 300;

function Area({ name, label, valor }: { name: string; label: string; valor: string }) {
  return (
    <Field>
      <FieldLabel id={`${name}-label`}>{label}</FieldLabel>
      <TextoRico name={name} labelId={`${name}-label`} valor={valor} />
    </Field>
  );
}

function Texto({ name, label, valor }: { name: string; label: string; valor: string }) {
  return (
    <Field>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input id={name} name={name} defaultValue={valor} className="h-10" />
    </Field>
  );
}

export default async function Editor({ params, searchParams }: PageProps<"/p/[id]">) {
  const [{ id }, { error, msg }] = await Promise.all([params, searchParams]);
  const { sb } = await requireUser();
  const { data: p } = await sb.from("planeaciones").select("*").eq("id", id).maybeSingle<Planeacion>();
  if (!p) notFound();
  const r = p.resultado;
  const momentos = METODOLOGIAS[p.metodologia ?? "steam"].momentos;

  return (
    <Pagina className="pb-28">
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Mis planeaciones
      </Link>
      <div className="mb-6 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Planeación {p.tipo === "proyecto" ? "por proyecto" : "por clases"} · SEC {p.escuela}
        </h1>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary">
            {p.grado}° {p.grupos}
          </Badge>
          <Badge variant="outline">
            <CalendarDays /> {periodo(p.periodo_inicio, p.periodo_fin)}
          </Badge>
          {p.metodologia && <Badge variant="outline">{METODOLOGIAS[p.metodologia].nombre}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">{p.seleccion.map((s) => s.pda).join(" · ")}</p>
      </div>
      <Avisos error={error} msg={msg} />

      {r && (
        <Link
          href={`/p/${id}/actividades`}
          className="group mb-6 flex items-center gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition hover:shadow-md hover:ring-primary/40"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <ListChecks className="size-5" />
          </span>
          <span className="min-w-0 flex-1 text-sm">
            <span className="flex items-center gap-2 font-medium">
              Actividades por sesión {p.actividades && <Badge variant="secondary">generadas</Badge>}
            </span>
            <span className="text-muted-foreground">{p.actividades ? "Revisa, edita o descarga la hoja de ejercicios." : "8 reactivos por clase, 10 en cálculo mental."}</span>
          </span>
          <ChevronRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5" />
        </Link>
      )}

      {!r ? (
        <Card>
          <CardHeader>
            <CardTitle>Sin contenido todavía</CardTitle>
            <CardDescription>Esta planeación aún no tiene contenido generado.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={regenerar.bind(null, id)}>
              <Enviar pendiente="Generando con IA… (≈1 min)">
                <Sparkles /> Generar con IA
              </Enviar>
            </form>
          </CardContent>
        </Card>
      ) : (
        <>
          <form action={guardar.bind(null, id)} className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Datos</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <Texto name="grupos" label="Grupos" valor={p.grupos} />
                <Field>
                  <FieldLabel htmlFor="periodo_inicio">Inicio</FieldLabel>
                  <Input id="periodo_inicio" name="periodo_inicio" type="date" defaultValue={p.periodo_inicio} className="h-10" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="periodo_fin">Fin</FieldLabel>
                  <Input id="periodo_fin" name="periodo_fin" type="date" defaultValue={p.periodo_fin} className="h-10" />
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Planeación</CardTitle>
                <CardDescription>Usa la barra de cada campo para negritas y viñetas; así aparecerán en el Word.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                {"momentos" in r && <Texto name="titulo" label="Título del proyecto" valor={r.titulo} />}
                <Area name="proposito" label="Propósito" valor={r.proposito} />
                {"momentos" in r ? (
                  <Area name="problemaContexto" label="Problema del contexto" valor={r.problemaContexto} />
                ) : (
                  <Area name="problematica" label="Situación o problemática identificada" valor={r.problematica} />
                )}
                <Area name="producto" label="Producto central por lograr" valor={r.producto} />
                <Area name="articulacion" label="Articulación con otras disciplinas" valor={r.articulacion} />
                <Area name="rasgoPerfil" label="Rasgo del perfil de egreso" valor={r.rasgoPerfil} />
                <Texto name="escenarios" label="Escenarios" valor={r.escenarios} />
                <fieldset>
                  <legend className="mb-2 text-sm font-medium">Ejes articuladores (1 a 3)</legend>
                  <div className="flex flex-wrap gap-2">
                    {EJES.map((e) => (
                      <label
                        key={e}
                        className="flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition hover:bg-muted/60 has-checked:border-primary has-checked:bg-accent has-checked:text-accent-foreground"
                      >
                        <input type="checkbox" name="ejes" value={e} defaultChecked={r.ejes.includes(e)} />
                        {e}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </CardContent>
            </Card>

            {"sesiones" in r && (
              <section className="flex flex-col gap-3">
                <h2 className="font-semibold">Sesiones</h2>
                {r.sesiones.map((s, i) => (
                  <Plegable
                    key={i}
                    abierto={i === 0}
                    titulo={`Sesión ${i + 1}. ${s.titulo}`}
                    extra={p.sesiones_input[i]?.tipo !== "clase" && <Badge variant="secondary">{TIPOS_SESION[p.sesiones_input[i]?.tipo]}</Badge>}
                  >
                    <div className="flex flex-col gap-4">
                      <Texto name={`s${i}_titulo`} label="Título" valor={s.titulo} />
                      <Area name={`s${i}_inicio`} label="Inicio" valor={s.inicio} />
                      <Area name={`s${i}_desarrollo`} label="Desarrollo" valor={s.desarrollo} />
                      <Area name={`s${i}_cierre`} label="Cierre" valor={s.cierre} />
                      <Texto name={`s${i}_evaluacion`} label="Evaluación formativa" valor={s.evaluacion} />
                    </div>
                  </Plegable>
                ))}
              </section>
            )}

            {"momentos" in r && (
              <section className="flex flex-col gap-3">
                <h2 className="font-semibold">Momentos</h2>
                {r.momentos.map((m, i) => (
                  <Plegable key={i} abierto={i === 0} titulo={`${i + 1}. ${momentos[i]}`} extra={<Badge variant="secondary">{m.sesiones}</Badge>}>
                    <div className="flex flex-col gap-4">
                      <Texto name={`m${i}_sesiones`} label="Sesiones" valor={m.sesiones} />
                      <Area name={`m${i}_actividades`} label="Secuencia de actividades" valor={m.actividades} />
                      <Texto name={`m${i}_evaluacion`} label="Evaluación formativa" valor={m.evaluacion} />
                    </div>
                  </Plegable>
                ))}
              </section>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Recursos y diversidad</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <Area name="recursos" label="Recursos / materiales" valor={r.recursos} />
                <Area name="adaptaciones" label={"momentos" in r ? "Atención a la diversidad" : "Adaptaciones para atender la diversidad"} valor={r.adaptaciones} />
              </CardContent>
            </Card>

            <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-3 backdrop-blur">
              <div className="mx-auto flex max-w-3xl gap-2">
                <Enviar pendiente="Guardando…" className="h-10 flex-1 sm:flex-none sm:px-5">
                  <Save /> Guardar
                </Enviar>
                <a href={`/p/${id}/docx`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10 flex-1 sm:flex-none sm:px-5")}>
                  <Download /> Descargar .docx
                </a>
              </div>
            </div>
          </form>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Más acciones</CardTitle>
              <CardDescription>Copia la planeación para otra quincena, vuelve a generarla o elimínala.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <form action={duplicar.bind(null, id)}>
                <Enviar variant="outline" size="default" pendiente="Duplicando…">
                  <Copy /> Duplicar planeación
                </Enviar>
              </form>
              <form action={regenerar.bind(null, id)}>
                <Enviar variant="outline" size="default" pendiente="Generando… (≈1 min)">
                  <RefreshCw /> Regenerar todo con IA (se pierden los cambios)
                </Enviar>
              </form>
              <Eliminar accion={eliminar.bind(null, id)} />
            </CardContent>
          </Card>
        </>
      )}
    </Pagina>
  );
}
