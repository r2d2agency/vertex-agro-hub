import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { getFieldMe, type FieldMe } from "@/lib/field.functions";

export const Route = createFileRoute("/campo/historico")({ component: HistoricoPage });

type Entry = { id: string; time: string; kind: string; title: string; sub: string };

const KIND_STYLE: Record<string, string> = {
  sangria: "bg-primary/15 text-primary",
  producao: "bg-chart-2/20 text-chart-2",
  estimulacao: "bg-chart-3/20 text-chart-3",
  ocorrencia: "bg-destructive/15 text-destructive",
  atividade: "bg-warning/20 text-warning",
};

const TABS = ["tudo", "sangria", "producao", "estimulacao"] as const;
type Tab = typeof TABS[number];
const LABEL: Record<Tab, string> = { tudo: "Tudo", sangria: "Sangrias", producao: "Produção", estimulacao: "Estimulações" };

function HistoricoPage() {
  const [me, setMe] = useState<FieldMe | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("tudo");

  useEffect(() => {
    (async () => {
      try {
        const m = await getFieldMe();
        setMe(m);
        const cids = m.isAdmin ? m.companies.map((c) => c.id) : Array.from(new Set(m.assignments.map((a) => a.farm.companyId)));
        const all: Entry[] = [];
        for (const cid of cids) {
          try {
            const r = await apiRequest<{ entries: Entry[] }>(`/historico?companyId=${cid}&limit=100`);
            all.push(...r.entries);
          } catch { /* ignore */ }
        }
        setEntries(all);
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, []);

  const grouped = useMemo(() => {
    const f = tab === "tudo" ? entries : entries.filter((e) => e.kind === tab);
    const byDay = new Map<string, Entry[]>();
    for (const e of f) {
      const d = new Date(e.time).toISOString().slice(0, 10);
      if (!byDay.has(d)) byDay.set(d, []);
      byDay.get(d)!.push(e);
    }
    return Array.from(byDay.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries, tab]);

  if (loading || !me) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <h1 className="text-center text-base font-semibold">Histórico</h1>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              tab === t ? "border-primary bg-primary text-primary-foreground" : "border-border/60 text-muted-foreground"
            }`}>
            {LABEL[t]}
          </button>
        ))}
      </div>

      {grouped.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nenhum registro.</p>}

      {grouped.map(([day, list]) => (
        <section key={day}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {new Date(day + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
          </h2>
          <ul className="space-y-2">
            {list.map((e) => (
              <li key={e.id} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-3">
                <div className="w-14 shrink-0 text-sm font-semibold">
                  {new Date(e.time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase ${KIND_STYLE[e.kind] ?? "bg-muted text-muted-foreground"}`}>{e.kind}</span>
                  </div>
                  <div className="truncate text-sm font-medium">{e.title}</div>
                  {e.sub && <div className="truncate text-[11px] text-muted-foreground">{e.sub}</div>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
