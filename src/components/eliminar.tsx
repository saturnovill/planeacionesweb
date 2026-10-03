"use client";
import { Trash2 } from "lucide-react";
import { Enviar } from "@/components/app";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/** Botón "Eliminar" con diálogo de confirmación; `accion` es la Server Action ya ligada al id. Con size="icon*" la etiqueta queda solo como aria-label. */
export function Eliminar({
  accion,
  etiqueta = "Eliminar planeación",
  titulo = "¿Eliminar esta planeación?",
  descripcion = "Se borrará junto con sus actividades. Esta acción no se puede deshacer.",
  size,
  className,
}: {
  accion: (fd: FormData) => Promise<void>;
  etiqueta?: string;
  titulo?: string;
  descripcion?: string;
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
}) {
  const icono = size?.startsWith("icon");
  return (
    <Confirmar
      accion={accion}
      boton={<Button variant="destructive" size={size} className={className} aria-label={icono ? etiqueta : undefined} />}
      contenido={<><Trash2 /> {!icono && etiqueta}</>}
      titulo={titulo}
      descripcion={descripcion}
      confirmar="Sí, eliminar"
      pendiente="Eliminando…"
      variant="destructive"
    />
  );
}

/** Botón que abre un diálogo y solo ejecuta `accion` (con confirmar=si) si el docente acepta. */
export function Confirmar({
  accion,
  boton,
  contenido,
  titulo,
  descripcion,
  confirmar,
  pendiente,
  variant,
}: {
  accion: (fd: FormData) => Promise<void>;
  boton: React.ReactElement;
  contenido: React.ReactNode;
  titulo: string;
  descripcion: string;
  confirmar: string;
  pendiente: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={boton}>{contenido}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descripcion}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <form action={accion}>
            <input type="hidden" name="confirmar" value="si" />
            <Enviar variant={variant} size="default" pendiente={pendiente} className="w-full">
              {confirmar}
            </Enviar>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
