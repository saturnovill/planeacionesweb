import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { GraduationCap, LogOut, Plus, UserRound, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase/server";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = { title: "Planeaciones", description: "Planeaciones de Matemáticas con IA" };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

async function salir() {
  "use server";
  await (await supabase()).auth.signOut();
  redirect("/login");
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { data } = await (await supabase()).auth.getClaims();
  const esAdmin = (data?.claims?.app_metadata as { rol?: string } | undefined)?.rol === "admin";
  return (
    <html lang="es" className={`${geist.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {data?.claims && (
          <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
            <nav className="mx-auto flex h-14 max-w-3xl items-center gap-1 px-4">
              <Link href="/" className="mr-auto flex items-center gap-2 font-semibold">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <GraduationCap className="size-5" />
                </span>
                Planeaciones
              </Link>
              <Link href="/nueva" className={cn(buttonVariants({ variant: "default", size: "sm" }), "hidden sm:inline-flex")}>
                <Plus /> Nueva
              </Link>
              {esAdmin && (
                <Link href="/admin" aria-label="Docentes" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  <UsersRound /> <span className="hidden sm:inline">Docentes</span>
                </Link>
              )}
              <Link href="/perfil" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                <UserRound /> Perfil
              </Link>
              <form action={salir}>
                <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
                  <LogOut /> Salir
                </Button>
              </form>
            </nav>
          </header>
        )}
        {children}
        <Analytics />
      </body>
    </html>
  );
}
