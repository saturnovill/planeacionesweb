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

/** Botón "Eliminar" con diálogo de confirmación; `accion` es la Server Action ya ligada al id. */
export function Eliminar({
  accion,
  etiqueta = "Eliminar planeación",
  titulo = "¿Eliminar esta planeación?",
  descripcion = "Se borrará junto con sus actividades. Esta acción no se puede deshacer.",
  size,
}: {
  accion: (fd: FormData) => Promise<void>;
  etiqueta?: string;
  titulo?: string;
  descripcion?: string;
  size?: React.ComponentProps<typeof Button>["size"];
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="destructive" size={size} />}>
        <Trash2 /> {etiqueta}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descripcion}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <form action={accion}>
            <input type="hidden" name="confirmar" value="si" />
            <Enviar variant="destructive" size="default" pendiente="Eliminando…" className="w-full">
              Sí, eliminar
            </Enviar>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
