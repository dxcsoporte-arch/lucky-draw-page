import { CalendarClock } from "lucide-react";
import { useEffect, useState } from "react";

type Props = { drawDate: string | null };

const UNITS = [
  { key: "days", label: "Días" },
  { key: "hours", label: "Horas" },
  { key: "minutes", label: "Min" },
  { key: "seconds", label: "Seg" },
] as const;

function diff(target: number) {
  const ms = Math.max(0, target - Date.now());
  const totalSeconds = Math.floor(ms / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    done: ms === 0,
  };
}

export function DrawCountdown({ drawDate }: Props) {
  const target = drawDate ? Date.parse(drawDate) : Number.NaN;
  const valid = Number.isFinite(target);
  const [time, setTime] = useState(() => (valid ? diff(target) : null));

  useEffect(() => {
    if (!valid) return;
    setTime(diff(target));
    const timer = window.setInterval(() => setTime(diff(target)), 1000);
    return () => window.clearInterval(timer);
  }, [target, valid]);

  if (!valid || !time) return null;

  const fullDate = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(target));

  return (
    <section
      aria-label="Cuenta regresiva del sorteo"
      className="relative mb-16 overflow-hidden rounded-2xl border-2 border-accent/40 bg-foreground p-6 text-background shadow-2xl sm:p-10"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 -top-16 size-56 rounded-full bg-primary/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -right-10 size-64 rounded-full bg-accent/30 blur-3xl"
      />
      <div className="relative flex flex-col items-center gap-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1 text-xs font-extrabold uppercase tracking-widest text-accent-foreground">
          <CalendarClock className="size-4" /> Gran sorteo
        </span>
        <h2 className="font-display text-3xl leading-none sm:text-5xl">
          {time.done ? "¡EL SORTEO YA COMENZÓ!" : "FALTA MUY POCO PARA EL SORTEO"}
        </h2>
        <p className="text-sm font-extrabold uppercase tracking-wide text-accent">{fullDate}</p>
        <div className="grid w-full max-w-2xl grid-cols-4 gap-2 sm:gap-4">
          {UNITS.map((unit) => (
            <div
              key={unit.key}
              className="rounded-xl border border-background/15 bg-background/10 px-1 py-4 backdrop-blur-sm sm:px-3 sm:py-6"
            >
              <p className="font-display text-3xl tabular-nums text-accent sm:text-6xl">
                {String(time[unit.key]).padStart(2, "0")}
              </p>
              <p className="mt-1 text-[10px] font-extrabold uppercase tracking-widest opacity-70 sm:text-xs">
                {unit.label}
              </p>
            </div>
          ))}
        </div>
        <p className="text-sm opacity-70">Aparta tus números antes de que se acabe el tiempo.</p>
      </div>
    </section>
  );
}
