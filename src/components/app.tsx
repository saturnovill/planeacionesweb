"use client";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { CircleCheck, CircleAlert, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

/**
 * Enlaces de descarga dentro del formulario de edición. El .docx sale de lo guardado, así que con cambios
 * sin guardar se desactivan y se avisa antes de salir de la página (cerrar, recargar o seguir un enlace).
 */
export function Descargas({ enlaces, className }: { enlaces: { href: string; texto: string }[]; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [sucio, setSucio] = useState(false);

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const marcar = () => setSucio(true);
    // Botones de la barra del editor y de agregar/quitar reactivos: cambian el contenido sin evento input.
    const clic = (e: MouseEvent) => (e.target as Element).closest("button[type=button]") && marcar();
    const limpiar = () => setSucio(false);
    form.addEventListener("input", marcar);
    form.addEventListener("change", marcar);
    form.addEventListener("click", clic);
    form.addEventListener("submit", limpiar);
    return () => {
      form.removeEventListener("input", marcar);
      form.removeEventListener("change", marcar);
      form.removeEventListener("click", clic);
      form.removeEventListener("submit", limpiar);
    };
  }, []);

  useEffect(() => {
    if (!sucio) return;
    const salir = (e: BeforeUnloadEvent) => e.preventDefault();
    // Los <Link> navegan sin beforeunload: se preguntan aquí, antes de que los vea React.
    const enlace = (e: MouseEvent) => {
      if ((e.target as Element).closest("a[href]") && !confirm("Tienes cambios sin guardar. ¿Salir sin guardarlos?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    addEventListener("beforeunload", salir);
    document.addEventListener("click", enlace, true);
    return () => {
      removeEventListener("beforeunload", salir);
      document.removeEventListener("click", enlace, true);
    };
  }, [sucio]);

  const estilo = cn(buttonVariants({ variant: "outline", size: "lg" }), className);
  return (
    <span ref={ref} className="contents">
      {sucio ? (
        <Button type="button" variant="outline" size="lg" disabled className={className}>
          <Download /> Guarda para descargar
        </Button>
      ) : (
        enlaces.map((e) => (
          <a key={e.href} href={e.href} className={estilo}>
            <Download /> {e.texto}
          </a>
        ))
      )}
    </span>
  );
}
