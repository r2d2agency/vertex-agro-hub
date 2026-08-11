import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  TreeDeciduous, Users, Truck, Wrench, MapPin, 
  History, Camera, ClipboardCheck, AlertTriangle, Droplets,
  Search, MessageSquare, Image as ImageIcon, Video, Mic, Calendar,
  MoreVertical, CheckCircle2, Map as MapIcon
} from "lucide-react";
import { listPlots } from "@/lib/talhoes.functions";
import { listFarmTeam } from "@/lib/people.functions";
import { listMachines, listImplements } from "@/lib/frota.functions";
import { listPhotos } from "@/lib/fotografias.functions";
import { listOccurrences } from "@/lib/ocorrencias.functions";
import { listTappingRecords } from "@/lib/sangrias.functions";
import { listConsultations } from "@/lib/consultor.functions";
import { listDeliveries } from "@/lib/producao.functions";
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
  const deliveries = useQuery({
    queryKey: ["farm-detail-deliveries", farm?.id],
    queryFn: () => listDeliveries(companyId!, { farmId: farm!.id }),
    enabled: open,
  });

  const [searchDate, setSearchDate] = useState("");

  const timelineEvents = useMemo(() => {
    if (!open) return [];
    
    const events: any[] = [];

    // Photos
    photos.data?.forEach(p => events.push({
      id: p.id,
      date: new Date(p.takenAt),
      type: 'photo',
      content: p,
      category: p.category,
      label: 'Fotografia'
    }));

    // Occurrences
    occurrences.data?.forEach(o => events.push({
      id: o.id,
      date: new Date(o.date),
      type: 'occurrence',
      content: o,
      label: 'Ocorrência'
    }));

    // Visits (Consultations)
    visits.data?.forEach(v => events.push({
      id: v.id,
      date: new Date(v.conductedAt),
      type: 'visit',
      content: v,
      label: 'Visita Técnica'
    }));

    // Production (Deliveries)
    deliveries.data?.forEach(d => events.push({
      id: d.id,
      date: new Date(d.deliveryDate),
      type: 'delivery',
      content: d,
      label: 'Entrega de Produção'
    }));

    // Tapping
    tapping.data?.forEach(t => events.push({
      id: t.id,
      date: new Date(t.date),
      type: 'tapping',
      content: t,
      label: 'Sangria'
    }));

    // Sort descending
    events.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Filter by date if search exists
    if (searchDate) {
      return events.filter(e => e.date.toLocaleDateString('pt-BR').includes(searchDate));
    }

    // Group by date
    const grouped: Record<string, any[]> = {};
    events.forEach(e => {
      const day = e.date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(e);
    });

    return grouped;
  }, [photos.data, occurrences.data, visits.data, deliveries.data, tapping.data, searchDate, open]);


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

          <TabsContent value="prontuario" className="mt-4 space-y-6">
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-2 border-b mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Pesquisar por data (ex: 04/08)..." 
                  value={searchDate}
                  onChange={e => setSearchDate(e.target.value)}
                  className="pl-10 bg-muted/30 border-none rounded-full h-10"
                />
              </div>
            </div>

            <div className="flex flex-col gap-8 max-w-2xl mx-auto pb-10">
              {Object.entries(timelineEvents).map(([day, items]: [string, any]) => (
                <div key={day} className="space-y-4">
                  <div className="flex justify-center sticky top-14 z-10">
                    <span className="bg-muted text-muted-foreground text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                      {day}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {items.map((event: any) => (
                      <div key={event.id} className={`flex ${event.type === 'occurrence' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm border ${
                          event.type === 'occurrence' 
                            ? 'bg-destructive/10 border-destructive/20 rounded-tl-none' 
                            : event.type === 'visit'
                            ? 'bg-primary/10 border-primary/20 rounded-tr-none'
                            : 'bg-card border-border rounded-tr-none'
                        }`}>
                          <div className="flex items-center justify-between gap-4 mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-tighter opacity-70 flex items-center gap-1">
                              {event.type === 'photo' && <ImageIcon className="h-3 w-3" />}
                              {event.type === 'occurrence' && <AlertTriangle className="h-3 w-3" />}
                              {event.type === 'visit' && <ClipboardCheck className="h-3 w-3" />}
                              {event.type === 'delivery' && <Truck className="h-3 w-3" />}
                              {event.type === 'tapping' && <Droplets className="h-3 w-3" />}
                              {event.label}
                            </span>
                            <span className="text-[10px] opacity-50">
                              {event.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {event.type === 'photo' && (
                            <div className="space-y-2">
                              <div className="aspect-video rounded-lg overflow-hidden border bg-muted group relative">
                                <img src={event.content.url} className="w-full h-full object-cover" />
                                <div className="absolute top-2 right-2 flex gap-1">
                                  <Badge className="text-[8px] bg-black/60 backdrop-blur border-none">{event.content.category}</Badge>
                                </div>
                              </div>
                              {event.content.caption && <p className="text-sm">{event.content.caption}</p>}
                              {(event.content.latitude || event.content.longitude) && (
                                <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                                  <MapPin className="h-2.5 w-2.5" />
                                  {event.content.latitude?.toFixed(4)}, {event.content.longitude?.toFixed(4)}
                                </div>
                              )}
                            </div>
                          )}

                          {event.type === 'occurrence' && (
                            <div className="space-y-1">
                              <p className="font-bold text-sm">{event.content.title}</p>
                              <p className="text-xs opacity-80">{event.content.description}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="destructive" className="text-[8px] uppercase">{event.content.severity}</Badge>
                                <Badge variant="outline" className="text-[8px] uppercase bg-background/50">{event.content.type}</Badge>
                              </div>
                            </div>
                          )}

                          {event.type === 'visit' && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold">Qualidade da Sangria</span>
                                <div className="flex gap-0.5">
                                  {[1,2,3,4,5].map(s => (
                                    <div key={s} className={`h-1 w-3 rounded-full ${s <= event.content.tappingQuality ? 'bg-primary' : 'bg-muted'}`} />
                                  ))}
                                </div>
                              </div>
                              <p className="text-sm italic">"{event.content.recommendations}"</p>
                              <div className="flex items-center gap-2 text-[10px] opacity-70">
                                <CheckCircle2 className="h-3 w-3" />
                                Sanitário: {event.content.sanitaryState}
                              </div>
                            </div>
                          )}

                          {event.type === 'delivery' && (
                            <div className="space-y-1">
                              <p className="text-sm font-bold">{event.content.netWeightKg}kg de Borracha</p>
                              <p className="text-xs opacity-70">Tipo: {event.content.latexType || 'N/D'}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-[8px]">{event.content.status}</Badge>
                              </div>
                            </div>
                          )}

                          {event.type === 'tapping' && (
                            <div className="space-y-1">
                              <p className="text-sm">Registro de Sangria no talhão</p>
                              <p className="text-xs opacity-70">Executado conforme cronograma</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {!Object.keys(timelineEvents).length && (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mb-3 opacity-20" />
                  <p className="text-sm italic">Nenhuma atividade registrada.</p>
                </div>
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

          <TabsContent value="frota" className="mt-4 space-y-4">
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Truck className="h-4 w-4" /> Máquinas alocadas
              </h3>
              {machines.isLoading ? <Empty text="Carregando..." /> : !machines.data?.length ? <Empty text="Nenhuma máquina alocada." /> : (
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
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 pt-2">
                <Wrench className="h-4 w-4" /> Implementos
              </h3>
              {implementsQ.isLoading ? <Empty text="Carregando..." /> : !implementsQ.data?.length ? <Empty text="Nenhum implemento vinculado." /> : (
                <div className="grid gap-2 md:grid-cols-2">
                  {implementsQ.data.map((i) => (
                    <div key={i.id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold truncate">{i.name}</p>
                        <Badge variant="outline">{i.status}</Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        <span>{i.category}</span>
                        {i.patrimony && <span>Pat.: {i.patrimony}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="fotos" className="mt-4">
            {photos.isLoading ? <Empty text="Carregando galeria..." /> : !photos.data?.length ? <Empty text="Nenhuma foto registrada nesta fazenda." /> : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {photos.data.map((p) => (
                  <div key={p.id} className="group relative aspect-square rounded-lg border overflow-hidden bg-muted">
                    <img src={p.url} alt={p.caption || 'Foto de campo'} className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                      <p className="text-[9px] text-white font-medium truncate">{p.category}</p>
                      <p className="text-[8px] text-white/80">{new Date(p.takenAt).toLocaleDateString("pt-BR")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="visitas" className="mt-4">
            {visits.isLoading ? <Empty text="Carregando visitas..." /> : !visits.data?.length ? <Empty text="Nenhuma visita técnica registrada." /> : (
              <div className="space-y-3">
                {visits.data.map((v) => (
                  <div key={v.id} className="rounded-xl border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{new Date(v.conductedAt).toLocaleDateString("pt-BR")}</Badge>
                        <span className="text-xs font-bold uppercase text-primary">Visita Técnica</span>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <div key={s} className={`h-1.5 w-4 rounded-full ${s <= v.tappingQuality ? 'bg-primary' : 'bg-muted'}`} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Estado Fitossanitário: <span className="text-foreground">{v.sanitaryState}</span></p>
                      <p className="text-sm italic text-foreground">"{v.recommendations}"</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="visitas" className="mt-4">
            {visits.isLoading ? <Empty text="Carregando visitas..." /> : !visits.data?.length ? <Empty text="Nenhuma visita técnica registrada." /> : (
              <div className="space-y-4">
                {visits.data.map((v) => (
                  <div key={v.id} className="rounded-xl border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold">{v.consultor?.fullName || v.consultor?.email}</p>
                      <span className="text-xs text-muted-foreground">{new Date(v.conductedAt).toLocaleDateString("pt-BR")}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">Qualidade da Sangria</span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <div key={s} className={`h-1 w-3 rounded-full ${s <= v.tappingQuality ? 'bg-primary' : 'bg-muted'}`} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Estado Fitossanitário: <span className="text-foreground">{v.sanitaryState}</span></p>
                      <p className="text-sm italic text-foreground">"{v.recommendations}"</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ocorrencias" className="mt-4">
            {occurrences.isLoading ? <Empty text="Carregando ocorrências..." /> : !occurrences.data?.length ? <Empty text="Nenhuma ocorrência registrada." /> : (
              <div className="space-y-2">
                {occurrences.data.map((o) => (
                  <div key={o.id} className={`rounded-xl border p-4 flex items-center justify-between ${o.status === 'resolvida' ? 'opacity-60 bg-muted/20' : ''}`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={o.severity === 'critica' || o.severity === 'alta' ? 'destructive' : 'secondary'} className="text-[10px] uppercase">
                          {o.severity}
                        </Badge>
                        <p className="text-sm font-bold">{o.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{o.type} · Reportado em {new Date(o.date).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">{o.status.replace('_', ' ')}</Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="fotos" className="mt-4">
            {photos.isLoading ? (
              <Empty text="Carregando galeria..." />
            ) : !photos.data?.length ? (
              <Empty text="Nenhuma foto georreferenciada registrada nesta fazenda." />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {photos.data.map((p: any) => (
                  <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted shadow-sm">
                    <img src={p.url} alt={p.category} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <p className="text-[10px] font-bold text-white uppercase">{p.category}</p>
                      <p className="text-[9px] text-white/80">{new Date(p.takenAt).toLocaleDateString('pt-BR')}</p>
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
