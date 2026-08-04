import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  TreeDeciduous, Users, Truck, Wrench, MapPin, 
  History, Camera, ClipboardCheck, AlertTriangle, Droplets
} from "lucide-react";
import { listPlots } from "@/lib/talhoes.functions";
import { listFarmTeam } from "@/lib/people.functions";
import { listMachines, listImplements } from "@/lib/frota.functions";
import { listPhotos } from "@/lib/fotografias.functions";
import { listOccurrences } from "@/lib/ocorrencias.functions";
import { listTappingRecords } from "@/lib/sangrias.functions";
import { listConsultations } from "@/lib/consultor.functions";
import type { Farm } from "@/lib/fazendas.functions";

const ROLE_LABEL: Record<string, string> = {
  monitor: "Monitor",
  consultor: "Consultor",
  sangrador: "Sangrador",
  supervisor: "Supervisor",
  gestor: "Gestor",
};

export function FarmDetailDialog({
  farm, companyId, onOpenChange,
}: {
  farm: Farm | null;
  companyId: string | null;
  onOpenChange: (o: boolean) => void;
}) {
  const open = !!farm && !!companyId;

  const plots = useQuery({
    queryKey: ["farm-detail-plots", farm?.id],
    queryFn: () => listPlots(companyId!, farm!.id),
    enabled: open,
  });
  const team = useQuery({
    queryKey: ["farm-detail-team", farm?.id],
    queryFn: () => listFarmTeam(farm!.id, companyId!, false),
    enabled: open,
  });
  const machines = useQuery({
    queryKey: ["farm-detail-machines", farm?.id],
    queryFn: () => listMachines(companyId!, { farmId: farm!.id }),
    enabled: open,
  });
  const implementsQ = useQuery({
    queryKey: ["farm-detail-implements", farm?.id],
    queryFn: () => listImplements(companyId!, farm!.id),
    enabled: open,
  });
  const photos = useQuery({
    queryKey: ["farm-detail-photos", farm?.id],
    queryFn: () => listPhotos(companyId!, { farmId: farm!.id }),
    enabled: open,
  });
  const occurrences = useQuery({
    queryKey: ["farm-detail-occurrences", farm?.id],
    queryFn: () => listOccurrences(companyId!, { farmId: farm!.id }),
    enabled: open,
  });
  const visits = useQuery({
    queryKey: ["farm-detail-visits", farm?.id],
    queryFn: () => listConsultations(companyId!, { farmId: farm!.id }),
    enabled: open,
  });
  const tapping = useQuery({
    queryKey: ["farm-detail-tapping", farm?.id],
    queryFn: () => listTappingRecords(companyId!, { farmId: farm!.id }),
    enabled: open,
  });


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TreeDeciduous className="h-5 w-5 text-primary" />
            {farm?.name}
            {farm?.code && <span className="font-mono text-xs text-muted-foreground">({farm.code})</span>}
          </DialogTitle>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1">
            {farm?.regional && <span>Regional: {farm.regional.name}</span>}
            {(farm?.city || farm?.state) && <span>{farm?.city}{farm?.state ? ` / ${farm?.state}` : ""}</span>}
            {farm?.totalAreaHa != null && <span>{farm.totalAreaHa} ha</span>}
            {farm?.owner && <span>Proprietário: {farm.owner}</span>}
          </div>
        </DialogHeader>

        <Tabs defaultValue="prontuario" className="mt-2">
          <TabsList className="grid grid-cols-7 w-full overflow-x-auto h-auto p-1 bg-muted/50">
            <TabsTrigger value="prontuario" className="py-2">
              <History className="mr-1.5 h-3.5 w-3.5" /> Prontuário
            </TabsTrigger>
            <TabsTrigger value="talhoes" className="py-2">
              <TreeDeciduous className="mr-1.5 h-3.5 w-3.5" /> Talhões
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{plots.data?.length ?? 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="equipe" className="py-2">
              <Users className="mr-1.5 h-3.5 w-3.5" /> Equipe
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{team.data?.length ?? 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="frota" className="py-2">
              <Truck className="mr-1.5 h-3.5 w-3.5" /> Frota
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{(machines.data?.length ?? 0) + (implementsQ.data?.length ?? 0)}</Badge>
            </TabsTrigger>
            <TabsTrigger value="fotos" className="py-2">
              <Camera className="mr-1.5 h-3.5 w-3.5" /> Fotos
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{photos.data?.length ?? 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="visitas" className="py-2">
              <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" /> Visitas
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{visits.data?.length ?? 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="ocorrencias" className="py-2 text-destructive">
              <AlertTriangle className="mr-1.5 h-3.5 w-3.5" /> Ocorrências
              <Badge variant="destructive" className="ml-1 text-[10px] px-1.5">{occurrences.data?.length ?? 0}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="prontuario" className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border bg-card p-4">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  <Droplets className="h-4 w-4 text-primary" /> Resumo de Operação
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Última Sangria:</span>
                    <span className="font-medium">{tapping.data?.[0] ? new Date(tapping.data[0].date).toLocaleDateString("pt-BR") : "N/D"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Monitor Responsável:</span>
                    <span className="font-medium">{team.data?.find(m => m.role === 'monitor')?.user?.fullName || "Não alocado"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Consultor Técnico:</span>
                    <span className="font-medium">{team.data?.find(m => m.role === 'consultor')?.user?.fullName || "Não alocado"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total de Sangradores:</span>
                    <span className="font-medium">{team.data?.filter(m => m.role === 'sangrador').length || 0} ativos</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  <History className="h-4 w-4 text-primary" /> Histórico Recente
                </h3>
                <div className="space-y-3">
                  {visits.data?.slice(0, 3).map(v => (
                    <div key={v.id} className="text-xs flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                      <div>
                        <p className="font-semibold text-primary">Visita Técnica</p>
                        <p className="text-muted-foreground">{new Date(v.conductedAt).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <Badge variant="outline" className="text-[9px]">Qualidade: {v.tappingQuality}/5</Badge>
                    </div>
                  ))}
                  {!visits.data?.length && <p className="text-xs text-muted-foreground text-center py-2 italic">Sem histórico de visitas.</p>}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-destructive mb-3">
                <AlertTriangle className="h-4 w-4" /> Alertas Críticos
              </h3>
              {occurrences.data?.filter(o => o.severity === 'alta' || o.severity === 'critica').length ? (
                <div className="space-y-2">
                  {occurrences.data?.filter(o => o.severity === 'alta' || o.severity === 'critica').slice(0, 3).map(o => (
                    <div key={o.id} className="text-xs flex items-center justify-between bg-background p-2 rounded border border-destructive/10">
                      <span className="font-bold">{o.title}</span>
                      <Badge variant="destructive" className="text-[9px]">{o.type}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Nenhum alerta crítico ativo.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="talhoes" className="mt-4">
            {plots.isLoading ? <Empty text="Carregando..." /> : !plots.data?.length ? <Empty text="Nenhum talhão cadastrado nesta fazenda." /> : (
              <div className="grid gap-2 md:grid-cols-2">
                {plots.data.map((p) => (
                  <div key={p.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{p.name}</p>
                      {p.code && <span className="font-mono text-xs text-muted-foreground">{p.code}</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {p.areaHa != null && <span>{p.areaHa} ha</span>}
                      {p.cloneName && <span>Clone: {p.cloneName}</span>}
                      {p.plantingYear && <span>Plantio: {p.plantingYear}</span>}
                      {p.treeCount != null && <span>{p.treeCount} árvores</span>}
                      {p.tappingSystem && <span>Sistema: {p.tappingSystem}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="equipe" className="mt-4">
            {team.isLoading ? <Empty text="Carregando..." /> : !team.data?.length ? <Empty text="Nenhum colaborador vinculado a esta fazenda." /> : (
              <div className="grid gap-2">
                {team.data.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{a.user?.fullName || a.user?.email || "—"}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.user?.email}
                        {a.consultor && <> · Consultor: {a.consultor.fullName || a.consultor.email}</>}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge>{ROLE_LABEL[a.role] || a.role}</Badge>
                      <span className="text-[11px] text-muted-foreground">desde {new Date(a.startAt).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="maquinas" className="mt-4">
            {machines.isLoading ? <Empty text="Carregando..." /> : !machines.data?.length ? <Empty text="Nenhuma máquina alocada a esta fazenda." /> : (
              <div className="grid gap-2 md:grid-cols-2">
                {machines.data.map((m) => (
                  <div key={m.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold truncate">{m.name}</p>
                      <Badge variant="outline">{m.status}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      <span>{m.category}</span>
                      {m.brand && <span>{m.brand}{m.model ? ` ${m.model}` : ""}</span>}
                      {m.plate && <span className="font-mono">{m.plate}</span>}
                      {m.year && <span>{m.year}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="implementos" className="mt-4">
            {implementsQ.isLoading ? <Empty text="Carregando..." /> : !implementsQ.data?.length ? <Empty text="Nenhum implemento vinculado a esta fazenda." /> : (
              <div className="grid gap-2 md:grid-cols-2">
                {implementsQ.data.map((i) => (
                  <div key={i.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold truncate">{i.name}</p>
                      <Badge variant="outline">{i.status}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      <span>{i.category}</span>
                      {i.brand && <span>{i.brand}{i.model ? ` ${i.model}` : ""}</span>}
                      {i.patrimony && <span>Pat.: {i.patrimony}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {farm?.latitude != null && farm.longitude != null && (
          <p className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {farm.latitude.toFixed(6)}, {farm.longitude.toFixed(6)}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">{text}</div>;
}
