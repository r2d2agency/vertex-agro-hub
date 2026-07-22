import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Droplets } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/vertex/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { listFarms } from "@/lib/fazendas.functions";
import { listPlots } from "@/lib/talhoes.functions";
import {
  createTappingRecord, deleteTappingRecord, listTappingRecords, updateTappingRecord,
  type TappingRecord, type TappingInput,
} from "@/lib/sangrias.functions";

export const Route = createFileRoute("/_authenticated/sangrias")({
  head: () => ({
    meta: [
      { title: "Sangrias — Vertex Agro" },
      { name: "description", content: "Registros diários de sangria." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SangriasPage,
});

const today = () => new Date().toISOString().slice(0, 10);
const empty: TappingInput = {
  farmId: "", plotId: "", date: today(), sangradorName: "",
  treesTapped: null, liters: null, drcPercent: null, dryKg: null, adherencePct: null, notes: "",
};

function SangriasPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const qc = useQueryClient();
  const [farmFilter, setFarmFilter] = useState("__all");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TappingRecord | null>(null);
  const [toDelete, setToDelete] = useState<TappingRecord | null>(null);

  const { data: farms = [] } = useQuery({
    queryKey: ["farms", companyId],
    queryFn: () => listFarms(companyId!),
    enabled: !!companyId,
  });

  const { data = [], isLoading: loading } = useQuery({
    queryKey: ["taps", companyId, farmFilter],
    queryFn: () => listTappingRecords(companyId!, { farmId: farmFilter !== "__all" ? farmFilter : undefined }),
    enabled: !!companyId,
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteTappingRecord(id),
    onSuccess: () => {
      toast.success("Registro removido");
      qc.invalidateQueries({ queryKey: ["taps", companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const summary = useMemo(() => {
    const liters = data.reduce((a, r) => a + (r.liters ?? 0), 0);
    const dry = data.reduce((a, r) => a + (r.dryKg ?? 0), 0);
    const drcs = data.filter((r) => r.drcPercent != null).map((r) => r.drcPercent!);
    const drc = drcs.length ? drcs.reduce((a, b) => a + b, 0) / drcs.length : 0;
    return { liters, dry, drc, count: data.length };
  }, [data]);

  return (
    <div>
      <PageHeader
        title="Sangrias"
        description="Registros diários de sangria por sangrador e talhão."
        actions={companyId ? <Button onClick={() => setCreating(true)}><Plus className="mr-2 h-4 w-4" /> Novo registro</Button> : null}
      />

      {!isLoading && companies.length === 0 ? (
        <NoCompanyCard />
      ) : (
        <>
          <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />

          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <SummaryCard label="Registros" value={summary.count.toLocaleString("pt-BR")} />
            <SummaryCard label="Litros de látex" value={summary.liters.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} />
            <SummaryCard label="Kg secos" value={summary.dry.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} />
            <SummaryCard label="DRC médio" value={summary.drc ? `${summary.drc.toFixed(1)}%` : "—"} />
          </div>

          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Fazenda:</span>
            <Select value={farmFilter} onValueChange={setFarmFilter}>
              <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todas</SelectItem>
                {farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Carregando...</div>
              ) : data.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  <Droplets className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  Nenhum registro de sangria.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Sangrador</TableHead>
                      <TableHead className="text-right">Árvores</TableHead>
                      <TableHead className="text-right">Litros</TableHead>
                      <TableHead className="text-right">DRC %</TableHead>
                      <TableHead className="text-right">Kg secos</TableHead>
                      <TableHead className="text-right">Aderência</TableHead>
                      <TableHead className="w-24" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.date.slice(0, 10).split("-").reverse().join("/")}</TableCell>
                        <TableCell className="font-medium">{r.sangradorName}</TableCell>
                        <TableCell className="text-right">{r.treesTapped ?? "—"}</TableCell>
                        <TableCell className="text-right">{r.liters?.toLocaleString("pt-BR") ?? "—"}</TableCell>
                        <TableCell className="text-right">{r.drcPercent != null ? `${r.drcPercent}%` : "—"}</TableCell>
                        <TableCell className="text-right">{r.dryKg?.toLocaleString("pt-BR") ?? "—"}</TableCell>
                        <TableCell className="text-right">{r.adherencePct != null ? `${r.adherencePct}%` : "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(r)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setToDelete(r)}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <SangriaDialog
        open={creating || !!editing}
        onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}
        initial={editing ?? undefined}
        companyId={companyId}
        farms={farms}
        onSaved={() => qc.invalidateQueries({ queryKey: ["taps", companyId] })}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>Este registro será removido do histórico ativo.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (toDelete) del.mutate(toDelete.id); setToDelete(null); }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card><CardContent className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </CardContent></Card>
  );
}

function SangriaDialog({
  open, onOpenChange, initial, companyId, farms, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: TappingRecord;
  companyId: string | null;
  farms: { id: string; name: string }[];
  onSaved: () => void;
}) {
  const [values, setValues] = useState<TappingInput>(empty);
  const { data: plots = [] } = useQuery({
    queryKey: ["plots", companyId, values.farmId],
    queryFn: () => listPlots(companyId!, values.farmId || undefined),
    enabled: !!companyId && !!values.farmId,
  });

  useEffect(() => {
    if (!open) return;
    if (initial) setValues({
      farmId: initial.farmId ?? "",
      plotId: initial.plotId ?? "",
      tappingTableId: initial.tappingTableId ?? "",
      date: initial.date.slice(0, 10),
      sangradorName: initial.sangradorName,
      treesTapped: initial.treesTapped ?? null,
      liters: initial.liters ?? null,
      drcPercent: initial.drcPercent ?? null,
      dryKg: initial.dryKg ?? null,
      adherencePct: initial.adherencePct ?? null,
      notes: initial.notes ?? "",
    });
    else setValues({ ...empty });
  }, [open, initial]);

  const mut = useMutation({
    mutationFn: async () => {
      const v: TappingInput = {
        ...values,
        dryKg:
          values.dryKg ??
          (values.liters != null && values.drcPercent != null
            ? +(values.liters * (values.drcPercent / 100)).toFixed(2)
            : null),
      };
      if (initial) return updateTappingRecord(initial.id, v);
      return createTappingRecord(companyId!, v);
    },
    onSuccess: () => {
      toast.success(initial ? "Registro atualizado" : "Registro criado");
      onSaved();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{initial ? "Editar sangria" : "Nova sangria"}</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!values.sangradorName.trim()) return toast.error("Sangrador obrigatório");
            if (!values.date) return toast.error("Data obrigatória");
            mut.mutate();
          }}
          className="grid gap-3 md:grid-cols-2"
        >
          <div><Label>Data *</Label><Input type="date" value={values.date} onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))} required /></div>
          <div><Label>Sangrador *</Label><Input value={values.sangradorName} onChange={(e) => setValues((v) => ({ ...v, sangradorName: e.target.value }))} required /></div>
          <div>
            <Label>Fazenda</Label>
            <Select value={values.farmId || "__none"} onValueChange={(v) => setValues((s) => ({ ...s, farmId: v === "__none" ? "" : v, plotId: "" }))}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">—</SelectItem>
                {farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Talhão</Label>
            <Select value={values.plotId || "__none"} onValueChange={(v) => setValues((s) => ({ ...s, plotId: v === "__none" ? "" : v }))} disabled={!values.farmId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">—</SelectItem>
                {plots.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Árvores sangradas</Label><Input type="number" value={values.treesTapped ?? ""} onChange={(e) => setValues((v) => ({ ...v, treesTapped: e.target.value ? Number(e.target.value) : null }))} /></div>
          <div><Label>Litros</Label><Input type="number" step="0.01" value={values.liters ?? ""} onChange={(e) => setValues((v) => ({ ...v, liters: e.target.value ? Number(e.target.value) : null }))} /></div>
          <div><Label>DRC (%)</Label><Input type="number" step="0.1" value={values.drcPercent ?? ""} onChange={(e) => setValues((v) => ({ ...v, drcPercent: e.target.value ? Number(e.target.value) : null }))} /></div>
          <div><Label>Aderência à tabela (%)</Label><Input type="number" step="0.1" value={values.adherencePct ?? ""} onChange={(e) => setValues((v) => ({ ...v, adherencePct: e.target.value ? Number(e.target.value) : null }))} /></div>
          <div className="md:col-span-2"><Label>Observações</Label><Textarea rows={3} value={values.notes} onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))} /></div>
          <DialogFooter className="md:col-span-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
