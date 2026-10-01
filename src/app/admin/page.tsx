import { KeyRound, ShieldCheck, UserPlus } from "lucide-react";
import { requireAdmin } from "@/lib/supabase/admin";
import { deCorreo } from "@/lib/usuarios";
import { Avisos, Enviar } from "@/components/app";
import { Eliminar } from "@/components/eliminar";
import { Encabezado, Pagina, Plegable } from "@/components/pagina";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { crearDocente, eliminarDocente, restablecer } from "./actions";

export default async function Admin({ searchParams }: PageProps<"/admin">) {
  const { error, msg } = await searchParams;
  const { admin, userId } = await requireAdmin();
  const [{ data: usuarios }, { data: perfiles }] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from("profiles").select("id, nombre"),
  ]);
  const nombres = new Map((perfiles ?? []).map((p) => [p.id, p.nombre as string]));
  const docentes = (usuarios?.users ?? [])
    .map((u) => ({ id: u.id, usuario: deCorreo(u.email), nombre: nombres.get(u.id) ?? "", esAdmin: u.app_metadata?.rol === "admin" }))
    .sort((a, b) => a.usuario.localeCompare(b.usuario));

  return (
    <Pagina>
      <Encabezado titulo="Docentes" descripcion="Solo un administrador puede dar de alta cuentas y restablecer contraseñas." />
      <Avisos error={error} msg={msg} />

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="size-4 text-primary" /> Nuevo docente
          </CardTitle>
          <CardDescription>Comparte el usuario y la contraseña inicial con el docente; podrá cambiarla en su Perfil.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={crearDocente} className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="usuario">Usuario</FieldLabel>
              <Input id="usuario" name="usuario" required autoCapitalize="none" spellCheck={false} autoComplete="off" placeholder="ana.lopez" className="h-10" />
              <FieldDescription>Minúsculas, números, punto o guion.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="nombre">Nombre del docente</FieldLabel>
              <Input id="nombre" name="nombre" required placeholder="Mtra. Ana López" className="h-10" />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Contraseña inicial</FieldLabel>
              <Input id="password" name="password" type="text" required minLength={8} autoComplete="off" className="h-10" />
              <FieldDescription>Al menos 8 caracteres.</FieldDescription>
            </Field>
            <label className="flex items-center gap-2 self-center text-sm">
              <input type="checkbox" name="admin" value="si" /> También es administrador
            </label>
            <div className="sm:col-span-2">
              <Enviar pendiente="Creando…">
                <UserPlus /> Crear docente
              </Enviar>
            </div>
          </form>
        </CardContent>
      </Card>

      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        Cuentas <Badge variant="secondary">{docentes.length}</Badge>
      </h2>
      <div className="flex flex-col gap-3">
        {docentes.map((d) => (
          <Plegable
            key={d.id}
            titulo={
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{d.nombre || "(sin nombre)"}</span>
                <span className="truncate text-sm font-normal text-muted-foreground">@{d.usuario}</span>
              </span>
            }
            extra={
              <span className="flex gap-1.5">
                {d.esAdmin && (
                  <Badge variant="secondary">
                    <ShieldCheck /> Admin
                  </Badge>
                )}
                {d.id === userId && <Badge variant="outline">Tú</Badge>}
              </span>
            }
          >
            <div className="flex flex-col gap-4">
              <form action={restablecer.bind(null, d.id, d.usuario)} className="flex flex-wrap items-end gap-2">
                <Field className="min-w-48 flex-1">
                  <FieldLabel htmlFor={`pw-${d.id}`}>Nueva contraseña para @{d.usuario}</FieldLabel>
                  <Input id={`pw-${d.id}`} name="password" type="text" required minLength={8} autoComplete="off" className="h-10" />
                </Field>
                <Enviar variant="outline" size="lg" className="h-10" pendiente="Guardando…">
                  <KeyRound /> Restablecer
                </Enviar>
              </form>
              {d.id !== userId && (
                <div>
                  <Eliminar
                    accion={eliminarDocente.bind(null, d.id, d.usuario)}
                    etiqueta={`Eliminar a @${d.usuario}`}
                    titulo={`¿Eliminar a @${d.usuario}?`}
                    descripcion="Se borrarán su cuenta, su perfil y todas sus planeaciones. No se puede deshacer."
                  />
                </div>
              )}
            </div>
          </Plegable>
        ))}
      </div>
    </Pagina>
  );
}
