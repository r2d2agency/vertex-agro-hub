import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/vertex/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { listLogs } from "@/lib/logs.functions";

export const Route = createFileRoute("/_authenticated/logs")({
  head: () => ({ meta: [
    { title: "Logs — Vertex Agro" },
    { name: "description", content: "Logs técnicos e mensagens do sistema." },
    { name: "robots", content: "noindex" },
  ] }),
  component: LogsPage,
});

const LEVELS: Record<string, string> = { info: "bg-slate-500/10 text-slate-700", warn: "bg-amber-500/10 text-amber-700", warning: "bg-amber-500/10 text-amber-700", error: "bg-red-500/10 text-red-700", debug: "bg-blue-500/10 text-blue-700" };

function LogsPage() {
  const { companyId, companies, isLoading, setCompanyId } = useSelectedCompany();
  const [level, setLevel] = useState("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: rows = [], isLoading: loading } = useQuery({
    queryKey: ["logs", companyId, level, q, from, to],
    queryFn: () => listLogs(companyId!, { level: level || undefined, q: q || undefined, from: from || undefined, to: to || undefined, limit: 300 }),
    enabled: !!companyId,
  });

  return (
    <div className="grid gap-6">
      <PageHeader title="Logs" description="Mensagens técnicas geradas pela plataforma." />
      <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />
      {!isLoading && companies.length === 0 && <NoCompanyCard />}

      {companyId && (
        <Card>
          <CardContent className="grid gap-3 p-4 md:grid-cols-5">
            <div className="grid gap-1">
              <Label>Nível</Label>
              <Select value={level || "all"} onValueChange={(v) => setLevel(v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="info">info</SelectItem>
                  <SelectItem value="warning">warning</SelectItem>
                  <SelectItem value="error">error</SelectItem>
                  <SelectItem value="debug">debug</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1 md:col-span-2"><Label>Busca</Label><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="mensagem…" /></div>
            <div className="grid gap-1"><Label>De</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div className="grid gap-1"><Label>Até</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            <div className="grid items-end md:col-span-5"><Button variant="outline" onClick={() => { setLevel(""); setQ(""); setFrom(""); setTo(""); }}>Limpar</Button></div>
          </CardContent>
        </Card>
      )}

      {companyId && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr><th className="p-3">Quando</th><th className="p-3">Nível</th><th className="p-3">Origem</th><th className="p-3">Mensagem</th></tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Carregando…</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Nenhum log encontrado.</td></tr>
                  ) : rows.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-3 whitespace-nowrap">{new Date(r.createdAt).toLocaleString("pt-BR")}</td>
                      <td className="p-3"><Badge className={LEVELS[r.level] ?? ""} variant="outline">{r.level}</Badge></td>
                      <td className="p-3">{r.source}</td>
                      <td className="p-3">{r.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
