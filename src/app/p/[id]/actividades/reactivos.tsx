"use client";
import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Reactivo = { enunciado: string; respuesta: string };

/** Renglones editables de una sesión: se pueden quitar o agregar; guardar los lee en orden con fd.getAll. */
export function Reactivos({ sesion, inicial }: { sesion: number; inicial: Reactivo[] }) {
  const siguiente = useRef(inicial.length);
  const [filas, setFilas] = useState(() => inicial.map((r, id) => ({ ...r, id })));
  const i = sesion;

  return (
    <div>
      <div className="mb-2 grid grid-cols-[1.75rem_1fr_2.25rem] gap-2 text-xs font-medium text-muted-foreground sm:grid-cols-[1.75rem_1fr_9rem_2.25rem]">
        <span />
        <span>Reactivo</span>
        <span className="hidden sm:block">Respuesta</span>
      </div>
      <ol className="flex flex-col gap-2">
        {filas.map((r, k) => (
          <li key={r.id} className="grid grid-cols-[1.75rem_1fr_2.25rem] items-start gap-x-2 gap-y-1 sm:grid-cols-[1.75rem_1fr_9rem_2.25rem]">
            <span className="flex h-9 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">{k + 1}</span>
            <Input name={`a${i}_e`} defaultValue={r.enunciado} aria-label={`Sesión ${i + 1}, reactivo ${k + 1}`} className="h-9" />
            <Input
              name={`a${i}_r`}
              defaultValue={r.respuesta}
              aria-label={`Sesión ${i + 1}, respuesta ${k + 1}`}
              className="col-start-2 h-9 border-amber-200 bg-amber-50 font-semibold sm:col-start-3"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="col-start-3 row-start-1 size-9 text-muted-foreground sm:col-start-4"
              aria-label={`Quitar reactivo ${k + 1} de la sesión ${i + 1}`}
              onClick={() => setFilas((f) => f.filter((x) => x.id !== r.id))}
            >
              <X />
            </Button>
          </li>
        ))}
      </ol>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={() => setFilas((f) => [...f, { enunciado: "", respuesta: "", id: siguiente.current++ }])}
      >
        <Plus /> Agregar reactivo
      </Button>
    </div>
  );
}
