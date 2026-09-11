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

type SelectableTable = { id: string; name: string; notation?: string | null; active?: boolean };

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
  const [newTreeCount, setNewTreeCount] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});

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
    if (!open) { setNewTableId(""); setNewTreeCount(""); setEdits({}); }
  }, [open]);

  const links = linksQuery.data ?? [];
  const availableTables = useMemo(() => {
    const linkedIds = new Set(links.map((l) => l.tappingTableId));
    return (tablesQuery.data ?? []).filter((t) => t.active !== false && !linkedIds.has(t.id));
  }, [tablesQuery.data, links]);

  const addMutation = useMutation({
    mutationFn: () => createTapperTableLink({
      companyId, tapperKey, tappingTableId: newTableId,
      treeCount: newTreeCount ? Number(newTreeCount) : undefined,
    }),
    onSuccess: () => {
      toast.success("Tabela vinculada");
      setNewTableId(""); setNewTreeCount("");
      qc.invalidateQueries({ queryKey: ["tapper-table-links", companyId, tapperKey] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveMutation = useMutation({
    mutationFn: (linkId: string) => updateTapperTableLink(linkId, { companyId, treeCount: Number(edits[linkId] || 0) }),
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
          <ul className="space-y-2">
            {links.map((l) => (
              <li key={l.id} className="flex items-center gap-2 rounded-lg border p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {l.tappingTable?.name ?? "Tabela removida"}
                    {l.tappingTable?.notation ? ` — ${l.tappingTable.notation}` : ""}
                  </p>
                </div>
                <Input
                  type="number" min={0} className="h-9 w-24"
                  value={edits[l.id] ?? (l.treeCount ?? "")}
                  onChange={(e) => setEdits((c) => ({ ...c, [l.id]: e.target.value }))}
                  placeholder="Árvores"
                />
                <Button
                  size="sm" variant="outline"
                  disabled={saveMutation.isPending}
                  onClick={() => saveMutation.mutate(l.id)}
                >
                  Salvar
                </Button>
                <Button
                  size="sm" variant="ghost"
                  disabled={removeMutation.isPending}
                  onClick={() => removeMutation.mutate(l.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2 border-t pt-3">
          <Label className="text-xs font-medium text-muted-foreground">Vincular nova tabela</Label>
          <div className="flex gap-2">
            <Select value={newTableId} onValueChange={setNewTableId}>
              <SelectTrigger className="h-10 flex-1"><SelectValue placeholder="Tabela" /></SelectTrigger>
              <SelectContent>
                {availableTables.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}{t.notation ? ` — ${t.notation}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number" min={0} className="h-10 w-24" placeholder="Árvores"
              value={newTreeCount} onChange={(e) => setNewTreeCount(e.target.value)}
            />
            <Button disabled={!newTableId || addMutation.isPending} onClick={() => addMutation.mutate()}>
              Adicionar
            </Button>
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
