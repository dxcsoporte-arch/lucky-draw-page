import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const ADMIN_EMAIL = "dxcsoporte@gmail.com";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Acceso administrador | Billetazolm" },
    { name: "description", content: "Billetazo LM — Acceso administrador" },
    { property: "og:title", content: "Acceso administrador | Billetazolm" },
    { property: "og:description", content: "Billetazo LM — Acceso administrador" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const [createMode, setCreateMode] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setMessage("");
    const result = createMode
      ? await supabase.auth.signUp({ email: ADMIN_EMAIL, password, options: { emailRedirectTo: window.location.origin } })
      : await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password });
    setWorking(false);
    if (result.error) return setMessage(result.error.message);
    if (createMode && !result.data.session) return setMessage("Revisa tu correo y confirma la cuenta antes de entrar.");
    await navigate({ to: "/admin" });
  }

  return <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
    <section className="w-full max-w-md rounded-lg border border-border bg-card p-7 shadow-xl">
      <LockKeyhole className="mb-4 size-10 text-primary" />
      <h1 className="font-display text-4xl">PANEL ADMINISTRADOR</h1>
      <p className="mt-2 text-sm text-muted-foreground">Acceso privado para controlar los boletos vendidos.</p>
      <form onSubmit={submit} className="mt-7 space-y-4">
        <label className="block"><span className="mb-2 block text-xs font-extrabold uppercase text-muted-foreground">Correo</span><input value={ADMIN_EMAIL} readOnly className="h-11 w-full rounded-md border border-input bg-muted px-3" /></label>
        <label className="block"><span className="mb-2 block text-xs font-extrabold uppercase text-muted-foreground">Contraseña</span><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={8} maxLength={72} required autoComplete={createMode ? "new-password" : "current-password"} className="h-11 w-full rounded-md border border-input bg-background px-3 outline-none focus:ring-2 focus:ring-ring" /></label>
        {message && <p role="status" className="rounded-md bg-muted px-3 py-2 text-sm">{message}</p>}
        <Button type="submit" className="h-11 w-full" disabled={working}>{working ? "Procesando…" : createMode ? "Crear acceso" : "Ingresar"}</Button>
      </form>
      <button type="button" onClick={() => { setCreateMode((value) => !value); setMessage(""); }} className="mt-4 w-full text-center text-sm font-semibold text-primary hover:underline">{createMode ? "Ya tengo contraseña" : "Crear acceso por primera vez"}</button>
      <button type="button" onClick={async () => { await supabase.auth.resetPasswordForEmail(ADMIN_EMAIL, { redirectTo: `${window.location.origin}/reset-password` }); setMessage("Enviamos el enlace para cambiar tu contraseña."); }} className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground">Olvidé mi contraseña</button>
    </section>
  </main>;
}