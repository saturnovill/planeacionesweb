/*
 * Login por nombre de usuario: Supabase Auth solo acepta correo, así que cada usuario se guarda
 * como un correo interno `usuario@DOMINIO`. Nunca se envían correos a esa dirección.
 */
export const DOMINIO = "usuarios.planeaciones.local";

/** 3-30 caracteres: minúsculas, números, punto, guion y guion bajo. */
const VALIDO = /^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$/;

export const normalizar = (u: string) => u.trim().toLowerCase();
export const esValido = (u: string) => VALIDO.test(u);
export const aCorreo = (usuario: string) => `${normalizar(usuario)}@${DOMINIO}`;
export const deCorreo = (correo?: string | null) => (correo?.endsWith(`@${DOMINIO}`) ? correo.slice(0, -DOMINIO.length - 1) : (correo ?? ""));
