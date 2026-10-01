"use server";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin";
import { aCorreo, esValido, normalizar } from "@/lib/usuarios";

const MIN = 8;
const volver = (q: string, texto: string): never => redirect(`/admin?${q}=${encodeURIComponent(texto)}`);

export async function crearDocente(fd: FormData) {
  const { admin } = await requireAdmin();
  const usuario = normalizar(String(fd.get("usuario") ?? ""));
  const nombre = String(fd.get("nombre") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  if (!esValido(usuario)) volver("error", "Usuario inválido: 3 a 30 caracteres, minúsculas, números, punto, guion o guion bajo.");
  if (!nombre) volver("error", "Escribe el nombre del docente.");
  if (password.length < MIN) volver("error", `La contraseña debe tener al menos ${MIN} caracteres.`);

  const { data, error } = await admin.auth.admin.createUser({
    email: aCorreo(usuario),
    password,
    email_confirm: true, // no hay correo real que confirmar
    app_metadata: fd.get("admin") === "si" ? { rol: "admin" } : {},
  });
  if (error) volver("error", /already|registered|exists/i.test(error.message) ? `El usuario "${usuario}" ya existe.` : error.message);
  await admin.from("profiles").upsert({ id: data.user!.id, nombre });
  volver("msg", `Docente "${usuario}" creado.`);
}

export async function restablecer(id: string, usuario: string, fd: FormData) {
  const { admin } = await requireAdmin();
  const password = String(fd.get("password") ?? "");
  if (password.length < MIN) volver("error", `La contraseña debe tener al menos ${MIN} caracteres.`);
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  volver(error ? "error" : "msg", error ? error.message : `Contraseña de "${usuario}" actualizada.`);
}

export async function eliminarDocente(id: string, usuario: string, fd: FormData) {
  const { admin, userId } = await requireAdmin();
  if (fd.get("confirmar") !== "si") volver("error", "Confirma la eliminación.");
  if (id === userId) volver("error", "No puedes eliminar tu propia cuenta.");
  // profiles y planeaciones se borran en cascada (references auth.users on delete cascade).
  const { error } = await admin.auth.admin.deleteUser(id);
  volver(error ? "error" : "msg", error ? error.message : `Docente "${usuario}" eliminado.`);
}
