import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { requireUser } from "./server";

/**
 * Cliente con la llave secreta: salta RLS y usa la API de administración de Auth.
 * Solo en el servidor (la variable no lleva NEXT_PUBLIC_, así que nunca llega al navegador).
 */
export function adminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("Falta SUPABASE_SECRET_KEY en las variables de entorno.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Como requireUser, pero solo para administradores; a los demás les responde 404. */
export async function requireAdmin() {
  const u = await requireUser();
  if (!u.esAdmin) notFound();
  return { ...u, admin: adminClient() };
}
