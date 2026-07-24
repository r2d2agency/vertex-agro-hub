import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/vertex/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { listSessions, syncHealth } from "@/lib/sync.functions";
import { RefreshCw, Smartphone } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sincronizacao")({
  head: () => ({ meta: [
    { title: "Sincronização — Vertex Agro" },
    { name: "description", content: "Monitoramento das sessões de sincronização offline." },
    { name: "robots", content: "noindex" },
  ] }),
  component: SyncPage,
});

function SyncPage() {
  const { companyId, companies, isLoading, setCompanyId } = useSelectedCompany();

  const { data: health } = useQuery({
    queryKey: ["sync-health", companyId],
    queryFn: () => syncHealth(companyId!),
    enabled: !!companyId,
    refetchInterval: 15000,
  });
  const { data: sessions = [] } = useQuery({
    queryKey: ["sync-sessions", companyId],
    queryFn: () => listSessions(companyId!, { limit: 100 }),
    enabled: !!companyId,
  });

  return (
    <div className="grid gap-6">
      <PageHeader title="Sincronização" description="Sessões de sync e saúde dos dispositivos de campo." />
      <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />
      {!isLoading && companies.length === 0 && <NoCompanyCard />}

      {companyId && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Sessões (24h)</CardTitle></CardHeader>
            <CardContent className="text-3xl font-semibold">{health?.last24h.sessions ?? 0}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Conflitos (24h)</CardTitle></CardHeader>
            <CardContent className="text-3xl font-semibold">{health?.last24h.conflicts ?? 0}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Dispositivos ativos</CardTitle></CardHeader>
            <CardContent className="text-3xl font-semibold">{health?.activeDevices.length ?? 0}</CardContent>
          </Card>
        </div>
      )}

      {companyId && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Smartphone className="h-4 w-4" /> Dispositivos</CardTitle></CardHeader>
          <CardContent className="grid gap-2">
            {(health?.activeDevices ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum dispositivo sincronizou ainda.</p>
            ) : (health?.activeDevices ?? []).map((d) => (
              <div key={d.deviceId} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div className="font-mono">{d.deviceId}</div>
                <div className="text-muted-foreground">Último sync: {new Date(d.lastSync).toLocaleString("pt-BR")}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {companyId && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Sessões recentes</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr><th className="p-3">Início</th><th className="p-3">Fim</th><th className="p-3">Dispositivo</th><th className="p-3">Pull</th><th className="p-3">Push</th><th className="p-3">Conflitos</th></tr>
                </thead>
                <tbody>
                  {sessions.length === 0 ? (
                    <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhuma sessão registrada.</td></tr>
                  ) : sessions.map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="p-3 whitespace-nowrap">{new Date(s.startedAt).toLocaleString("pt-BR")}</td>
                      <td className="p-3 whitespace-nowrap">{s.finishedAt ? new Date(s.finishedAt).toLocaleString("pt-BR") : <Badge variant="outline">em curso</Badge>}</td>
                      <td className="p-3 font-mono text-xs">{s.deviceId}</td>
                      <td className="p-3">{s.pulled}</td>
                      <td className="p-3">{s.pushed}</td>
                      <td className="p-3">{s.conflicts > 0 ? <Badge variant="destructive">{s.conflicts}</Badge> : s.conflicts}</td>
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
