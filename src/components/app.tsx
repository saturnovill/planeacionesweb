"use client";
import { useFormStatus } from "react-dom";
import { CircleCheck, CircleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/** Botón de envío: se deshabilita y muestra un spinner mientras corre la acción del formulario. */
export function Enviar({
  children,
  pendiente,
  variant,
  size = "lg",
  className,
}: {
  children: React.ReactNode;
  pendiente: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant={variant} size={size} className={className}>
      {pending && <Spinner />}
      {pending ? pendiente : children}
    </Button>
  );
}

/** Mensajes que llegan por ?error= / ?msg= después de una acción. */
export function Avisos({ error, msg }: { error?: string | string[]; msg?: string | string[] }) {
  return (
    <>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <CircleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {msg && (
        <Alert className="mb-4 border-emerald-200 bg-emerald-50 text-emerald-900">
          <CircleCheck className="text-emerald-600" />
          <AlertDescription className="text-emerald-900">{msg}</AlertDescription>
        </Alert>
      )}
    </>
  );
}
