import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { aCorreo } from "../src/lib/usuarios";

const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

test("planeaciones inexistentes o con id inválido dan 404", async ({ page }) => {
  for (const id of ["00000000-0000-0000-0000-000000000000", "no-es-uuid"]) {
    for (const ruta of ["", "/docx", "/actividades", "/actividades/docx"]) expect((await page.request.get(`/p/${id}${ruta}`)).status(), ruta).toBe(404);
  }
});

test("RLS: sin sesión no se lee ni se escribe nada", async () => {
  const anon = createClient(URL_SB, KEY);
  for (const tabla of ["planeaciones", "profiles"]) {
    const { data } = await anon.from(tabla).select("*");
    expect(data, tabla).toEqual([]);
  }
  const { error } = await anon.from("planeaciones").insert({ tipo: "clases", escuela: "27", grado: 1, grupos: "A", periodo_inicio: "2026-01-01", periodo_fin: "2026-01-02" });
  expect(error).not.toBeNull();
});

test("RLS: un docente solo ve y modifica lo suyo", async () => {
  const sb = createClient(URL_SB, KEY);
  const { data: login, error } = await sb.auth.signInWithPassword({ email: aCorreo(process.env.E2E_USUARIO!), password: process.env.E2E_PASSWORD! });
  expect(error).toBeNull();
  const yo = login.user!.id;

  for (const tabla of ["planeaciones", "profiles"] as const) {
    const { data } = await sb.from(tabla).select(tabla === "profiles" ? "id" : "user_id");
    for (const fila of (data ?? []) as Record<string, string>[]) expect(fila.id ?? fila.user_id, tabla).toBe(yo);
  }
  // No puede crear filas a nombre de otro usuario.
  const ajeno = "11111111-1111-1111-1111-111111111111";
  const ins = await sb.from("planeaciones").insert({ user_id: ajeno, tipo: "clases", escuela: "27", grado: 1, grupos: "A", periodo_inicio: "2026-01-01", periodo_fin: "2026-01-02" });
  expect(ins.error).not.toBeNull();
  const perfil = await sb.from("profiles").upsert({ id: ajeno, nombre: "intruso" });
  expect(perfil.error).not.toBeNull();
});

