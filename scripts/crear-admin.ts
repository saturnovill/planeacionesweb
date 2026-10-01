/*
 * Crea (o promueve) un administrador. Uso:
 *   npm run crear-admin -- <usuario> "<Nombre del docente>"
 * Pide la contraseña en la terminal. Requiere SUPABASE_SECRET_KEY en .env.local.
 */
import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline/promises";
import { aCorreo, esValido, normalizar } from "../src/lib/usuarios.ts";

process.loadEnvFile(".env.local");
const [usuarioArg, nombre = ""] = process.argv.slice(2);
const usuario = normalizar(usuarioArg ?? "");
if (!esValido(usuario)) throw new Error('Uso: npm run crear-admin -- <usuario> "<Nombre>"  (3-30 caracteres: minúsculas, números, . _ -)');
if (!process.env.SUPABASE_SECRET_KEY) throw new Error("Falta SUPABASE_SECRET_KEY en .env.local");

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const { data: lista } = await sb.auth.admin.listUsers({ perPage: 1000 });
const existente = lista?.users.find((u) => u.email === aCorreo(usuario));

const rl = createInterface({ input: process.stdin, output: process.stdout });
const password = await rl.question(existente ? `@${usuario} ya existe. Nueva contraseña (vacío = no cambiar): ` : `Contraseña para @${usuario} (mín. 8): `);
rl.close();
if (password && password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres.");

const { data, error } = existente
  ? await sb.auth.admin.updateUserById(existente.id, { app_metadata: { rol: "admin" }, ...(password ? { password } : {}) })
  : await sb.auth.admin.createUser({ email: aCorreo(usuario), password, email_confirm: true, app_metadata: { rol: "admin" } });
if (error) throw error;
if (nombre) await sb.from("profiles").upsert({ id: data.user.id, nombre });
console.log(`✓ @${usuario} es administrador. Entra en /login con ese usuario.`);
