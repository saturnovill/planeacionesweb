import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { periodo } from "@/lib/docx";
import type { Planeacion } from "@/lib/planeacion";
import { FileUp } from "lucide-react";
import { Encabezado, Pagina } from "@/components/pagina";
import { buttonVariants } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { FormNueva } from "./form";

export const maxDuration = 300;

export default async function Nueva() {
  const { sb, userId } = await requireUser();
  const [{ data }, { data: historial }] = await Promise.all([
    sb.from("profiles").select("contenidos").eq("id", userId).maybeSingle(),
    sb.from("planeaciones").select("seleccion, periodo_inicio, periodo_fin").order("periodo_inicio", { ascending: false }),
  ]);
  // PDA → periodos en que ya se planeó (además de las marcas a mano del documento de contenidos).
  const usados: Record<string, string[]> = {};
  for (const h of (historial ?? []) as Pick<Planeacion, "seleccion" | "periodo_inicio" | "periodo_fin">[])
    for (const s of h.seleccion) (usados[s.pda] ??= []).push(periodo(h.periodo_inicio, h.periodo_fin));
  return (
    <Pagina>
      <Encabezado titulo="Nueva planeación" descripcion="Completa los tres pasos y la IA redactará la primera versión." />
      {data?.contenidos?.length ? (
        <FormNueva contenidos={data.contenidos} usados={usados} />
      ) : (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileUp />
            </EmptyMedia>
            <EmptyTitle>Falta tu documento de contenidos</EmptyTitle>
            <EmptyDescription>Primero sube tu documento de contenidos en Perfil para poder elegir los PDA.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href="/perfil" className={buttonVariants()}>
              Ir a Perfil
            </Link>
          </EmptyContent>
        </Empty>
      )}
    </Pagina>
  );
}
