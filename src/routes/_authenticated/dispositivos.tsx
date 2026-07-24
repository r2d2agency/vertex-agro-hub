import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Smartphone, CheckCircle2, AlertTriangle, RefreshCcw } from "lucide-react";
import { PageHeader } from "@/components/vertex/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { listFarms } from "@/lib/fazendas.functions";
import { listPlots } from "@/lib/talhoes.functions";
import { listTappingRecords } from "@/lib/sangrias.functions";

export const Route = createFileRoute("/_authenticated/dispositivos")({
  head: () => ({
    meta: [
      { title: "Dispositivos — Vertex Agro" },
      { name: "description", content: "Dispositivos que sincronizaram dados com a plataforma." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DevicesPage,
});

type DeviceRow = {
  deviceId: string;
  farms: number;
  plots: number;
  tappings: number;
  pending: number;
  conflicts: number;
  lastSeen: string | null;
};

function DevicesPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();

  const farms = useQuery({ queryKey: ["farms", companyId], queryFn: () => listFarms(companyId!), enabled: !!companyId });
  const plots = useQuery({ queryKey: ["plots", companyId], queryFn: () => listPlots(companyId!), enabled: !!companyId });
  const taps = useQuery({ queryKey: ["tapping-records", companyId], queryFn: () => listTappingRecords(companyId!), enabled: !!companyId });

  const rows = useMemo<DeviceRow[]>(() => {
    const map = new Map<string, DeviceRow>();
    const bump = (deviceId: string | null | undefined, kind: "farms" | "plots" | "tappings", updatedAt?: string | null, status?: string | null) => {
      const id = deviceId?.trim() || "web-admin";
      const cur = map.get(id) ?? { deviceId: id, farms: 0, plots: 0, tappings: 0, pending: 0, conflicts: 0, lastSeen: null };
      cur[kind] += 1;
      if (status === "pending") cur.pending += 1;
      if (status === "conflict") cur.conflicts += 1;
      if (updatedAt && (!cur.lastSeen || updatedAt > cur.lastSeen)) cur.lastSeen = updatedAt;
      map.set(id, cur);
    };
    for (const f of farms.data ?? []) bump((f as any).deviceId ?? (f as any).device_id, "farms", (f as any).updatedAt ?? (f as any).updated_at, (f as any).syncStatus ?? (f as any).sync_status);
    for (const p of plots.data ?? []) bump((p as any).deviceId ?? (p as any).device_id, "plots", (p as any).updatedAt ?? (p as any).updated_at, (p as any).syncStatus ?? (p as any).sync_status);
    for (const t of taps.data ?? []) bump((t as any).deviceId ?? (t as any).device_id, "tappings", (t as any).updatedAt ?? (t as any).updated_at ?? (t as any).date, (t as any).syncStatus ?? (t as any).sync_status);
    return Array.from(map.values()).sort((a, b) => (b.lastSeen ?? "").localeCompare(a.lastSeen ?? ""));
  }, [farms.data, plots.data, taps.data]);

  const loading = farms.isLoading || plots.isLoading || taps.isLoading;

  return (
    <div>
      <PageHeader
        title="Dispositivos"
        description="Dispositivos que enviaram dados para esta empresa. Cada aparelho recebe um device_id único ao instalar o app."
      />

      {!isLoading && companies.length === 0 ? (
        <NoCompanyCard />
      ) : (
        <>
          <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />

          {loading ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Carregando...</CardContent></Card>
          ) : rows.length === 0 ? (
            <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
              Nenhum dispositivo registrou dados ainda.
            </CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {rows.map((d) => (
                <Card key={d.deviceId}>
                  <CardContent className="flex flex-wrap items-center gap-4 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-sm font-semibold">{d.deviceId}</p>
                      <p className="text-xs text-muted-foreground">
                        Última sincronização: {d.lastSeen ? new Date(d.lastSeen).toLocaleString("pt-BR") : "—"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline">{d.farms} fazendas</Badge>
                      <Badge variant="outline">{d.plots} talhões</Badge>
                      <Badge variant="outline">{d.tappings} sangrias</Badge>
                    </div>
                    <div className="flex gap-1">
                      {d.conflicts > 0 ? (
                        <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{d.conflicts} conflito(s)</Badge>
                      ) : d.pending > 0 ? (
                        <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/20 gap-1"><RefreshCcw className="h-3 w-3" />{d.pending} pendente(s)</Badge>
                      ) : (
                        <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 gap-1"><CheckCircle2 className="h-3 w-3" />sincronizado</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <p className="mt-4 text-xs text-muted-foreground">
            Fonte: campos <code>device_id</code>, <code>sync_status</code> e <code>updated_at</code> das entidades sincronizadas. Registros criados no painel web aparecem como <code>web-admin</code>.
          </p>
        </>
      )}
    </div>
  );
}
