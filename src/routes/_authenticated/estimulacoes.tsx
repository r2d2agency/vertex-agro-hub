import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, FlaskConical, Download } from "lucide-react";
import { toast } from "sonner";
import { downloadCsv, fmtDateBR } from "@/lib/csv";
import { PageHeader } from "@/components/vertex/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { listFarms } from "@/lib/fazendas.functions";
import { listPlots } from "@/lib/talhoes.functions";
import { listTappers } from "@/lib/tappers.functions";
import { listTappingTables } from "@/lib/tabelas.functions";
import {
  createStimulation, deleteStimulation, listStimulations, updateStimulation,
  STIM_METHODS, STIM_CONCENTRATIONS, type Stimulation, type StimulationInput,
} from "@/lib/estimulacoes.functions";

export const Route = createFileRoute("/_authenticated/estimulacoes")({
  head: () => ({ meta: [
    { title: "Estimulações — Vertex Agro" },
    { name: "description", content: "Registro de aplicações de estimulantes por fazenda e talhão." },
    { name: "robots", content: "noindex" },
  ] }),
  component: EstimulacoesPage,
});

const EMPTY: StimulationInput = {
  farmId: undefined, plotId: undefined, date: "2026-08-12",
  product: "", concentration: "", method: "pincel", applicator: "",
  tapperId: null, tappingTableId: null, reason: "",
  treesStimulated: null, doseMlPerTree: null, areaHa: null, weather: "", notes: "",
};

function EstimulacoesPage() {
  const qc = useQueryClient();
  const { companyId, companies, isLoading, setCompanyId } = useSelectedCompany();
  const [farmFilter, setFarmFilter] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Stimulation | null>(null);
  const [form, setForm] = useState<StimulationInput>(EMPTY);
  const [pendingDelete, setPendingDelete] = useState<Stimulation | null>(null);

  const { data: farms = [] } = useQuery({
    queryKey: ["farms", companyId],
    queryFn: () => listFarms(companyId!),
    enabled: !!companyId,
  });

  const { data: items = [], isLoading: loading } = useQuery({
    queryKey: ["stimulations", companyId, farmFilter, from, to],
    queryFn: () => listStimulations(companyId!, {
      farmId: farmFilter || undefined, from: from || undefined, to: to || undefined,
    }),
    enabled: !!companyId,
  });

  const { data: plots = [] } = useQuery({
    queryKey: ["plots", companyId, form.farmId],
    queryFn: () => listPlots(companyId!, form.farmId || undefined),
    enabled: !!companyId && !!form.farmId,
  });
  const { data: allTappers = [] } = useQuery({
    queryKey: ["tappers", companyId],
    queryFn: () => listTappers(companyId!),
    enabled: !!companyId,
  });
  const { data: tables = [] } = useQuery({
    queryKey: ["tapping-tables", companyId],
    queryFn: () => listTappingTables(companyId!),
    enabled: !!companyId,
  });
  const tappers = useMemo(
    () => allTappers.filter((t) => t.stints.some((s) => s.farmId === form.farmId && !s.endAt)),
    [allTappers, form.farmId],
  );

  const farmName = useMemo(() => {
    const map = new Map(farms.map((f) => [f.id, f.name]));
    return (id?: string | null) => (id ? map.get(id) ?? "—" : "—");
  }, [farms]);

  const create = useMutation({
    mutationFn: () => createStimulation(companyId!, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["stimulations"] }); setOpen(false); toast.success("Estimulação registrada"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });
  const update = useMutation({
    mutationFn: () => updateStimulation(editing!.id, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["stimulations"] }); setOpen(false); toast.success("Registro atualizado"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });
  const remove = useMutation({
    mutationFn: () => deleteStimulation(pendingDelete!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["stimulations"] }); setPendingDelete(null); toast.success("Registro excluído"); },
  });

  function openNew() { setEditing(null); setForm(EMPTY); setOpen(true); }
  function openEdit(s: Stimulation) {
    setEditing(s);
    setForm({
      farmId: s.farmId ?? undefined, plotId: s.plotId ?? undefined,
      date: s.date.slice(0, 10), product: s.product,
      concentration: s.concentration ?? "", method: s.method ?? "pincel",
      applicator: s.applicator ?? "", tapperId: s.tapperId ?? null, tappingTableId: s.tappingTableId ?? null,
      reason: s.reason ?? "", treesStimulated: s.treesStimulated ?? null,
      doseMlPerTree: s.doseMlPerTree ?? null, areaHa: s.areaHa ?? null,
      weather: s.weather ?? "", notes: s.notes ?? "",
    });
    setOpen(true);
  }

  function exportCsv() {
    downloadCsv(
      `estimulacoes_${companyId}.csv`,
      items.map((s) => ({
        data: fmtDateBR(s.date),
        fazenda: farmName(s.farmId),
        produto: s.product,
        concentracao: s.concentration ?? "",
        metodo: s.method ?? "",
        aplicador: s.applicator ?? "",
        arvores: s.treesStimulated ?? "",
        ml_arvore: s.doseMlPerTree ?? "",
        area_ha: s.areaHa ?? "",
        observacoes: s.notes ?? "",
      })),
      [
        { key: "data", label: "Data" },
        { key: "fazenda", label: "Fazenda" },
        { key: "produto", label: "Produto" },
        { key: "concentracao", label: "Concentração" },
        { key: "metodo", label: "Método" },
        { key: "aplicador", label: "Aplicador" },
        { key: "arvores", label: "Árvores" },
        { key: "ml_arvore", label: "ml/árvore" },
        { key: "area_ha", label: "Área (ha)" },
        { key: "observacoes", label: "Observações" },
      ],
    );
  }


  const canSave = form.product.trim().length > 0 && form.date;

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Estimulações"
        description="Registro de aplicações de estimulantes."
        
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCsv} disabled={!items.length}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button onClick={openNew} disabled={!companyId}>
              <Plus className="h-4 w-4" /> Nova
            </Button>
          </div>
        }
      />

      <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />
      {!isLoading && companies.length === 0 && <NoCompanyCard />}

      {companyId && (
        <Card>
          <CardContent className="grid gap-3 p-4 md:grid-cols-4">
            <div className="grid gap-1">
              <Label>Fazenda</Label>
              <Select value={farmFilter || "all"} onValueChange={(v) => setFarmFilter(v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1"><Label>De</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div className="grid gap-1"><Label>Até</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            <div className="grid items-end"><Button variant="outline" onClick={() => { setFarmFilter(""); setFrom(""); setTo(""); }}>Limpar</Button></div>
          </CardContent>
        </Card>
      )}

      {companyId && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Fazenda</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Concentração</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Árvores</TableHead>
                  <TableHead className="text-right">ml/árvore</TableHead>
                  <TableHead className="w-24 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground">Carregando…</TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground">Nenhuma estimulação registrada.</TableCell></TableRow>
                ) : items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{fmtDateBR(s.date)}</TableCell>
                    <TableCell>{farmName(s.farmId)}</TableCell>
                    <TableCell className="font-medium">{s.product}</TableCell>
                    <TableCell>{s.concentration ?? "—"}</TableCell>
                    <TableCell>{s.method ?? "—"}</TableCell>
                    <TableCell className="text-right">{s.treesStimulated ?? "—"}</TableCell>
                    <TableCell className="text-right">{s.doseMlPerTree ?? "—"}</TableCell>
                    <TableCell className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setPendingDelete(s)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Editar estimulação" : "Nova estimulação"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-1">
              <Label>Data *</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="grid gap-1">
              <Label>Fazenda</Label>
              <Select
                value={form.farmId ?? "none"}
                onValueChange={(v) => setForm({ ...form, farmId: v === "none" ? undefined : v, plotId: undefined, tapperId: null })}
              >
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label>Talhão</Label>
              <Select
                value={form.plotId ?? "none"}
                onValueChange={(v) => {
                  const plot = v !== "none" ? plots.find((p) => p.id === v) : undefined;
                  const table = plot?.tappingSystem
                    ? tables.find((t) => t.notation === plot.tappingSystem || t.name === plot.tappingSystem)
                    : undefined;
                  setForm((f) => ({ ...f, plotId: v === "none" ? undefined : v, tappingTableId: table?.id ?? f.tappingTableId }));
                }}
                disabled={!form.farmId}
              >
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {plots.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label>Sangrador</Label>
              <Select
                value={form.tapperId ?? "none"}
                onValueChange={(v) => {
                  const t = v !== "none" ? tappers.find((x) => x.id === v) : undefined;
                  setForm((f) => ({ ...f, tapperId: v === "none" ? null : v, applicator: t?.fullName ?? f.applicator }));
                }}
              >
                <SelectTrigger><SelectValue placeholder={form.farmId ? "—" : "Selecione a fazenda primeiro"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {tappers.map((t) => <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label>Tabela de estimulação</Label>
              <Select value={form.tappingTableId ?? "none"} onValueChange={(v) => setForm({ ...form, tappingTableId: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {tables.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}{t.notation ? ` — ${t.notation}` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label>Produto *</Label>
              <Input value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} placeholder="ex.: Ethrel" />
            </div>
            <div className="grid gap-1">
              <Label>Concentração</Label>
              <Select value={form.concentration || "none"} onValueChange={(v) => setForm({ ...form, concentration: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {STIM_CONCENTRATIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label>Método</Label>
              <Select value={form.method ?? "pincel"} onValueChange={(v) => setForm({ ...form, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STIM_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label>Aplicador</Label>
              <Input value={form.applicator ?? ""} onChange={(e) => setForm({ ...form, applicator: e.target.value })} />
            </div>
            <div className="grid gap-1">
              <Label>Árvores estimuladas</Label>
              <Input type="number" value={form.treesStimulated ?? ""} onChange={(e) => setForm({ ...form, treesStimulated: e.target.value ? parseInt(e.target.value, 10) : null })} />
            </div>
            <div className="grid gap-1">
              <Label>Dose (ml/árvore)</Label>
              <Input type="number" step="0.01" value={form.doseMlPerTree ?? ""} onChange={(e) => setForm({ ...form, doseMlPerTree: e.target.value ? parseFloat(e.target.value) : null })} />
            </div>
            <div className="grid gap-1">
              <Label>Área (ha)</Label>
              <Input type="number" step="0.01" value={form.areaHa ?? ""} onChange={(e) => setForm({ ...form, areaHa: e.target.value ? parseFloat(e.target.value) : null })} />
            </div>
            <div className="grid gap-1">
              <Label>Clima</Label>
              <Input value={form.weather ?? ""} onChange={(e) => setForm({ ...form, weather: e.target.value })} placeholder="ex.: nublado, 24°C" />
            </div>
            <div className="grid gap-1 md:col-span-2">
              <Label>Motivo (por que não houve sangria neste período)</Label>
              <Textarea rows={2} value={form.reason ?? ""} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="ex.: painel em repouso, estimulação preventiva, condição climática..." />
            </div>
            <div className="grid gap-1 md:col-span-2">
              <Label>Observações</Label>
              <Textarea rows={3} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button disabled={!canSave || create.isPending || update.isPending} onClick={() => (editing ? update.mutate() : create.mutate())}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir estimulação?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => remove.mutate()}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
