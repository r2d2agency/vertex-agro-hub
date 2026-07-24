import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/vertex/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { listAudit } from "@/lib/auditoria.functions";

export const Route = createFileRoute("/_authenticated/auditoria")({
  head: () => ({ meta: [
    { title: "Auditoria — Vertex Agro" },
    { name: "description", content: "Trilha imutável de ações executadas na plataforma." },
    { name: "robots", content: "noindex" },
  ] }),
  component: AuditoriaPage,
});

function AuditoriaPage() {
  const { companyId, companies, isLoading, setCompanyId } = useSelectedCompany();
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: rows = [], isLoading: loading } = useQuery({
    queryKey: ["audit", companyId, entity, action, from, to],
    queryFn: () => listAudit(companyId!, { entity: entity || undefined, action: action || undefined, from: from || undefined, to: to || undefined, limit: 300 }),
    enabled: !!companyId,
  });

  return (
    <div className="grid gap-6">
      <PageHeader title="Auditoria" description="Rastro imutável de tudo o que acontece no sistema." />
      <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />
      {!isLoading && companies.length === 0 && <NoCompanyCard />}

      {companyId && (
        <Card>
          <CardContent className="grid gap-3 p-4 md:grid-cols-5">
            <div className="grid gap-1"><Label>Entidade</Label><Input value={entity} onChange={(e) => setEntity(e.target.value)} placeholder="ex: farm" /></div>
            <div className="grid gap-1"><Label>Ação</Label><Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="ex: update" /></div>
            <div className="grid gap-1"><Label>De</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div className="grid gap-1"><Label>Até</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            <div className="grid items-end"><Button variant="outline" onClick={() => { setEntity(""); setAction(""); setFrom(""); setTo(""); }}>Limpar</Button></div>
          </CardContent>
        </Card>
      )}

      {companyId && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3">Quando</th>
                    <th className="p-3">Ação</th>
                    <th className="p-3">Entidade</th>
                    <th className="p-3">Usuário</th>
                    <th className="p-3">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Carregando…</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Nenhum registro.</td></tr>
                  ) : rows.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-3 whitespace-nowrap">{new Date(r.createdAt).toLocaleString("pt-BR")}</td>
                      <td className="p-3"><Badge variant="outline">{r.action}</Badge></td>
                      <td className="p-3">{r.entity}{r.entityId ? ` · ${r.entityId.slice(0, 8)}…` : ""}</td>
                      <td className="p-3 text-muted-foreground">{r.userId ? r.userId.slice(0, 8) + "…" : "—"}</td>
                      <td className="p-3 text-muted-foreground">{r.ip ?? "—"}</td>
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
