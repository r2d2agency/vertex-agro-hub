import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Droplets, Download } from "lucide-react";
import { downloadCsv, fmtDateBR } from "@/lib/csv";
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
import { listTappers } from "@/lib/tappers.functions";
import { listTappingTables } from "@/lib/tabelas.functions";
import { getLocalIsoDate } from "@/lib/date-utils";
import {
  createTappingRecord, deleteTappingRecord, listTappingRecords, updateTappingRecord,
  TASK_EXTENTS, END_PERIODS,
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

const today = () => getLocalIsoDate();
function formatTappingDate(record: TappingRecord, timezone?: string | null) {
  const value = record.recordedAt ?? record.date;
  const options: Intl.DateTimeFormatOptions = record.recordedAt
    ? { dateStyle: "short", timeStyle: "short" }
    : { dateStyle: "short" };
  return new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: timezone || "America/Sao_Paulo" }).format(new Date(value));
}
const empty: TappingInput = {
  farmId: "", plotId: "", date: today(), sangradorName: "",
  tapperId: null, taskExtent: "", endPeriod: "",
  treesExpected: null, treesTapped: null, liters: null, drcPercent: null, dryKg: null, adherencePct: null, notes: "",
};

function SangriasPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const qc = useQueryClient();
  const [farmFilter, setFarmFilter] = useState("__all");
  const [sangradorFilter, setSangradorFilter] = useState("__all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TappingRecord | null>(null);
  const [toDelete, setToDelete] = useState<TappingRecord | null>(null);

  const { data: farms = [] } = useQuery({
    queryKey: ["farms", companyId],
    queryFn: () => listFarms(companyId!),
    enabled: !!companyId,
  });

  const { data: tappers = [] } = useQuery({
    queryKey: ["tappers", companyId],
    queryFn: () => listTappers(companyId!),
    enabled: !!companyId,
  });

  const { data: tables = [] } = useQuery({
    queryKey: ["tapping-tables", companyId],
    queryFn: () => listTappingTables(companyId!),
    enabled: !!companyId,
  });

  const { data: plots = [] } = useQuery({
    queryKey: ["plots", companyId, farmFilter],
    queryFn: () => listPlots(companyId!, farmFilter !== "__all" ? farmFilter : undefined),
    enabled: !!companyId,
  });

  const { data: records = [], isLoading: loading } = useQuery({
    queryKey: ["taps", companyId, farmFilter, from, to],
    queryFn: () => listTappingRecords(companyId!, {
      farmId: farmFilter !== "__all" ? farmFilter : undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    enabled: !!companyId,
  });

  const data = useMemo(() => records.filter((r) => sangradorFilter === "__all" || r.sangradorName === sangradorFilter), [records, sangradorFilter]);
  const sangradorNames = useMemo(() => Array.from(new Set(records.map((r) => r.sangradorName).filter(Boolean))).sort(), [records]);

  const exportCsv = () => {
    const farmName = (id?: string | null) => farms.find((f) => f.id === id)?.name ?? "";
    const plotName = (id?: string | null) => plots.find((p) => p.id === id)?.name ?? "";
    const tableName = (id?: string | null) => tables.find((t) => t.id === id)?.name ?? "";
    downloadCsv(`sangrias-${new Date().toISOString().slice(0, 10)}`, data, [
      { key: "date", label: "Data", format: fmtDateBR },
      { key: "sangradorName", label: "Sangrador" },
      { key: "farmId", label: "Fazenda", format: (v) => farmName(v) },
      { key: "plotId", label: "Talhão", format: (v) => plotName(v) },
      { key: "tappingTableId", label: "Tabela", format: (v) => tableName(v) },
      { key: "taskExtent", label: "Tarefa" },
      { key: "endPeriod", label: "Período" },
      { key: "treesTapped", label: "Árvores" },
      { key: "liters", label: "Litros" },
      { key: "drcPercent", label: "DRC %" },
      { key: "dryKg", label: "Kg secos" },
      { key: "adherencePct", label: "Aderência %" },
      { key: "notes", label: "Observações" },
    ]);
  };


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

          <div className="mb-4 flex flex-wrap items-end gap-2">
            <div>
              <span className="mb-1 block text-xs text-muted-foreground">Fazenda</span>
              <Select value={farmFilter} onValueChange={setFarmFilter}>
                <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Todas</SelectItem>
                  {farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="mb-1 block text-xs text-muted-foreground">Sangrador</span>
              <Select value={sangradorFilter} onValueChange={setSangradorFilter}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Todos</SelectItem>
                  {sangradorNames.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="mb-1 block text-xs text-muted-foreground">De</span>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            </div>
            <div>
              <span className="mb-1 block text-xs text-muted-foreground">Até</span>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </div>
            <div className="ml-auto">
              <Button variant="outline" onClick={exportCsv} disabled={!data.length}>
                <Download className="mr-2 h-4 w-4" /> Exportar CSV
              </Button>
            </div>
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
                      <TableHead>Data/hora</TableHead>
                      <TableHead>Sangrador</TableHead>
                      <TableHead>Fazenda</TableHead>
                      <TableHead>Talhão</TableHead>
                      <TableHead>Tabela</TableHead>
                      <TableHead>Tarefa / período</TableHead>
                      <TableHead className="text-right">Árvores</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
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
                        <TableCell>{formatTappingDate(r, farms.find((f) => f.id === r.farmId)?.timezone)}</TableCell>
                        <TableCell className="font-medium">
                          <div>{r.sangradorName}</div>
                          <div className="text-[10px] text-muted-foreground uppercase flex gap-1">
                            {r.status && <span>{r.status}</span>}
                            {r.quality && <span>• {r.quality}</span>}
                          </div>
                        </TableCell>
                        <TableCell>{farms.find((f) => f.id === r.farmId)?.name ?? "—"}</TableCell>
                        <TableCell>{plots.find((p) => p.id === r.plotId)?.name ?? "—"}</TableCell>
                        <TableCell>{tables.find((t) => t.id === r.tappingTableId)?.name ?? "—"}</TableCell>
                        <TableCell>{r.taskExtent ?? "—"}{r.endPeriod ? ` / ${r.endPeriod}` : ""}</TableCell>
                        <TableCell className="text-right">{r.treesTapped ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          <SaldoCell expected={r.treesExpected} tapped={r.treesTapped} />
                        </TableCell>
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

function SaldoCell({ expected, tapped }: { expected?: number | null; tapped?: number | null }) {
  if (expected == null || tapped == null) return <span>—</span>;
  const saldo = tapped - expected;
  if (saldo >= 0) return <span className="text-emerald-600 dark:text-emerald-500">+{saldo}</span>;
  return <span className="text-amber-600 dark:text-amber-500">{saldo}</span>;
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
    () => allTappers.filter((t) => t.stints.some((s) => s.farmId === values.farmId && !s.endAt)),
    [allTappers, values.farmId],
  );

  useEffect(() => {
    if (!open) return;
    if (initial) setValues({
      farmId: initial.farmId ?? "",
      plotId: initial.plotId ?? "",
      tappingTableId: initial.tappingTableId ?? "",
      date: initial.date.slice(0, 10),
      sangradorName: initial.sangradorName,
      tapperId: initial.tapperId ?? null,
      taskExtent: initial.taskExtent ?? "",
      endPeriod: initial.endPeriod ?? "",
      treesExpected: initial.treesExpected ?? null,
      treesTapped: initial.treesTapped ?? null,
      liters: initial.liters ?? null,
      drcPercent: initial.drcPercent ?? null,
      dryKg: initial.dryKg ?? null,
      adherencePct: initial.adherencePct ?? null,
      notes: initial.notes ?? "",
      status: initial.status ?? "",
      quality: initial.quality ?? "",
      tableCondition: initial.tableCondition ?? "",
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
          <div>
            <Label>Sangrador *</Label>
            <Select
              value={values.tapperId || "__none"}
              onValueChange={(v) => {
                const tapper = v !== "__none" ? tappers.find((t) => t.id === v) : undefined;
                setValues((s) => ({ ...s, tapperId: v === "__none" ? null : v, sangradorName: tapper?.fullName ?? s.sangradorName }));
              }}
            >
              <SelectTrigger><SelectValue placeholder={values.farmId ? "Selecione..." : "Selecione a fazenda primeiro"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">—</SelectItem>
                {tappers.map((t) => <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fazenda</Label>
            <Select value={values.farmId || "__none"} onValueChange={(v) => setValues((s) => ({ ...s, farmId: v === "__none" ? "" : v, plotId: "", tapperId: null, sangradorName: "" }))}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">—</SelectItem>
                {farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Talhão</Label>
            <Select
              value={values.plotId || "__none"}
              onValueChange={(v) => {
                const plot = v !== "__none" ? plots.find((p) => p.id === v) : undefined;
                const table = plot?.tappingSystem
                  ? tables.find((t) => t.notation === plot.tappingSystem || t.name === plot.tappingSystem)
                  : undefined;
                setValues((s) => ({
                  ...s,
                  plotId: v === "__none" ? "" : v,
                  treesExpected: plot?.treeCount ?? s.treesExpected,
                  tappingTableId: table?.id ?? s.tappingTableId,
                }));
              }}
              disabled={!values.farmId}
            >
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">—</SelectItem>
                {plots.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tabela de sangria</Label>
            <Select value={values.tappingTableId || "__none"} onValueChange={(v) => setValues((s) => ({ ...s, tappingTableId: v === "__none" ? "" : v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">—</SelectItem>
                {tables.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}{t.notation ? ` — ${t.notation}` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tarefa</Label>
            <Select value={values.taskExtent || "__none"} onValueChange={(v) => setValues((s) => ({ ...s, taskExtent: v === "__none" ? "" : v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">—</SelectItem>
                {TASK_EXTENTS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Período de término</Label>
            <Select value={values.endPeriod || "__none"} onValueChange={(v) => setValues((s) => ({ ...s, endPeriod: v === "__none" ? "" : v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">—</SelectItem>
                {END_PERIODS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Árvores previstas</Label><Input type="number" value={values.treesExpected ?? ""} onChange={(e) => setValues((v) => ({ ...v, treesExpected: e.target.value ? Number(e.target.value) : null }))} /></div>
          <div><Label>Árvores sangradas</Label><Input type="number" value={values.treesTapped ?? ""} onChange={(e) => setValues((v) => ({ ...v, treesTapped: e.target.value ? Number(e.target.value) : null }))} /></div>
          {values.treesExpected != null && values.treesTapped != null && (
            <div className="md:col-span-2 -mt-1 text-xs text-muted-foreground">
              Saldo: <SaldoCell expected={values.treesExpected} tapped={values.treesTapped} /> árvore(s)
            </div>
          )}
          <div><Label>Litros</Label><Input type="number" step="0.01" value={values.liters ?? ""} onChange={(e) => setValues((v) => ({ ...v, liters: e.target.value ? Number(e.target.value) : null }))} /></div>
          <div><Label>DRC (%)</Label><Input type="number" step="0.1" value={values.drcPercent ?? ""} onChange={(e) => setValues((v) => ({ ...v, drcPercent: e.target.value ? Number(e.target.value) : null }))} /></div>
          <div><Label>Aderência à tabela (%)</Label><Input type="number" step="0.1" value={values.adherencePct ?? ""} onChange={(e) => setValues((v) => ({ ...v, adherencePct: e.target.value ? Number(e.target.value) : null }))} /></div>
          <div>
            <Label>Situação</Label>
            <Select value={values.status || "__none"} onValueChange={(v) => setValues((s) => ({ ...s, status: v === "__none" ? "" : v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">—</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="parcial">Parcial</SelectItem>
                <SelectItem value="interrompida">Interrompida</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Qualidade</Label>
            <Select value={values.quality || "__none"} onValueChange={(v) => setValues((s) => ({ ...s, quality: v === "__none" ? "" : v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">—</SelectItem>
                <SelectItem value="excelente">Excelente</SelectItem>
                <SelectItem value="boa">Boa</SelectItem>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="ruim">Ruim</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Condição da Tabela</Label>
            <Select value={values.tableCondition || "__none"} onValueChange={(v) => setValues((s) => ({ ...s, tableCondition: v === "__none" ? "" : v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">—</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="atencao">Atenção</SelectItem>
                <SelectItem value="critica">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Label>Observações</Label><Textarea rows={2} value={values.notes} onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))} /></div>
          <DialogFooter className="md:col-span-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
