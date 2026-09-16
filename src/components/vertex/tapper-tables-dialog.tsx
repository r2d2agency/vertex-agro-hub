import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createTapperTableLink, deleteTapperTableLink, listTapperTableLinks, updateTapperTableLink,
} from "@/lib/tappers.functions";
import { listTappingTables } from "@/lib/tabelas.functions";

type SelectableTable = {
  id: string; name: string; notation?: string | null; frequencyDays?: number | null;
  restDays?: number | null; workDaysCycle?: number | null; cutType?: string | null; stimulation?: string | null; active?: boolean;
};

type TableOverrides = {
  treeCount: string; frequencyDays: string; restDays: string; workDaysCycle: string;
  cutType: string; stimulation: string; notes: string;
};

const emptyOverrides: TableOverrides = { treeCount: "", frequencyDays: "", restDays: "", workDaysCycle: "", cutType: "", stimulation: "", notes: "" };

function overrideNumber(value: string) {
  return value.trim() ? Number(value) : undefined;
}

export function TapperTablesDialog({
  open, onOpenChange, companyId, tapperKey, tapperName,
  listTables = listTappingTables,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  tapperKey: string;
  tapperName: string;
  // Admin usa /tapping-tables (só admin/gestor); o app de campo passa
  // listFieldTappingTables (/field/tapping-tables, aberto a monitor/consultor).
  listTables?: (companyId: string) => Promise<SelectableTable[]>;
}) {
  const qc = useQueryClient();
  const [newTableId, setNewTableId] = useState("");
  const [newOverrides, setNewOverrides] = useState<TableOverrides>(emptyOverrides);
  const [edits, setEdits] = useState<Record<string, TableOverrides>>({});

  const linksQuery = useQuery({
    queryKey: ["tapper-table-links", companyId, tapperKey],
    queryFn: () => listTapperTableLinks(companyId, tapperKey),
    enabled: open && !!companyId && !!tapperKey,
  });

  const tablesQuery = useQuery({
    queryKey: ["tapping-tables-for-link", companyId],
    queryFn: () => listTables(companyId),
    enabled: open && !!companyId,
  });

  useEffect(() => {
    if (!open) { setNewTableId(""); setNewOverrides(emptyOverrides); setEdits({}); }
  }, [open]);

  const links = linksQuery.data ?? [];
  const availableTables = useMemo(() => {
    const linkedIds = new Set(links.map((l) => l.tappingTableId));
    return (tablesQuery.data ?? []).filter((t) => t.active !== false && !linkedIds.has(t.id));
  }, [tablesQuery.data, links]);

  const addMutation = useMutation({
    mutationFn: () => createTapperTableLink({
      companyId, tapperKey, tappingTableId: newTableId,
      treeCount: overrideNumber(newOverrides.treeCount), frequencyDays: overrideNumber(newOverrides.frequencyDays),
      restDays: overrideNumber(newOverrides.restDays), workDaysCycle: overrideNumber(newOverrides.workDaysCycle),
      cutType: newOverrides.cutType.trim() || undefined, stimulation: newOverrides.stimulation.trim() || undefined,
      notes: newOverrides.notes.trim() || undefined,
    }),
    onSuccess: () => {
      toast.success("Tabela vinculada");
      setNewTableId(""); setNewOverrides(emptyOverrides);
      qc.invalidateQueries({ queryKey: ["tapper-table-links", companyId, tapperKey] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveMutation = useMutation({
    mutationFn: (linkId: string) => {
      const edit = edits[linkId] ?? emptyOverrides;
      return updateTapperTableLink(linkId, {
        companyId, treeCount: overrideNumber(edit.treeCount), frequencyDays: overrideNumber(edit.frequencyDays),
        restDays: overrideNumber(edit.restDays), workDaysCycle: overrideNumber(edit.workDaysCycle),
        cutType: edit.cutType.trim() || undefined, stimulation: edit.stimulation.trim() || undefined,
        notes: edit.notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Quantidade atualizada");
      qc.invalidateQueries({ queryKey: ["tapper-table-links", companyId, tapperKey] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: (linkId: string) => deleteTapperTableLink(linkId, companyId),
    onSuccess: () => {
      toast.success("Tabela desvinculada");
      qc.invalidateQueries({ queryKey: ["tapper-table-links", companyId, tapperKey] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tabelas de {tapperName}</DialogTitle>
          <DialogDescription>
            Cada tabela vinculada tem sua própria quantidade de árvores prevista para este sangrador — é ela, não o talhão, que define quantas árvores ele tem que fazer.
          </DialogDescription>
        </DialogHeader>

        {linksQuery.isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : links.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma tabela vinculada ainda.</p>
        ) : (
          <ul className="max-h-[45vh] space-y-2 overflow-y-auto">
            {links.map((l) => (
              <li key={l.id} className="space-y-2 rounded-lg border p-2">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-medium">
                    {l.tappingTable?.name ?? "Tabela removida"}
                    {l.tappingTable?.notation ? ` — ${l.tappingTable.notation}` : ""}
                  </p>
                  <Button
                    size="icon" variant="ghost" className="h-8 w-8 shrink-0"
                    disabled={removeMutation.isPending}
                    onClick={() => removeMutation.mutate(l.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <OverrideInput label="Árvores" type="number" value={edits[l.id]?.treeCount ?? String(l.treeCount ?? "")} onChange={(value) => setEdits((c) => ({ ...c, [l.id]: { ...defaultEdit(l), ...(c[l.id] ?? {}), treeCount: value } }))} />
                  <OverrideInput label="Frequência (dias)" type="number" value={edits[l.id]?.frequencyDays ?? String(l.frequencyDays ?? l.tappingTable?.frequencyDays ?? "")} onChange={(value) => setEdits((c) => ({ ...c, [l.id]: { ...defaultEdit(l), ...(c[l.id] ?? {}), frequencyDays: value } }))} />
                  <OverrideInput label="Descanso (dias)" type="number" value={edits[l.id]?.restDays ?? String(l.restDays ?? l.tappingTable?.restDays ?? "")} onChange={(value) => setEdits((c) => ({ ...c, [l.id]: { ...defaultEdit(l), ...(c[l.id] ?? {}), restDays: value } }))} />
                  <OverrideInput label="Ciclo de trabalho" type="number" value={edits[l.id]?.workDaysCycle ?? String(l.workDaysCycle ?? l.tappingTable?.workDaysCycle ?? "")} onChange={(value) => setEdits((c) => ({ ...c, [l.id]: { ...defaultEdit(l), ...(c[l.id] ?? {}), workDaysCycle: value } }))} />
                  <OverrideInput label="Tipo de corte" value={edits[l.id]?.cutType ?? l.cutType ?? l.tappingTable?.cutType ?? ""} onChange={(value) => setEdits((c) => ({ ...c, [l.id]: { ...defaultEdit(l), ...(c[l.id] ?? {}), cutType: value } }))} />
                  <OverrideInput label="Estimulação" value={edits[l.id]?.stimulation ?? l.stimulation ?? l.tappingTable?.stimulation ?? ""} onChange={(value) => setEdits((c) => ({ ...c, [l.id]: { ...defaultEdit(l), ...(c[l.id] ?? {}), stimulation: value } }))} />
                  <div className="col-span-2"><OverrideInput label="Observações personalizadas" value={edits[l.id]?.notes ?? l.notes ?? ""} onChange={(value) => setEdits((c) => ({ ...c, [l.id]: { ...defaultEdit(l), ...(c[l.id] ?? {}), notes: value } }))} /></div>
                  <Button size="sm" variant="outline" className="col-span-2" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate(l.id)}>Salvar personalização</Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2 border-t pt-3">
          <Label className="text-xs font-medium text-muted-foreground">Vincular nova tabela</Label>
          <Select value={newTableId} onValueChange={(value) => {
            setNewTableId(value);
            const table = (tablesQuery.data ?? []).find((item) => item.id === value);
            if (table) setNewOverrides((current) => ({
              ...current,
              frequencyDays: current.frequencyDays || String(table.frequencyDays ?? ""),
              restDays: current.restDays || String(table.restDays ?? ""),
              workDaysCycle: current.workDaysCycle || String(table.workDaysCycle ?? ""),
              cutType: current.cutType || table.cutType || "",
              stimulation: current.stimulation || table.stimulation || "",
            }));
          }}>
            <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Tabela" /></SelectTrigger>
            <SelectContent>
              {availableTables.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}{t.notation ? ` — ${t.notation}` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <OverrideInput label="Árvores" type="number" value={newOverrides.treeCount} onChange={(value) => setNewOverrides((c) => ({ ...c, treeCount: value }))} />
            <OverrideInput label="Frequência (dias)" type="number" value={newOverrides.frequencyDays} onChange={(value) => setNewOverrides((c) => ({ ...c, frequencyDays: value }))} />
            <OverrideInput label="Descanso (dias)" type="number" value={newOverrides.restDays} onChange={(value) => setNewOverrides((c) => ({ ...c, restDays: value }))} />
            <OverrideInput label="Ciclo de trabalho" type="number" value={newOverrides.workDaysCycle} onChange={(value) => setNewOverrides((c) => ({ ...c, workDaysCycle: value }))} />
            <OverrideInput label="Tipo de corte" value={newOverrides.cutType} onChange={(value) => setNewOverrides((c) => ({ ...c, cutType: value }))} />
            <OverrideInput label="Estimulação" value={newOverrides.stimulation} onChange={(value) => setNewOverrides((c) => ({ ...c, stimulation: value }))} />
            <div className="col-span-2"><OverrideInput label="Observações personalizadas" value={newOverrides.notes} onChange={(value) => setNewOverrides((c) => ({ ...c, notes: value }))} /></div>
            <Button className="col-span-2" disabled={!newTableId || addMutation.isPending} onClick={() => addMutation.mutate()}>Adicionar tabela personalizada</Button>
          </div>
          {availableTables.length === 0 && !tablesQuery.isLoading && (
            <p className="text-xs text-muted-foreground">
              Todas as tabelas cadastradas já estão vinculadas, ou nenhuma tabela foi cadastrada ainda.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function defaultEdit(link: any): TableOverrides {
  return {
    treeCount: String(link.treeCount ?? ""), frequencyDays: String(link.frequencyDays ?? link.tappingTable?.frequencyDays ?? ""),
    restDays: String(link.restDays ?? link.tappingTable?.restDays ?? ""), workDaysCycle: String(link.workDaysCycle ?? link.tappingTable?.workDaysCycle ?? ""),
    cutType: link.cutType ?? link.tappingTable?.cutType ?? "", stimulation: link.stimulation ?? link.tappingTable?.stimulation ?? "", notes: link.notes ?? "",
  };
}

function OverrideInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: "text" | "number" }) {
  return <label className="space-y-1"><span className="text-[10px] font-medium text-muted-foreground">{label}</span><Input type={type} min={type === "number" ? 0 : undefined} className="h-9" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}
