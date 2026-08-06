import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { LogOut, RefreshCw, Search } from "lucide-react";
import { getAdminRaffle, updateRaffleNumber } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type AdminData = Awaited<ReturnType<typeof getAdminRaffle>>;

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [
    { title: "Control de boletos | Billetazo LM" },
    { name: "description", content: "Panel privado para administrar boletos vendidos y apartados." },
    { property: "og:title", content: "Control de boletos | Billetazo LM" },
    { property: "og:description", content: "Panel privado de administración de la rifa." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const fetchAdmin = useServerFn(getAdminRaffle);
  const updateNumber = useServerFn(updateRaffleNumber);
  const [data, setData] = useState<AdminData>();
  const [raffleId, setRaffleId] = useState("");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"tickets" | "holds">("tickets");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState<number>();

  async function load(id = raffleId) {
    if (!id) return;
    try { setData(await fetchAdmin({ data: { raffleId: id } })); setMessage(""); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos cargar el panel."); }
  }

  useEffect(() => {
    supabase.from("raffles").select("id").eq("status", "active").limit(1).single().then(({ data: raffle }) => {
      if (!raffle) return setMessage("No hay una rifa activa.");
      setRaffleId(raffle.id);
      void load(raffle.id);
    });
  }, []);

  const filteredNumbers = useMemo(() => {
    const normalized = query.replace(/\D/g, "");
    return data?.numbers.filter((item) => !normalized || item.number.toString().padStart(3, "0").includes(normalized)) ?? [];
  }, [data, query]);

  async function change(number: number, status: "paid" | "available") {
    setWorking(number);
    try { await updateNumber({ data: { raffleId, number, status } }); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos actualizar el boleto."); }
    finally { setWorking(undefined); }
  }

  const paid = data?.numbers.filter((item) => item.status === "paid").length ?? 0;
  const reserved = data?.numbers.filter((item) => item.status === "reserved").length ?? 0;
  return <main className="min-h-screen bg-background">
    <header className="border-b border-border bg-card"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><div><p className="text-xs font-extrabold uppercase text-primary">Billetazo LM</p><h1 className="font-display text-3xl sm:text-4xl">CONTROL DE BOLETOS</h1></div><Button variant="outline" size="icon" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={async () => { await supabase.auth.signOut(); await navigate({ to: "/auth", replace: true }); }}><LogOut /></Button></div></header>
    <div className="mx-auto max-w-7xl px-4 py-6">
      <section className="grid grid-cols-3 gap-3"><Stat label="Vendidos" value={paid} emphasis /><Stat label="Apartados" value={reserved} /><Stat label="Disponibles" value={500 - paid - reserved} /></section>
      <div className="mt-6 flex flex-wrap items-center gap-2"><Button variant={tab === "tickets" ? "default" : "outline"} onClick={() => setTab("tickets")}>Boletos</Button><Button variant={tab === "holds" ? "default" : "outline"} onClick={() => setTab("holds")}>Apartados</Button><Button variant="outline" size="icon" aria-label="Actualizar" title="Actualizar" onClick={() => load()}><RefreshCw /></Button></div>
      {message && <p role="alert" className="mt-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{message}</p>}
      {tab === "tickets" ? <section className="mt-5"><label className="relative block max-w-sm"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} inputMode="numeric" maxLength={3} placeholder="Buscar boleto" className="h-10 w-full rounded-md border border-input bg-card pl-9 pr-3 outline-none focus:ring-2 focus:ring-ring" /></label><div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">{filteredNumbers.map((item) => <button key={item.number} type="button" disabled={working === item.number} onClick={() => change(item.number, item.status === "paid" ? "available" : "paid")} title={item.status === "paid" ? "Vendido: tocar para liberar" : "Tocar para marcar vendido"} className={`aspect-square min-w-0 rounded-md border text-sm font-black transition-colors disabled:opacity-50 ${item.status === "paid" ? "border-primary bg-primary text-primary-foreground" : item.status === "reserved" ? "border-reserved bg-reserved/20 text-foreground" : "border-border bg-card hover:border-primary"}`}>{item.number.toString().padStart(3, "0")}</button>)}</div></section> : <section className="mt-5 space-y-3">{data?.reservations.filter((item) => item.status === "pending").map((item) => <article key={item.id} className="rounded-md border border-border bg-card p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{item.phone}</strong><span className="text-xs text-muted-foreground">Vence {new Date(item.expires_at).toLocaleString("es-MX")}</span></div><p className="mt-2 text-sm">Boletos: {item.numbers.map((number) => number.toString().padStart(3, "0")).join(", ") || "Sin boletos activos"}</p></article>)}{data && !data.reservations.some((item) => item.status === "pending") && <p className="text-sm text-muted-foreground">No hay apartados activos.</p>}</section>}
    </div>
  </main>;
}

function Stat({ label, value, emphasis = false }: { label: string; value: number; emphasis?: boolean }) {
  return <div className={`rounded-md border p-3 ${emphasis ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}><p className="text-xs font-bold uppercase opacity-75">{label}</p><p className="mt-1 font-display text-3xl">{value}</p></div>;
}