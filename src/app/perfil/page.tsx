import { redirect } from "next/navigation";
import { cambiarPassword, requireUser } from "@/lib/supabase/server";
import { parseContenidos, type PDA } from "@/lib/contenidos";
import { KeyRound, ListChecks, Save } from "lucide-react";
import { Avisos, Enviar } from "@/components/app";
import { Encabezado, Pagina, Plegable } from "@/components/pagina";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

async function guardar(fd: FormData) {
  "use server";
  const { sb, userId } = await requireUser();
  const perfil: { id: string; nombre: string; contenidos?: PDA[] } = { id: userId, nombre: String(fd.get("nombre")).trim() };
  const archivo = fd.get("contenidos") as File | null;
  if (archivo?.size) {
    try {
      perfil.contenidos = parseContenidos(await archivo.arrayBuffer());
    } catch (e) {
      redirect(`/perfil?error=${encodeURIComponent((e as Error).message)}`);
    }
  }
  const { error } = await sb.from("profiles").upsert(perfil);
  redirect(error ? `/perfil?error=${encodeURIComponent(error.message)}` : "/perfil?msg=Guardado");
}

async function contrasena(fd: FormData) {
  "use server";
  const { usuario } = await requireUser();
  const error = await cambiarPassword(usuario, String(fd.get("actual") ?? ""), String(fd.get("nueva") ?? ""));
  redirect(error ? `/perfil?error=${encodeURIComponent(error)}` : "/perfil?msg=Contraseña actualizada");
}

export default async function Perfil({ searchParams }: PageProps<"/perfil">) {
  const { error, msg } = await searchParams;
  const { sb, userId, usuario } = await requireUser();
  const { data } = await sb.from("profiles").select("nombre, contenidos").eq("id", userId).maybeSingle();
  const contenidos: PDA[] = data?.contenidos ?? [];

  const porGrado = ([1, 2, 3] as const).map((g) => ({ g, pdas: contenidos.filter((p) => p.grado === g) }));

  return (
    <Pagina>
      <Encabezado titulo="Perfil" descripcion={<>Usuario <b className="text-foreground">@{usuario}</b> · tus datos para la planeación y tu documento de contenidos.</>} />
      <Avisos error={error} msg={msg} />

      <Card>
        <CardContent>
          <form action={guardar} className="flex flex-col gap-5">
            <Field>
              <FieldLabel htmlFor="nombre">Nombre del docente (como aparece en la planeación)</FieldLabel>
              <Input id="nombre" name="nombre" required defaultValue={data?.nombre ?? ""} className="h-10" />
            </Field>
            <Field>
              <FieldLabel htmlFor="contenidos">Documento de contenidos (.docx)</FieldLabel>
              <Input id="contenidos" name="contenidos" type="file" accept=".docx" required={!contenidos.length} className="h-10 py-1.5" />
              <FieldDescription>
                {contenidos.length > 0
                  ? "Déjalo vacío para conservar el actual. Súbelo de nuevo si cambias tus contenidos."
                  : "La tabla de Contenidos y PDA por grado. Se lee una sola vez."}
              </FieldDescription>
            </Field>
            <div>
              <Enviar pendiente="Guardando…">
                <Save /> Guardar
              </Enviar>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent>
          <form action={contrasena} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field>
              <FieldLabel htmlFor="actual">Contraseña actual</FieldLabel>
              <Input id="actual" name="actual" type="password" required autoComplete="current-password" className="h-10" />
            </Field>
            <Field>
              <FieldLabel htmlFor="nueva">Nueva contraseña</FieldLabel>
              <Input id="nueva" name="nueva" type="password" required minLength={8} autoComplete="new-password" className="h-10" />
            </Field>
            <Enviar variant="outline" className="h-10" pendiente="Cambiando…">
              <KeyRound /> Cambiar contraseña
            </Enviar>
          </form>
        </CardContent>
      </Card>

      {contenidos.length > 0 && (
        <section className="mt-8 space-y-3">
          <div className="flex items-center gap-2">
            <ListChecks className="size-4 text-primary" />
            <h2 className="font-semibold">Contenidos cargados</h2>
            <Badge variant="secondary">{contenidos.length} PDA</Badge>
          </div>
          {porGrado.map(({ g, pdas }) => (
            <Plegable key={g} titulo={`${g}° grado · ${pdas.length} PDA`}>
              <ul className="space-y-4 text-sm">
                {pdas.map((p, i) => (
                  <li key={i} className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">{p.contenido}</div>
                    <div>
                      {p.pda}
                      {p.marcas.map((m) => (
                        <Badge key={m} variant="outline" className="ml-2 border-amber-200 bg-amber-50 text-amber-800">
                          {m}
                        </Badge>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </Plegable>
          ))}
        </section>
      )}
    </Pagina>
  );
}
