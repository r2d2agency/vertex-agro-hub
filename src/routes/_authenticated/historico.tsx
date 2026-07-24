import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { History, Droplets, PackageCheck, AlertTriangle, CalendarClock, FlaskConical, Camera } from "lucide-react";
import { PageHeader } from "@/components/vertex/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { listFarms } from "@/lib/fazendas.functions";
import { listHistory, type HistoryEvent } from "@/lib/historico.functions";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({ meta: [
    { title: "Histórico — Vertex Agro" },
    { name: "description", content: "Linha do tempo de todos os eventos operacionais da empresa." },
    { name: "robots", content: "noindex" },
  ] }),
  component: HistoricoPage,
});

const KIND_META: Record<HistoryEvent["kind"], { label: string; icon: typeof History; color: string }> = {
  sangria:     { label: "Sangria",     icon: Droplets,      color: "bg-blue-500/10 text-blue-700" },
  producao:    { label: "Produção",    icon: PackageCheck,  color: "bg-emerald-500/10 text-emerald-700" },
  ocorrencia:  { label: "Ocorrência",  icon: AlertTriangle, color: "bg-red-500/10 text-red-700" },
  agenda:      { label: "Agenda",      icon: CalendarClock, color: "bg-violet-500/10 text-violet-700" },
  estimulacao: { label: "Estimulação", icon: FlaskConical,  color: "bg-amber-500/10 text-amber-700" },
  fotografia:  { label: "Foto",        icon: Camera,        color: "bg-slate-500/10 text-slate-700" },
};

function HistoricoPage() {
  const { companyId, companies, isLoading, setCompanyId } = useSelectedCompany();
  const [farmFilter, setFarmFilter] = useState<string>("");
  const [kindFilter, setKindFilter] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const { data: farms = [] } = useQuery({
    queryKey: ["farms", companyId],
    queryFn: () => listFarms(companyId!),
    enabled: !!companyId,
  });
  const farmName = useMemo(() => {
    const m = new Map(farms.map((f) => [f.id, f.name]));
    return (id?: string | null) => (id ? m.get(id) ?? "—" : "—");
  }, [farms]);

  const { data: events = [], isLoading: loading } = useQuery({
    queryKey: ["history", companyId, farmFilter, from, to],
    queryFn: () => listHistory(companyId!, {
      farmId: farmFilter || undefined, from: from || undefined, to: to || undefined, limit: 300,
    }),
    enabled: !!companyId,
  });

  const filtered = kindFilter ? events.filter((e) => e.kind === kindFilter) : events;

  const grouped = useMemo(() => {
    const map = new Map<string, HistoryEvent[]>();
    for (const e of filtered) {
      const day = new Date(e.date).toISOString().slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(e);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Histórico"
        description="Linha do tempo unificada dos eventos operacionais."
        icon={History}
      />

      <CompanyPicker value={companyId} onChange={setCompanyId} companies={companies} isLoading={isLoading} />
      {!isLoading && companies.length === 0 && <NoCompanyCard />}

      {companyId && (
        <Card>
          <CardContent className="grid gap-3 p-4 md:grid-cols-5">
            <div className="grid gap-1">
              <Label>Fazenda</Label>
              <Select value={farmFilter || "all"} onValueChange={(v) => setFarmFilter(v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label>Tipo</Label>
              <Select value={kindFilter || "all"} onValueChange={(v) => setKindFilter(v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(KIND_META).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1"><Label>De</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div className="grid gap-1"><Label>Até</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            <div className="grid items-end"><Button variant="outline" onClick={() => { setFarmFilter(""); setKindFilter(""); setFrom(""); setTo(""); }}>Limpar</Button></div>
          </CardContent>
        </Card>
      )}

      {companyId && (
        <Card>
          <CardContent className="p-4">
            {loading ? (
              <p className="text-center text-sm text-muted-foreground">Carregando…</p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">Nenhum evento encontrado no período.</p>
            ) : (
              <div className="grid gap-6">
                {grouped.map(([day, list]) => (
                  <div key={day} className="grid gap-3">
                    <h3 className="text-sm font-semibold text-muted-foreground">
                      {new Date(day + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                    </h3>
                    <ol className="relative grid gap-3 border-l border-border pl-5">
                      {list.map((e) => {
                        const meta = KIND_META[e.kind];
                        const Icon = meta.icon;
                        return (
                          <li key={e.id} className="relative">
                            <span className={`absolute -left-[27px] flex h-6 w-6 items-center justify-center rounded-full ${meta.color}`}>
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <div className="flex flex-wrap items-start justify-between gap-2 rounded-md border bg-card p-3">
                              <div className="grid gap-0.5">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{meta.label}</Badge>
                                  <span className="text-sm font-medium">{e.title}</span>
                                </div>
                                {e.subtitle && <span className="text-xs text-muted-foreground">{e.subtitle}</span>}
                                <span className="text-xs text-muted-foreground">
                                  {new Date(e.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {farmName(e.farmId)}
                                </span>
                              </div>
                              {e.meta?.url && (
                                <img src={e.meta.url as string} alt="" className="h-14 w-14 rounded object-cover" />
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
