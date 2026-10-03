"use client";
import { useActionState, useState } from "react";
import { BookOpen, CircleAlert, FolderKanban, Sparkles } from "lucide-react";
import type { PDA } from "@/lib/contenidos";
import { ESCUELAS, METODOLOGIAS, TIPOS_SESION } from "@/lib/planeacion";
import { Enviar } from "@/components/app";
import { Paso } from "@/components/pagina";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { crear } from "./actions";

const TIPOS = {
  clases: { titulo: "Por clases", descripcion: "Sesiones con inicio, desarrollo y cierre", Icono: BookOpen },
  proyecto: { titulo: "Por proyecto", descripcion: "Fases o momentos de un proyecto de la NEM", Icono: FolderKanban },
} as const;

export function FormNueva({ contenidos, usados }: { contenidos: PDA[]; usados: Record<string, string[]> }) {
  const [estado, accion] = useActionState(crear, {});
  const [grado, setGrado] = useState(1);
  const [n, setN] = useState(8);
  const [tipo, setTipo] = useState<keyof typeof TIPOS>("clases");
  const [metodologia, setMetodologia] = useState<keyof typeof METODOLOGIAS>("steam");
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
  const pdas = contenidos.map((p, i) => ({ ...p, i })).filter((p) => p.grado === grado);
  const porContenido = Map.groupBy(pdas, (p) => p.contenido);
  const elegidos = pdas.filter((p) => seleccion.has(p.i)).length;

  const alternar = (i: number) =>
    setSeleccion((s) => {
      const t = new Set(s);
      if (t.has(i)) t.delete(i);
      else t.add(i);
      return t;
    });

  return (
    <form action={accion} className="flex flex-col gap-6">
      {/* 1. Datos generales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paso n={1} /> Datos generales
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-sm font-medium">Tipo de planeación</legend>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(TIPOS) as (keyof typeof TIPOS)[]).map((t) => {
                const { titulo, descripcion, Icono } = TIPOS[t];
                return (
                  <label
                    key={t}
                    className="flex cursor-pointer flex-col gap-2 rounded-xl border p-3 transition hover:bg-accent/50 has-checked:border-primary has-checked:bg-accent has-checked:ring-1 has-checked:ring-primary sm:p-4"
                  >
                    <span className="flex items-center gap-2">
                      <input type="radio" name="tipo" value={t} checked={tipo === t} onChange={() => setTipo(t)} />
                      <Icono className="size-5 text-primary" />
                      <span className="font-medium">{titulo}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{descripcion}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {tipo === "proyecto" && (
            <Field className="min-w-0 sm:col-span-2">
              <FieldLabel htmlFor="metodologia">Metodología</FieldLabel>
              <NativeSelect id="metodologia" name="metodologia" value={metodologia} onChange={(e) => setMetodologia(e.target.value as keyof typeof METODOLOGIAS)} className="w-full [&_select]:h-10">
                {Object.entries(METODOLOGIAS).map(([k, m]) => (
                  <NativeSelectOption key={k} value={k}>
                    {m.nombre} · {m.momentos.length} momentos
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldDescription>Momentos: {METODOLOGIAS[metodologia].momentos.join(" · ")}</FieldDescription>
            </Field>
          )}

          <Field className="min-w-0">
            <FieldLabel htmlFor="escuela">Escuela</FieldLabel>
            <NativeSelect id="escuela" name="escuela" className="w-full [&_select]:h-10">
              {Object.entries(ESCUELAS).map(([k, v]) => (
                <NativeSelectOption key={k} value={k}>
                  SEC {k} — {v}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field className="min-w-0">
            <FieldLabel htmlFor="grado">Grado</FieldLabel>
            <NativeSelect id="grado" name="grado" value={grado} onChange={(e) => setGrado(Number(e.target.value))} className="w-full [&_select]:h-10">
              <NativeSelectOption value={1}>1°</NativeSelectOption>
              <NativeSelectOption value={2}>2°</NativeSelectOption>
              <NativeSelectOption value={3}>3°</NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field className="min-w-0 sm:col-span-2">
            <FieldLabel htmlFor="grupos">Grupos</FieldLabel>
            <Input id="grupos" name="grupos" required placeholder="(A, B, C, D y G)  ó  G" className="h-10" />
          </Field>
          <Field className="min-w-0">
            <FieldLabel htmlFor="periodo_inicio">Periodo: inicio</FieldLabel>
            <Input id="periodo_inicio" name="periodo_inicio" type="date" required className="h-10" />
          </Field>
          <Field className="min-w-0">
            <FieldLabel htmlFor="periodo_fin">Periodo: fin</FieldLabel>
            <Input id="periodo_fin" name="periodo_fin" type="date" required className="h-10" />
          </Field>
        </CardContent>
      </Card>

      {/* 2. Contenido y PDA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paso n={2} /> Contenido y PDA · {grado}° grado
          </CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2">
            Elige uno o varios PDA.
            {elegidos > 0 && <Badge>{elegidos} seleccionado{elegidos > 1 ? "s" : ""}</Badge>}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {[...porContenido].map(([contenido, ps]) => (
            <fieldset key={contenido} className="space-y-1.5">
              <legend className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{contenido}</legend>
              {ps.map((p) => (
                <label
                  key={p.i}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent p-2.5 text-sm transition hover:bg-muted/60 has-checked:border-primary/30 has-checked:bg-accent"
                >
                  <input type="checkbox" name="pda" value={p.i} checked={seleccion.has(p.i)} onChange={() => alternar(p.i)} className="mt-0.5" />
                  <span className="leading-relaxed">
                    {p.pda}
                    {p.marcas.map((m) => (
                      <Badge key={m} variant="outline" className="ml-2 border-amber-200 bg-amber-50 text-amber-800">
                        usado: {m}
                      </Badge>
                    ))}
                    {[...new Set(usados[p.pda])].map((u) => (
                      <Badge key={u} variant="outline" className="ml-2 border-sky-200 bg-sky-50 text-sky-800">
                        planeado: {u}
                      </Badge>
                    ))}
                  </span>
                </label>
              ))}
            </fieldset>
          ))}
        </CardContent>
      </Card>

      {/* 3. Sesiones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paso n={3} /> Sesiones
          </CardTitle>
          <CardDescription>Cuenta solo los días con clase. Puedes marcar sesiones de cálculo mental o evaluación y dar instrucciones.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field className="max-w-48">
            <FieldLabel htmlFor="n">Número de sesiones (solo días con clase)</FieldLabel>
            <Input
              id="n"
              name="n"
              type="number"
              min={1}
              max={20}
              value={n}
              onChange={(e) => setN(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
              className="h-10"
            />
          </Field>
          <ol className="flex flex-col gap-2">
            {Array.from({ length: n }, (_, i) => (
              <li key={i} className="grid grid-cols-[auto_1fr] items-center gap-2 rounded-lg bg-muted/40 p-2 sm:grid-cols-[5rem_10rem_1fr]">
                <span className="px-1 text-sm font-medium">Sesión {i + 1}</span>
                <NativeSelect name={`tipo_${i}`} aria-label={`Tipo de la sesión ${i + 1}`} className="w-full bg-background [&_select]:h-9">
                  {Object.entries(TIPOS_SESION).map(([k, v]) => (
                    <NativeSelectOption key={k} value={k}>
                      {v}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <Input name={`nota_${i}`} aria-label={`Instrucción de la sesión ${i + 1}`} placeholder="Instrucción específica (opcional)" className="col-span-2 h-9 bg-background sm:col-span-1" />
              </li>
            ))}
          </ol>
          <Field>
            <FieldLabel htmlFor="instrucciones">Instrucciones generales (opcional)</FieldLabel>
            <Textarea id="instrucciones" name="instrucciones" rows={3} placeholder="Ej: incluir una actividad con material reciclado" />
          </Field>
          <Field>
            <FieldLabel htmlFor="observaciones">Observaciones (opcional)</FieldLabel>
            <Textarea id="observaciones" name="observaciones" rows={3} placeholder="Ej: el grupo H necesita repasar las tablas; la sesión 3 coincide con el simulacro" />
            <FieldDescription>La IA las redacta mejor y van en el apartado “Observaciones” del Word.</FieldDescription>
          </Field>
        </CardContent>
      </Card>

      {estado.error && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{estado.error}</AlertDescription>
        </Alert>
      )}
      <Enviar pendiente="Generando con IA… (≈1 min)" className="h-11 w-full text-base sm:w-auto sm:self-end sm:px-6">
        <Sparkles /> Generar planeación
      </Enviar>
    </form>
  );
}
