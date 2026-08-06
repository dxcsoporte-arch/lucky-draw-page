import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import premioPorsche from "@/assets/premio-porsche.jpg";

const TITULO = "Rifa Porsche 911 Carrera S — Sorte Grande";
const DESCRICAO =
  "Concorra a um Porsche 911 Carrera S 0km por apenas R$ 1,50 o número. Escolha seus números e pague via PIX.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITULO },
      { name: "description", content: DESCRICAO },
      { property: "og:title", content: TITULO },
      { property: "og:description", content: DESCRICAO },
    ],
  }),
  component: Index,
});

const PRECO = 1.5;
const VENDIDOS = new Set([1, 5, 8, 12, 19, 27, 33, 41, 48, 52, 60, 66, 71, 84, 90]);

function formatarNumero(n: number) {
  return String(n).padStart(3, "0");
}

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Index() {
  const [visiveis, setVisiveis] = useState(60);
  const [selecionados, setSelecionados] = useState<number[]>([3]);

  const alternar = (n: number) => {
    if (VENDIDOS.has(n)) return;
    setSelecionados((atual) =>
      atual.includes(n) ? atual.filter((x) => x !== n) : [...atual, n],
    );
  };

  const total = selecionados.length * PRECO;

  return (
    <div className="min-h-screen bg-background text-foreground font-body pb-32">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border px-6 py-4 flex justify-between items-center">
        <span className="font-display text-2xl tracking-tight text-primary uppercase">
          Sorte Grande
        </span>
        <div className="flex gap-6 items-center">
          <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground hidden md:block">
            Sorteio #882
          </span>
          <button className="bg-foreground text-background px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider">
            Minhas Rifas
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-12">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div className="animate-reveal">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              Sorteio em 4 dias
            </div>
            <h1 className="font-display text-6xl md:text-8xl leading-[0.9] text-balance mb-6 uppercase">
              Porsche 911 <br />
              <span className="text-primary">Carrera S</span>
            </h1>
            <p className="text-muted-foreground max-w-[45ch] text-lg mb-8 text-pretty">
              Participe do sorteio mais esperado do ano. Veículo 0km com documentação paga e
              entrega em todo o Brasil. Apenas R$ 1,50 por número.
            </p>

            <div className="grid grid-cols-3 gap-4 mb-10">
              {[
                ["04", "Dias"],
                ["18", "Horas"],
                ["42", "Minutos"],
              ].map(([valor, rotulo]) => (
                <div key={rotulo} className="p-4 border border-border rounded-2xl">
                  <div className="font-display text-3xl">{valor}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {rotulo}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 mb-8">
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                <span>Progresso de Vendas</span>
                <span className="text-primary">82% Vendido</span>
              </div>
              <div className="h-4 w-full bg-sold rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[82%]" />
              </div>
            </div>
          </div>

          <div className="animate-reveal [animation-delay:150ms] relative">
            <img
              src={premioPorsche}
              alt="Porsche 911 Carrera S branco, prêmio principal da rifa"
              width={1200}
              height={1200}
              className="w-full aspect-square object-cover bg-sold rounded-[2rem] ring-1 ring-border"
            />
            <div className="absolute -bottom-6 -right-6 bg-card p-6 shadow-2xl rounded-3xl border border-border hidden md:block">
              <div className="text-xs text-muted-foreground uppercase tracking-tighter mb-1">
                Valor do Bilhete
              </div>
              <div className="font-display text-4xl text-primary">R$ 1,50</div>
            </div>
          </div>
        </div>

        <section className="mt-24 animate-reveal [animation-delay:300ms]">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <h2 className="font-display text-4xl uppercase mb-2">Escolha seus Números</h2>
              <p className="text-muted-foreground">Clique nos números para selecionar sua sorte.</p>
            </div>
            <div className="flex gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                <div className="size-4 rounded bg-surface border border-border" /> Livre
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                <div className="size-4 rounded bg-sold" /> Vendido
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                <div className="size-4 rounded bg-primary" /> Selecionado
              </div>
            </div>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
            {Array.from({ length: visiveis }, (_, i) => i + 1).map((n) => {
              const vendido = VENDIDOS.has(n);
              const escolhido = selecionados.includes(n);
              return (
                <button
                  key={n}
                  onClick={() => alternar(n)}
                  disabled={vendido}
                  aria-pressed={escolhido}
                  className={
                    vendido
                      ? "aspect-square bg-sold text-muted-foreground/40 font-mono text-xs rounded-lg cursor-not-allowed flex items-center justify-center"
                      : escolhido
                        ? "aspect-square bg-primary text-primary-foreground font-mono text-xs rounded-lg flex items-center justify-center shadow-lg shadow-primary/20"
                        : "aspect-square bg-surface border border-border hover:border-primary transition-colors font-mono text-xs rounded-lg flex items-center justify-center"
                  }
                >
                  {formatarNumero(n)}
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setVisiveis((v) => v + 60)}
              className="text-xs font-bold uppercase tracking-widest text-primary border-b border-primary/20 pb-1 hover:border-primary transition-colors"
            >
              Carregar mais números
            </button>
          </div>
        </section>

        <section className="mt-32 grid md:grid-cols-2 gap-16 border-t border-border pt-16">
          <div>
            <h3 className="font-display text-2xl uppercase mb-6">Regras do Sorteio</h3>
            <ul className="space-y-4">
              {[
                "O sorteio será realizado com base no resultado da Loteria Federal do dia 25/08/2026.",
                "Números reservados têm 30 minutos para confirmação do pagamento via PIX.",
                "O prêmio será entregue sem custos em qualquer capital brasileira.",
              ].map((regra, i) => (
                <li key={regra} className="flex gap-3 text-sm">
                  <span className="text-primary font-mono">{formatarNumero(i + 1).slice(1)}/</span>
                  <span>{regra}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-display text-2xl uppercase mb-6">Dúvidas Frequentes</h3>
            <div className="space-y-6">
              <details className="group cursor-pointer">
                <summary className="list-none font-bold text-sm flex justify-between items-center">
                  Como recebo meu prêmio?
                  <span className="text-primary group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="text-muted-foreground text-sm mt-3">
                  Entramos em contato via telefone cadastrado logo após a apuração oficial para
                  agendar a entrega presencial.
                </p>
              </details>
              <details className="group cursor-pointer">
                <summary className="list-none font-bold text-sm flex justify-between items-center">
                  É seguro participar?
                  <span className="text-primary group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="text-muted-foreground text-sm mt-3">
                  Sim, todos os nossos sorteios são auditados e utilizam a extração da Loteria
                  Federal para garantir total transparência.
                </p>
              </details>
            </div>
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-foreground text-background p-4 z-50 border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.3)] animate-reveal">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-background/50">
              Selecionados:{" "}
              <span className="text-background font-mono">
                {selecionados.length > 0
                  ? selecionados.map(formatarNumero).join(" ")
                  : "nenhum"}
              </span>
            </span>
            <span className="text-xl font-display uppercase tracking-tight">
              Total {moeda(total)}
            </span>
          </div>
          <button
            disabled={selecionados.length === 0}
            className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            Finalizar Compra
          </button>
        </div>
      </div>
    </div>
  );
}
