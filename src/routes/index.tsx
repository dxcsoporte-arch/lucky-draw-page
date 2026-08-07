import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Clock3, MessageCircle, Search, ShieldCheck, TicketCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import brandLogo from "@/assets/billetazo-lm-logo.png.asset.json";
import prizeImage from "@/assets/rifa-10000-pesos.png.asset.json";
import { ActionButton } from "@/components/ActionButton";
import { createReservation, getRaffle } from "@/lib/raffle.functions";

export const Route = createFileRoute("/")({
  loader: () => getRaffle(),
  head: () => ({
    meta: [
      { title: "Rifa de 500 números | Billetazo LM" },
      { name: "description", content: "Elige y aparta tus números para participar en nuestra rifa de 500 boletos." },
      { property: "og:title", content: "Rifa de 500 números | Billetazo LM" },
      { property: "og:description", content: "Elige tus números de la suerte y apártalos por WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function formatNumber(value: number) {
  return String(value).padStart(3, "0");
}

type RaffleNumber = { number: number; status: string; reserved_until: string | null };

type ConfirmedReservation = {
  id: string;
  phone: string;
  numbers: number[];
  total: number;
  expiresAt: string;
};

function createWhatsAppUrl(destination: string, text: string) {
  return `https://wa.me/${destination.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

function Index() {
  const initialData = Route.useLoaderData();
  const router = useRouter();
  const reserve = useServerFn(createReservation);
  
  const { raffle, numbers } = initialData;
  const [selected, setSelected] = useState<number[]>([]);
  const [phone, setPhone] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [limitNotice, setLimitNotice] = useState("");
  const [working, setWorking] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(1800);
  const [confirmedReservation, setConfirmedReservation] = useState<ConfirmedReservation | null>(null);

  useEffect(() => {
    if (!expiresAt) return;
    const update = () => setRemaining(Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  const statusByNumber = useMemo(() => new Map(numbers.map((item: RaffleNumber) => [item.number, item.status])), [numbers]);
  const total = selected.length * raffle.ticket_price;
  const drawDate = raffle.draw_date
    ? new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" }).format(new Date(raffle.draw_date))
    : "Próximamente";
  const contactMessage = selected.length
    ? `Hola, quiero confirmar mi apartado para ${raffle.name}.\n\nCelular: ${phone || "Por registrar"}\nNúmeros: ${selected.map(formatNumber).join(", ")}\nCantidad: ${selected.length}\nTotal: $${total.toLocaleString("es-MX")} MXN.`
    : `Hola, quiero información sobre la rifa ${raffle.name}.`;
  const whatsappUrl = createWhatsAppUrl(raffle.whatsapp_number, contactMessage);
  const confirmedWhatsAppUrl = confirmedReservation
    ? createWhatsAppUrl(
        raffle.whatsapp_number,
        `Hola, quiero confirmar mi apartado para ${raffle.name}.\n\nFolio: ${confirmedReservation.id}\nCelular: ${confirmedReservation.phone}\nNúmeros: ${confirmedReservation.numbers.map(formatNumber).join(", ")}\nCantidad: ${confirmedReservation.numbers.length}\nTotal: $${confirmedReservation.total.toLocaleString("es-MX")} MXN\nVence: ${new Intl.DateTimeFormat("es-MX", { dateStyle: "short", timeStyle: "short" }).format(new Date(confirmedReservation.expiresAt))}.\n\nAdjunto mi comprobante de pago.`,
      )
    : whatsappUrl;

  const toggleNumber = (number: number) => {
    if (statusByNumber.get(number) !== "available") return;
    setSelected((current) => {
      if (current.includes(number)) {
        setLimitNotice("");
        return current.filter((item) => item !== number);
      }
      if (current.length >= 10) {
        setLimitNotice("Has alcanzado el límite de 10 números por apartado. Quita uno para elegir otro.");
        return current;
      }
      const next = [...current, number].sort((a, b) => a - b);
      setLimitNotice(next.length === 10 ? "Has alcanzado el límite de 10 números por apartado." : "");
      return next;
    });
  };

  const verifyNumber = () => {
    const value = Number(search);
    if (!/^\d{1,3}$/.test(search) || value < 0 || value > 499) {
      setMessage("Escribe un número entre 000 y 499.");
      return;
    }
    const state = statusByNumber.get(value);
    setMessage(`El número ${formatNumber(value)} está ${state === "available" ? "disponible" : state === "reserved" ? "apartado" : "pagado"}.`);
    document.getElementById(`number-${value}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const submitReservation = async () => {
    if (!selected.length) return setMessage("Selecciona al menos un número.");
    if (selected.length > 10) return setMessage("Solo puedes apartar un máximo de 10 números.");
    if (!/^[1-9][0-9]{9,14}$/.test(phone)) return setMessage("Ingresa tu celular con lada, usando solo números.");
    setWorking(true);
    setMessage("");
    try {
      const result = await reserve({ data: { raffleId: raffle.id, phone, numbers: selected } });
      setExpiresAt(result.expires_at);
      setConfirmedReservation({
        id: result.reservation_id,
        phone,
        numbers: [...selected],
        total,
        expiresAt: result.expires_at,
      });
      setMessage("¡Apartado confirmado! Tienes 30 minutos para enviar tu comprobante.");
      await router.invalidate();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No pudimos completar el apartado.");
    } finally {
      setWorking(false);
    }
  };


  return (
    <div className="min-h-screen bg-background pb-28 text-foreground md:pb-0">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
          <a href="#inicio" className="flex min-w-0 items-center gap-3" aria-label="Ir al inicio">
            <img src={brandLogo.url} alt="Logotipo de Billetazo LM" className="size-12 shrink-0 object-contain" />
            <span className="truncate font-display text-2xl text-primary">{raffle.name}</span>
          </a>
          <nav className="hidden items-center gap-6 text-xs font-extrabold uppercase md:flex" aria-label="Navegación principal">
            <a href="#inicio" className="hover:text-primary">Inicio</a><a href="#verificar" className="hover:text-primary">Verificar</a><a href="#numeros" className="hover:text-primary">Números</a>
          </nav>
          <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-success px-3 text-xs font-extrabold text-success-foreground transition-transform hover:scale-[1.03] sm:px-5"><MessageCircle className="size-4" /> <span className="hidden sm:inline">Contactar</span></a>
        </div>
      </header>

      <main id="inicio" className="mx-auto max-w-7xl px-4 py-8">
        <section className="mb-16 grid items-center gap-10 lg:grid-cols-2">
          <div className="space-y-6">
            <span className="inline-flex rounded bg-accent/20 px-3 py-1 text-sm font-extrabold uppercase text-accent-foreground">¡GRAN RIFA INICAL !</span>
            <h1 className="max-w-full font-display text-4xl leading-none sm:text-5xl md:text-7xl">
              <span className="block sm:inline">GÁNATE<span className="hidden sm:inline">&nbsp;&nbsp;</span></span>
              <span className="block text-primary sm:inline">$10,000 mil pesos</span>
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">Te imaginas ganarte el premio podras pagar tus deudas, invertirlo o irte de vacciones.</p>
            <div className="flex flex-wrap gap-4">
              <div className="rounded-lg border border-border bg-card p-4 shadow-sm"><p className="text-xs font-extrabold uppercase text-muted-foreground">Precio boleto</p><p className="text-2xl font-extrabold text-primary">$30 MXN</p></div>
              <div className="rounded-lg border border-border bg-card p-4 shadow-sm"><p className="text-xs font-extrabold uppercase text-muted-foreground">Fecha sorteo</p><p className="text-2xl font-extrabold uppercase text-primary">20 NOV</p></div>
              <div className="rounded-lg border border-border bg-card p-4 shadow-sm"><p className="text-xs font-extrabold uppercase text-muted-foreground">Disponibles</p><p className="text-2xl font-extrabold text-primary">{numbers.filter((item: RaffleNumber) => item.status === "available").length}/500</p></div>
            </div>
          </div>
          <div className="relative pb-8 lg:pb-0">
            <img src={prizeImage.url} alt="Gran rifa de $10,000 mil pesos en efectivo" width={768} height={960} className="mx-auto aspect-[4/5] w-full max-w-xl rounded-2xl object-contain shadow-2xl" />
            <div className="absolute bottom-0 right-3 max-w-64 rounded-lg bg-primary p-5 text-primary-foreground shadow-xl lg:-bottom-6 lg:-right-3"><p className="text-xs font-extrabold uppercase opacity-80">Tiempo de apartado</p><p className="font-display text-3xl">30 MINUTOS</p><p className="text-xs">Si no pagas, tus números se liberan.</p></div>
          </div>
        </section>

        <section id="verificar" className="mb-16 grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm"><h2 className="mb-4 flex items-center gap-2 font-extrabold"><Search className="size-5 text-primary" /> Verificar número</h2><div className="flex gap-2"><input value={search} onChange={(e) => setSearch(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="000–499" inputMode="numeric" className="min-w-0 flex-1 rounded-lg border border-input bg-muted px-3 outline-none focus:ring-2 focus:ring-ring" /><ActionButton onClick={verifyNumber}>Buscar</ActionButton></div></div>
          <div className="flex flex-col items-center justify-center rounded-lg bg-primary p-6 text-center text-primary-foreground"><ShieldCheck className="mb-2 size-8" /><p className="text-sm font-extrabold uppercase opacity-80">Apartado seguro</p><p className="font-display text-2xl">La suerte está a un clic</p><p className="mt-1 text-xs opacity-80">Máximo 10 números por apartado.</p></div>
        </section>


        <section id="numeros" className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-8">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><h2 className="font-display text-4xl">SELECCIONA TUS NÚMEROS</h2><p className="text-muted-foreground">Haz clic para elegir hasta 10 números de la suerte.</p><p className="mt-2 text-sm font-extrabold text-primary">{selected.length} de 10 seleccionados</p></div><div className="flex flex-wrap gap-4 text-xs font-extrabold uppercase"><span className="flex items-center gap-2"><i className="size-4 rounded border border-border bg-muted" />Disponible</span><span className="flex items-center gap-2"><i className="size-4 rounded bg-accent" />Elegido</span><span className="flex items-center gap-2"><i className="size-4 rounded bg-reserved" />Apartado</span><span className="flex items-center gap-2"><i className="size-4 rounded bg-primary" />Pagado</span></div></div>
          {limitNotice && <p role="alert" aria-live="assertive" className="mb-5 rounded-lg border border-accent bg-accent/20 px-4 py-3 text-sm font-extrabold text-accent-foreground">{limitNotice}</p>}
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-20">
            {numbers.map((item: RaffleNumber) => {
              const chosen = selected.includes(item.number);
              return <button id={`number-${item.number}`} key={item.number} disabled={item.status !== "available"} onClick={() => toggleNumber(item.number)} aria-label={`Número ${formatNumber(item.number)}, ${chosen ? "elegido" : item.status}`} className={`aspect-square rounded-md border text-xs font-extrabold transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 ${chosen ? "border-accent bg-accent text-accent-foreground ring-2 ring-accent/30" : item.status === "reserved" ? "border-reserved bg-reserved text-foreground" : item.status === "paid" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted text-foreground hover:bg-accent/40"}`}>{formatNumber(item.number)}</button>;
            })}
          </div>
          <div className="mt-10 rounded-lg bg-foreground p-6 text-background sm:p-8">
            <div className="grid items-end gap-5 lg:grid-cols-[1fr_280px_auto]">
              <div><p className="text-xs font-extrabold uppercase opacity-60">Tus números</p><p className="mt-1 min-h-8 font-display text-2xl">{selected.length ? selected.map(formatNumber).join(" · ") : "AÚN NO HAS ELEGIDO"}</p><p className="mt-2 text-sm opacity-70">{selected.length} boleto(s) · Total ${total.toLocaleString("es-MX")} MXN</p></div>
              <label className="block"><span className="mb-2 block text-xs font-extrabold uppercase opacity-60">Celular con lada</span><input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 15))} inputMode="tel" placeholder="521234567890" className="h-12 w-full rounded-lg border border-background/20 bg-background/10 px-4 text-background outline-none placeholder:text-background/40 focus:ring-2 focus:ring-accent" /></label>
              <ActionButton tone="accent" className="h-12 px-7" disabled={working} onClick={submitReservation}><TicketCheck className="size-5" />{working ? "Apartando…" : "Apartar ahora"}</ActionButton>
            </div>
            {message && <p role="status" className="mt-4 rounded-lg bg-background/10 px-4 py-3 text-sm">{message}</p>}
            {expiresAt && <div className="mt-4 flex items-center gap-2 text-sm text-accent"><Clock3 className="size-4" />Vence en {String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}</div>}
            {confirmedReservation && <a href={confirmedWhatsAppUrl} target="_blank" rel="noreferrer" className="mt-5 flex min-h-14 w-full items-center justify-center gap-3 rounded-lg bg-success px-5 text-center text-sm font-extrabold uppercase text-success-foreground shadow-lg transition-transform active:scale-[0.98] sm:w-fit"><MessageCircle className="size-5 shrink-0" />Contactar por WhatsApp</a>}
          </div>
        </section>
      </main>

      <footer className="mt-16 border-t border-border bg-muted py-10 text-center"><p className="font-display text-2xl text-primary">{raffle.name}</p><p className="mx-auto mt-2 max-w-xl px-4 text-sm text-muted-foreground">Sorteo transparente con 500 números. Conserva tu comprobante y confirma tu pago por WhatsApp.</p></footer>
      <div className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 md:hidden">{confirmedReservation ? <a href={confirmedWhatsAppUrl} target="_blank" rel="noreferrer" className="flex min-h-14 w-full items-center justify-center gap-3 rounded-lg bg-success px-4 text-center font-extrabold uppercase text-success-foreground shadow-2xl"><MessageCircle className="size-5 shrink-0" />Contactar por WhatsApp</a> : <ActionButton onClick={submitReservation} disabled={!selected.length || working} className="min-h-14 w-full bg-success text-success-foreground shadow-2xl hover:bg-success"><MessageCircle className="size-5" />Apartar {selected.length ? `${selected.length} número(s)` : "por WhatsApp"}</ActionButton>}</div>
    </div>
  );
}
