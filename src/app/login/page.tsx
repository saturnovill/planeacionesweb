import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { supabase } from "@/lib/supabase/server";
import { aCorreo } from "@/lib/usuarios";
import { Avisos } from "@/components/app";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

async function entrar(fd: FormData) {
  "use server";
  const usuario = String(fd.get("usuario") ?? "");
  const { error } = await (await supabase()).auth.signInWithPassword({ email: aCorreo(usuario), password: String(fd.get("password")) });
  // Mismo mensaje si el usuario no existe o la contraseña es incorrecta: no revela qué usuarios hay.
  redirect(error ? `/login?error=${encodeURIComponent("Usuario o contraseña incorrectos.")}` : "/");
}

export default async function Login({ searchParams }: PageProps<"/login">) {
  const { error, msg } = await searchParams;
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <GraduationCap className="size-7" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Planeaciones</h1>
            <p className="text-sm text-muted-foreground">Planeaciones de Matemáticas con IA, en el formato de tu escuela.</p>
          </div>
        </div>
        <Card>
          <CardContent>
            <Avisos error={error} msg={msg} />
            <form className="flex flex-col gap-4">
              <Field>
                <FieldLabel htmlFor="usuario">Usuario</FieldLabel>
                <Input id="usuario" name="usuario" required autoComplete="username" autoCapitalize="none" spellCheck={false} className="h-10" />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                <Input id="password" name="password" type="password" required autoComplete="current-password" className="h-10" />
              </Field>
              <Button type="submit" formAction={entrar} size="lg" className="h-10">
                Entrar
              </Button>
              <p className="text-center text-xs text-muted-foreground">¿No tienes cuenta u olvidaste tu contraseña? Pídela al administrador.</p>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
