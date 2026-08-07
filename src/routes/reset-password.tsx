import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Cambiar contraseña | Billetazolm" },
    { name: "description", content: "Billetazo LM — Cambiar contraseña" },
    { property: "og:title", content: "Cambiar contraseña | Billetazolm" },
    { property: "og:description", content: "Billetazo LM — Cambiar contraseña" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!window.location.hash.includes("type=recovery")) return setMessage("Abre esta página desde el enlace enviado a tu correo.");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return setMessage(error.message);
    await navigate({ to: "/admin" });
  }
  return <main className="flex min-h-screen items-center justify-center bg-background px-4"><form onSubmit={submit} className="w-full max-w-md rounded-lg border border-border bg-card p-7 shadow-xl"><h1 className="font-display text-4xl">NUEVA CONTRASEÑA</h1><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={8} maxLength={72} required autoComplete="new-password" placeholder="Mínimo 8 caracteres" className="mt-6 h-11 w-full rounded-md border border-input bg-background px-3 outline-none focus:ring-2 focus:ring-ring" />{message && <p className="mt-3 text-sm text-destructive">{message}</p>}<Button type="submit" className="mt-4 h-11 w-full">Guardar contraseña</Button></form></main>;
}