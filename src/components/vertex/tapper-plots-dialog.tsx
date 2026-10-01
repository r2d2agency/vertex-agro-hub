import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/vertex/searchable-select";
import { listFarms } from "@/lib/fazendas.functions";
import { listPlots } from "@/lib/talhoes.functions";
import { listTappingTables } from "@/lib/tabelas.functions";
import { applyTappingTableTemplate, listTappingTableTemplates } from "@/lib/templates.functions";
import { createPlotTableLink, deletePlotTableLink, listPlotTableLinks, updatePlotTableLink } from "@/lib/tappers.functions";

export function TapperPlotsDialog({ open, onOpenChange, companyId, tapperKey, tapperName, farmIds }: {
  open: boolean; onOpenChange: (open: boolean) => void; companyId: string; tapperKey: string; tapperName: string; farmIds: string[];
}) {
  const qc = useQueryClient();
  const [farmId, setFarmId] = useState("");
  const [plotId, setPlotId] = useState("");
  const [tableId, setTableId] = useState("");
  const [treeCount, setTreeCount] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const farms = useQuery({ queryKey: ["farms", companyId], queryFn: () => listFarms(companyId), enabled: open && !!companyId });
  const plots = useQuery({ queryKey: ["plots", companyId, farmId], queryFn: () => listPlots(companyId, farmId), enabled: open && !!farmId });
  const tables = useQuery({ queryKey: ["tapping-tables", companyId], queryFn: () => listTappingTables(companyId), enabled: open && !!companyId });
  const templates = useQuery({ queryKey: ["tapping-table-templates", companyId], queryFn: () => listTappingTableTemplates(companyId), enabled: open && !!companyId });
  const selectedPlots = useMemo(() => plots.data ?? [], [plots.data]);
  const applyTemplate = useMutation({ mutationFn: (templateId: string) => applyTappingTableTemplate({ companyId, tapperKey, farmId, plotId, templateId }), onSuccess: (links: any[]) => { toast.success(`${links?.length ?? 0} tabelas do template foram vinculadas ao talhão`); setExpanded((x) => ({ ...x, [plotId]: true })); qc.invalidateQueries({ queryKey: ["plot-table-links", companyId, tapperKey, plotId] }); }, onError: (e: Error) => toast.error(e.message) });
  const add = useMutation({ mutationFn: () => createPlotTableLink({ companyId, farmId, plotId, tapperKey, tappingTableId: tableId, treeCount: treeCount ? Number(treeCount) : undefined }), onSuccess: () => { toast.success("Tabela vinculada ao talhão"); setTableId(""); setTreeCount(""); qc.invalidateQueries({ queryKey: ["plot-table-links", companyId, tapperKey] }); }, onError: (e: Error) => toast.error(e.message) });
  const remove = useMutation({ mutationFn: ({ id, companyId }: { id: string; companyId: string }) => deletePlotTableLink(id, companyId), onSuccess: () => { toast.success("Vínculo removido"); qc.invalidateQueries({ queryKey: ["plot-table-links", companyId, tapperKey] }); }, onError: (e: Error) => toast.error(e.message) });
  const update = useMutation({ mutationFn: ({ id, active, treeCount, position }: { id: string; active?: boolean; treeCount?: number; position?: number }) => updatePlotTableLink(id, { companyId, active, treeCount, position }), onSuccess: () => qc.invalidateQueries({ queryKey: ["plot-table-links", companyId, tapperKey] }), onError: (e: Error) => toast.error(e.message) });

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
    <DialogHeader><DialogTitle>Talhões e tabelas · {tapperName}</DialogTitle><DialogDescription>Escolha o talhão e a tabela. O monitor depois seleciona só a tabela — o talhão vem junto.</DialogDescription></DialogHeader>
    <div className="space-y-4">
      <div className="rounded-xl border bg-muted/20 p-3 space-y-2"><Label>Adicionar vínculo</Label>
        {/*Fazenda segue como filtro (vem restrita pelo pai). Talhão e tabela
            entram juntos: o vínculo é sempre os três, então perguntar o talhão
            separado só criava uma etapa a mais.*/}
        <div className="grid gap-2 sm:grid-cols-2">
          <SearchableSelect value={farmId} onChange={(v) => { setFarmId(v); setPlotId(""); setTableId(""); }} placeholder="Fazenda vinculada" empty="Nenhuma fazenda vinculada" options={(farms.data ?? []).filter((f: any) => farmIds.includes(f.id)).map((f: any) => ({ value: f.id, label: f.code ? `${f.code} · ${f.name}` : f.name, keywords: f.code ?? "" }))} />
          <SearchableSelect value={plotId} onChange={(v) => { setPlotId(v); setTableId(""); setExpanded((x) => ({ ...x, [v]: true })); }} placeholder="Talhão" empty={farmId ? "Nenhum talhão cadastrado" : "Escolha a fazenda primeiro"} options={selectedPlots.map((p: any) => ({ value: p.id, label: p.code ? `${p.code} · ${p.name}` : p.name, keywords: p.code ?? "" }))} disabled={!farmId} />
        </div>
        {plotId && <><div className="grid gap-2 sm:grid-cols-[1fr_150px_auto]"><Select value={tableId} onValueChange={setTableId}><SelectTrigger><SelectValue placeholder="Tabela" /></SelectTrigger><SelectContent>{(tables.data ?? []).filter((t: any) => t.active !== false).map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}{t.notation ? ` — ${t.notation}` : ""}</SelectItem>)}</SelectContent></Select><Input type="number" min="0" placeholder="Árvores" value={treeCount} onChange={(e) => setTreeCount(e.target.value)} /><Button disabled={!tableId || add.isPending} onClick={() => add.mutate()}>Vincular</Button></div><p className="text-[11px] text-muted-foreground">O total de árvores que este sangrador consegue sangrar neste talhão é a soma das tabelas vinculadas abaixo.</p><div className="grid gap-2 sm:grid-cols-[1fr_auto]"><Select onValueChange={(id) => applyTemplate.mutate(id)} disabled={applyTemplate.isPending || templates.isLoading}><SelectTrigger><SelectValue placeholder="Aplicar template de tabelas" /></SelectTrigger><SelectContent>{(templates.data ?? []).filter((t: any) => t.active !== false).map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name} ({t.tableIds.length} tabelas)</SelectItem>)}</SelectContent></Select><p className="self-center text-[11px] text-muted-foreground">Adiciona as tabelas do template sem remover as existentes.</p></div></>}
      </div>
      {farmIds.length === 0 && <p className="text-sm text-warning">Este sangrador não possui fazenda vinculada.</p>}
      {farmId && plots.isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
      {farmId && !plots.isLoading && <div className="space-y-2">{(plots.data ?? []).map((plot: any) => <PlotSection key={plot.id} plot={plot} tapperKey={tapperKey} companyId={companyId} open={!!expanded[plot.id]} onToggle={() => setExpanded((x) => ({ ...x, [plot.id]: !x[plot.id] }))} remove={remove} update={update} />)}</div>}
    </div>
  </DialogContent></Dialog>;
}

function PlotSection({ plot, tapperKey, companyId, open, onToggle, remove, update }: any) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editTrees, setEditTrees] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const query = useQuery({ queryKey: ["plot-table-links", companyId, tapperKey, plot.id], queryFn: () => listPlotTableLinks(companyId, tapperKey, plot.id), enabled: open });
  // Capacidade do sangrador neste talhão = soma das árvores das tabelas
  // vinculadas. Fica registrado aqui para as contas de previsão mais adiante;
  // por enquanto é só exibição, nada de cálculo.
  const assigned = (query.data ?? []).reduce((sum: number, link: any) => sum + (link.active === false ? 0 : link.treeCount ?? 0), 0);
  return <div className="rounded-xl border"><button type="button" className="flex w-full items-center justify-between p-3 text-left" onClick={onToggle}>{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}<span className="flex-1 px-2 font-medium">{plot.code ? `${plot.code} · ` : ""}{plot.name}</span><span className="text-xs text-muted-foreground">{plot.treeCount ? `${plot.treeCount.toLocaleString("pt-BR")} árvores no talhão` : ""}{assigned > 0 ? ` · ${assigned.toLocaleString("pt-BR")} com este sangrador` : ""}</span></button>{open && <div className="space-y-2 border-t p-3">{query.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (query.data ?? []).length === 0 ? <p className="text-xs text-muted-foreground">Nenhuma tabela vinculada a este talhão.</p> : (query.data ?? []).map((link: any) => <div key={link.id} className="flex items-center gap-2 rounded-lg bg-muted/30 px-2 py-2 text-sm">{editing === link.id ? <><Input className="h-8 w-24" type="number" min="0" value={editTrees} onChange={(e) => setEditTrees(e.target.value)} placeholder="Árvores" /><Input className="h-8 w-16" type="number" min="0" value={editPosition} onChange={(e) => setEditPosition(e.target.value)} placeholder="Ordem" /><Button size="sm" onClick={() => { update.mutate({ id: link.id, treeCount: editTrees ? Number(editTrees) : undefined, position: editPosition ? Number(editPosition) : undefined }); setEditing(null); }}>Salvar</Button></> : <><span className={`flex-1 ${link.active === false ? "line-through text-muted-foreground" : ""}`}>{link.tappingTable?.name ?? "Tabela"} · {link.treeCount ?? "—"} árvores</span><span className="text-xs text-muted-foreground">ordem {link.position + 1}</span><Button size="sm" variant="ghost" onClick={() => { setEditing(link.id); setEditTrees(String(link.treeCount ?? "")); setEditPosition(String(link.position ?? 0)); }}>Editar</Button><Button size="sm" variant="ghost" onClick={() => update.mutate({ id: link.id, active: link.active === false })}>{link.active === false ? "Ativar" : "Pausar"}</Button></>}<Button size="icon" variant="ghost" onClick={() => remove.mutate({ id: link.id, companyId })}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>)}</div>}</div>;
}
