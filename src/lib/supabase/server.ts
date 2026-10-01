import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { aCorreo, deCorreo } from "../usuarios.ts";

export async function supabase() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        // En Server Components no se pueden escribir cookies; el proxy ya refrescó la sesión.
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {}
      },
    },
  });
}

/** Cliente + id del usuario; redirige a /login si no hay sesión. Úsalo en cada página y Server Action. */
export async function requireUser() {
  const sb = await supabase();
  const { data } = await sb.auth.getClaims();
  if (!data?.claims) redirect("/login");
  // app_metadata solo se puede escribir con la llave secreta: el docente no puede darse el rol.
  const esAdmin = (data.claims.app_metadata as { rol?: string } | undefined)?.rol === "admin";
  return { sb, userId: data.claims.sub, esAdmin, usuario: deCorreo(data.claims.email as string | undefined) };
}

/** Cambia la contraseña del usuario actual después de verificar la actual. Devuelve un mensaje de error o null. */
export async function cambiarPassword(usuario: string, actual: string, nueva: string) {
  if (nueva.length < 8) return "La nueva contraseña debe tener al menos 8 caracteres.";
  const sb = await supabase();
  const { error: e1 } = await sb.auth.signInWithPassword({ email: aCorreo(usuario), password: actual });
  if (e1) return "La contraseña actual no es correcta.";
  const { error: e2 } = await sb.auth.updateUser({ password: nueva });
  return e2 ? e2.message : null;
}
