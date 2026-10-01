import { cn } from "@/lib/utils";

/** Contenedor y encabezado común de las páginas. */
export function Pagina({ children, className }: { children: React.ReactNode; className?: string }) {
  return <main className={cn("mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-10", className)}>{children}</main>;
}

export function Encabezado({ titulo, descripcion, accion }: { titulo: React.ReactNode; descripcion?: React.ReactNode; accion?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {descripcion && <p className="text-sm text-muted-foreground">{descripcion}</p>}
      </div>
      {accion}
    </div>
  );
}

/** Número de paso dentro de un círculo, para los títulos de sección. */
export function Paso({ n }: { n: number }) {
  return <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{n}</span>;
}

/**
 * Sección plegable con estilo de tarjeta. Es un <details> nativo a propósito: el contenido cerrado
 * sigue en el DOM, así que sus campos se envían con el formulario.
 */
export function Plegable({ titulo, extra, abierto, children }: { titulo: React.ReactNode; extra?: React.ReactNode; abierto?: boolean; children: React.ReactNode }) {
  return (
    <details open={abierto} className="group/plegable rounded-xl bg-card ring-1 ring-foreground/10 open:shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 select-none [&::-webkit-details-marker]:hidden">
        <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-muted-foreground transition-transform group-open/plegable:rotate-90" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="m9 18 6-6-6-6" />
        </svg>
        <span className="min-w-0 flex-1 font-medium">{titulo}</span>
        {extra}
      </summary>
      <div className="border-t px-4 py-4">{children}</div>
    </details>
  );
}
