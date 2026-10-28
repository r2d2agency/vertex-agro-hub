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

function TableLinkRow({ link, companyId, update, remove }: any) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editTrees, setEditTrees] = useState("");
  const [editPosition, setEditPosition] = useState("");
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/30 px-2 py-2 text-sm">
      {editing === link.id ? (
        <>
          <Input className="h-8 w-24" type="number" min="0" value={editTrees} onChange={(e) => setEditTrees(e.target.value)} placeholder="Árvores" />
          <Input className="h-8 w-16" type="number" min="0" value={editPosition} onChange={(e) => setEditPosition(e.target.value)} placeholder="Ordem" />
          <Button size="sm" onClick={() => { update.mutate({ id: link.id, treeCount: editTrees ? Number(editTrees) : undefined, position: editPosition ? Number(editPosition) : undefined }); setEditing(null); }}>Salvar</Button>
        </>
      ) : (
        <>
          <span className={`flex-1 ${link.active === false ? "line-through text-muted-foreground" : ""}`}>{link.plot?.name ?? "Talhão"} · {link.treeCount ?? "—"} árvores</span>
          <span className="text-xs text-muted-foreground">ordem {link.position + 1}</span>
          <Button size="sm" variant="ghost" onClick={() => { setEditing(link.id); setEditTrees(String(link.treeCount ?? "")); setEditPosition(String(link.position ?? 0)); }}>Editar</Button>
          <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: link.id, active: link.active === false })}>{link.active === false ? "Ativar" : "Pausar"}</Button>
        </>
      )}
      <Button size="icon" variant="ghost" onClick={() => remove.mutate({ id: link.id, companyId })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
    </div>
  );
}

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
  const allLinks = useQuery({ queryKey: ["plot-table-links", companyId, tapperKey], queryFn: () => listPlotTableLinks(companyId, tapperKey), enabled: open && !!companyId });
  const selectedPlots = useMemo(() => plots.data ?? [], [plots.data]);

  // Agrupa os vínculos por tabela (A–E), permitindo uma mesma tabela em vários talhões.
  const byTable = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const link of (allLinks.data ?? [])) {
      const key = link.tappingTableId ?? link.tappingTable?.id ?? "sem-tabela";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(link);
    }
    return map;
  }, [allLinks.data]);

  const applyTemplate = useMutation({ mutationFn: (templateId: string) => applyTappingTableTemplate({ companyId, tapperKey, farmId, plotId, templateId }), onSuccess: (links: any[]) => { toast.success(`${links?.length ?? 0} tabelas do template foram vinculadas ao talhão`); qc.invalidateQueries({ queryKey: ["plot-table-links", companyId, tapperKey] }); }, onError: (e: Error) => toast.error(e.message) });
  const add = useMutation({ mutationFn: () => createPlotTableLink({ companyId, farmId, plotId, tapperKey, tappingTableId: tableId, treeCount: treeCount ? Number(treeCount) : undefined }), onSuccess: () => { toast.success("Tabela vinculada ao talhão"); setTableId(""); setTreeCount(""); qc.invalidateQueries({ queryKey: ["plot-table-links", companyId, tapperKey] }); }, onError: (e: Error) => toast.error(e.message) });
  const remove = useMutation({ mutationFn: ({ id, companyId }: { id: string; companyId: string }) => deletePlotTableLink(id, companyId), onSuccess: () => { toast.success("Vínculo removido"); qc.invalidateQueries({ queryKey: ["plot-table-links", companyId, tapperKey] }); }, onError: (e: Error) => toast.error(e.message) });
  const update = useMutation({ mutationFn: ({ id, active, treeCount, position }: { id: string; active?: boolean; treeCount?: number; position?: number }) => updatePlotTableLink(id, { companyId, active, treeCount, position }), onSuccess: () => qc.invalidateQueries({ queryKey: ["plot-table-links", companyId, tapperKey] }), onError: (e: Error) => toast.error(e.message) });

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
    <DialogHeader><DialogTitle>Tabelas e talhões · {tapperName}</DialogTitle><DialogDescription>Adicione tabelas e, em cada tabela, vincule os talhões com a quantidade de árvores. Uma tabela pode estar em vários talhões.</DialogDescription></DialogHeader>
    <div className="space-y-4">
      <div className="rounded-xl border bg-muted/20 p-3 space-y-2"><Label>Adicionar vínculo</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          <SearchableSelect value={farmId} onChange={(v) => { setFarmId(v); setPlotId(""); setTableId(""); }} placeholder="Fazenda vinculada" empty="Nenhuma fazenda vinculada" options={(farms.data ?? []).filter((f: any) => farmIds.includes(f.id)).map((f: any) => ({ value: f.id, label: f.code ? `${f.code} · ${f.name}` : f.name, keywords: f.code ?? "" }))} />
          <SearchableSelect value={plotId} onChange={(v) => { setPlotId(v); setTableId(""); }} placeholder="Talhão" empty={farmId ? "Nenhum talhão cadastrado" : "Escolha a fazenda primeiro"} options={selectedPlots.map((p: any) => ({ value: p.id, label: p.code ? `${p.code} · ${p.name}` : p.name, keywords: p.code ?? "" }))} disabled={!farmId} />
        </div>
        {plotId && <><div className="grid gap-2 sm:grid-cols-[1fr_150px_auto]"><Select value={tableId} onValueChange={setTableId}><SelectTrigger><SelectValue placeholder="Tabela" /></SelectTrigger><SelectContent>{(tables.data ?? []).filter((t: any) => t.active !== false).map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}{t.notation ? ` — ${t.notation}` : ""}</SelectItem>)}</SelectContent></Select><Input type="number" min="0" placeholder="Árvores" value={treeCount} onChange={(e) => setTreeCount(e.target.value)} /><Button disabled={!tableId || add.isPending} onClick={() => add.mutate()}>Vincular</Button></div>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]"><Select onValueChange={(id) => applyTemplate.mutate(id)} disabled={applyTemplate.isPending || templates.isLoading || !plotId}><SelectTrigger><SelectValue placeholder="Aplicar template de tabelas" /></SelectTrigger><SelectContent>{(templates.data ?? []).filter((t: any) => t.active !== false).map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name} ({t.tableIds.length} tabelas)</SelectItem>)}</SelectContent></Select><p className="self-center text-[11px] text-muted-foreground">Adiciona as tabelas do template ao talhão sem remover as existentes.</p></div></>}
      </div>
      {farmIds.length === 0 && <p className="text-sm text-warning">Este sangrador não possui fazenda vinculada.</p>}
      {allLinks.isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
      {!allLinks.isLoading && (allLinks.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nenhuma tabela vinculada.</p>}
      <div className="space-y-2">
        {tables.data?.filter((t: any) => t.active !== false).map((t: any) => {
          const links = byTable.get(t.id) ?? [];
          const open = !!expanded[t.id];
          const assigned = links.reduce((s: number, l: any) => s + (l.active === false ? 0 : l.treeCount ?? 0), 0);
          return (
            <div key={t.id} className="rounded-xl border">
              <button type="button" className="flex w-full items-center justify-between p-3 text-left" onClick={() => setExpanded((x) => ({ ...x, [t.id]: !x[t.id] }))}>
                {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="flex-1 px-2 font-medium">{t.name}{t.notation ? ` — ${t.notation}` : ""}</span>
                <span className="text-xs text-muted-foreground">{links.length} talhão(ões) · {assigned.toLocaleString("pt-BR")} árvores</span>
              </button>
              {open && <div className="space-y-2 border-t p-3">
                {links.length === 0 ? <p className="text-xs text-muted-foreground">Nenhum talhão vinculado a esta tabela.</p> : links.map((link: any) => (
                  <TableLinkRow key={link.id} link={link} companyId={companyId} update={update} remove={remove} />
                ))}
              </div>}
            </div>
          );
        })}
      </div>
    </div>
  </DialogContent></Dialog>;
}
