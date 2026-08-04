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

        <Tabs defaultValue="talhoes" className="mt-2">
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="talhoes">
              <TreeDeciduous className="mr-1 h-4 w-4" /> Talhões
              <Badge variant="secondary" className="ml-2">{plots.data?.length ?? 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="equipe">
              <Users className="mr-1 h-4 w-4" /> Equipe
              <Badge variant="secondary" className="ml-2">{team.data?.length ?? 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="maquinas">
              <Truck className="mr-1 h-4 w-4" /> Máquinas
              <Badge variant="secondary" className="ml-2">{machines.data?.length ?? 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="implementos">
              <Wrench className="mr-1 h-4 w-4" /> Implementos
              <Badge variant="secondary" className="ml-2">{implementsQ.data?.length ?? 0}</Badge>
            </TabsTrigger>
          </TabsList>

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
