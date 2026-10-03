"use client";
import { useRef, useState } from "react";
import { CircleCheck, CircleDashed, ListChecks, Plus, X } from "lucide-react";
import { editarContenidos, type Accion, type PDA } from "@/lib/contenidos";
import { Avisos } from "@/components/app";
import { Plegable } from "@/components/pagina";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Guardar = (accion: Accion, pda: Omit<PDA, "marcas">) => Promise<{ error: string; contenidos: PDA[] } | undefined>;

/** Contenidos cargados: agregar, quitar y marcar se ven al instante; el servidor guarda detrás, en orden. */
export function ContenidosCargados({ inicial, guardar }: { inicial: PDA[]; guardar: Guardar }) {
  const [lista, setLista] = useState(inicial);
  const [error, setError] = useState<string>();
  // En fila: cada guardado lee y escribe la lista completa, en paralelo se pisarían.
  const cola = useRef(Promise.resolve());

  const editar = (accion: Accion, pda: Omit<PDA, "marcas">) => {
    setError(undefined);
    setLista((l) => editarContenidos(l, accion, pda));
    cola.current = cola.current.then(async () => {
      const r = await guardar(accion, pda).catch(() => ({ error: "No se pudo guardar. Revisa tu conexión.", contenidos: null }));
      if (!r) return;
      setError(r.error);
      if (r.contenidos) setLista(r.contenidos); // vuelve a lo que de verdad quedó guardado
    });
  };

  return (
    <section className="mt-8 space-y-3">
      <div className="flex items-center gap-2">
        <ListChecks className="size-4 text-primary" />
        <h2 className="font-semibold">Contenidos cargados</h2>
        <Badge variant="secondary">{lista.length} PDA</Badge>
      </div>
      <Avisos error={error} />
      {([1, 2, 3] as const).map((g) => {
        const pdas = lista.filter((p) => p.grado === g);
        return (
          <Plegable key={g} titulo={`${g}° grado · ${pdas.length} PDA`}>
            <ul className="space-y-4 text-sm">
              {pdas.map((p) => (
                <li key={`${p.contenido}\n${p.pda}`} className="flex items-start gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">{p.contenido}</div>
                    <div>
                      {p.pda}
                      {p.marcas.map((m) => (
                        <Badge key={m} variant="outline" className="ml-2 border-amber-200 bg-amber-50 text-amber-800">
                          {m}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex">
                    {p.marcas.length ? (
                      <Button variant="ghost" size="icon-sm" className="text-amber-600 hover:text-muted-foreground" aria-label={`Quitar marca de usado: ${p.pda}`} title="Quitar marca de usado" onClick={() => editar("desmarcar", p)}>
                        <CircleCheck />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-amber-600" aria-label={`Marcar como usado: ${p.pda}`} title="Marcar como usado" onClick={() => editar("marcar", p)}>
                        <CircleDashed />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" aria-label={`Quitar PDA: ${p.pda}`} onClick={() => editar("quitar", p)}>
                      <X />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            {/* action de React: limpia los campos al enviar */}
            <form
              action={(fd) => editar("agregar", { grado: g, contenido: String(fd.get("contenido")).trim(), pda: String(fd.get("pda")).trim() })}
              className="mt-5 grid gap-2 border-t pt-4 sm:grid-cols-[1fr_1.5fr_auto]"
            >
              <Input name="contenido" required pattern=".*\S.*" autoComplete="off" placeholder="Contenido" aria-label={`Contenido del nuevo PDA de ${g}°`} className="h-9" />
              <Input name="pda" required pattern=".*\S.*" autoComplete="off" placeholder="PDA" aria-label={`Nuevo PDA de ${g}°`} className="h-9" />
              <Button type="submit" variant="outline" className="h-9">
                <Plus /> Agregar PDA
              </Button>
            </form>
          </Plegable>
        );
      })}
    </section>
  );
}
