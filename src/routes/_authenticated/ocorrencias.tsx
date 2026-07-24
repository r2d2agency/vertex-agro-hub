import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, AlertTriangle, Download } from "lucide-react";
import { downloadCsv, fmtDateBR } from "@/lib/csv";
import { toast } from "sonner";
import { PageHeader } from "@/components/vertex/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  createOccurrence, deleteOccurrence, listOccurrences, updateOccurrence,
  OCC_TYPES, OCC_SEVERITIES, OCC_STATUS,
  type Occurrence, type OccurrenceInput,
} from "@/lib/ocorrencias.functions";

export const Route = createFileRoute("/_authenticated/ocorrencias")({
  head: () => ({ meta: [
    { title: "Ocorrências — Vertex Agro" },
    { name: "description", content: "Registro e acompanhamento de ocorrências operacionais em campo." },
    { name: "robots", content: "noindex" },
  ]}),
  component: OccurrencesPage,
});

const today = () => new Date().toISOString().slice(0, 10);
const empty: OccurrenceInput = {
  farmId: "", date: today(), type: "outro", severity: "media", status: "aberta",
  title: "", description: "", responsible: "",
};

const sevColor: Record<string, string> = {
  baixa: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  media: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  alta: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  critica: "bg-red-500/15 text-red-700 dark:text-red-300",
};
const statusColor: Record<string, string> = {
  aberta: "bg-red-500/15 text-red-700 dark:text-red-300",
  em_andamento: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  resolvida: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  cancelada: "bg-muted text-muted-foreground",
};
const label = (opts: readonly { value: string; label: string }[], v: string) =>
  opts.find((o) => o.value === v)?.label ?? v;

function OccurrencesPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("__all");
  const [farmFilter, setFarmFilter] = useState("__all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Occurrence | null>(null);
  const [toDelete, setToDelete] = useState<Occurrence | null>(null);

  const { data: farms = [] } = useQuery({
    queryKey: ["farms", companyId], queryFn: () => listFarms(companyId!), enabled: !!companyId,
  });

  const { data = [], isLoading: loading } = useQuery({
    queryKey: ["occurrences", companyId, statusFilter, farmFilter, from, to],
    queryFn: () => listOccurrences(companyId!, {
      status: statusFilter !== "__all" ? statusFilter : undefined,
      farmId: farmFilter !== "__all" ? farmFilter : undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    enabled: !!companyId,
  });

  const exportCsv = () => {
    const farmName = (id?: string | null) => farms.find((f) => f.id === id)?.name ?? "";
    downloadCsv(`ocorrencias-${new Date().toISOString().slice(0, 10)}`, data, [
      { key: "date", label: "Data", format: fmtDateBR },
      { key: "title", label: "Título" },
      { key: "farmId", label: "Fazenda", format: (v) => farmName(v) },
      { key: "type", label: "Tipo", format: (v) => label(OCC_TYPES, v) },
      { key: "severity", label: "Severidade", format: (v) => label(OCC_SEVERITIES, v) },
      { key: "status", label: "Status", format: (v) => label(OCC_STATUS, v) },
      { key: "responsible", label: "Responsável" },
      { key: "description", label: "Descrição" },
    ]);
  };


  const del = useMutation({
    mutationFn: (id: string) => deleteOccurrence(id),
    onSuccess: () => { toast.success("Ocorrência removida"); qc.invalidateQueries({ queryKey: ["occurrences", companyId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const summary = useMemo(() => ({
    total: data.length,
    abertas: data.filter((o) => o.status === "aberta").length,
    andamento: data.filter((o) => o.status === "em_andamento").length,
    criticas: data.filter((o) => o.severity === "critica" && o.status !== "resolvida" && o.status !== "cancelada").length,
  }), [data]);

  const farmName = (id?: string | null) => farms.find((f) => f.id === id)?.name ?? "—";

  return (
    <div>
      <PageHeader
        title="Ocorrências"
        description="Registro e acompanhamento de ocorrências operacionais."
        actions={companyId ? <Button onClick={() => setCreating(true)}><Plus className="mr-2 h-4 w-4" /> Nova ocorrência</Button> : null}
      />

      {!isLoading && companies.length === 0 ? <NoCompanyCard /> : (
        <>
          <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />

          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <SummaryCard label="Total" value={summary.total.toString()} />
            <SummaryCard label="Abertas" value={summary.abertas.toString()} />
            <SummaryCard label="Em andamento" value={summary.andamento.toString()} />
            <SummaryCard label="Críticas ativas" value={summary.criticas.toString()} />
          </div>

          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todos</SelectItem>
                {OCC_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Carregando...</div>
              ) : data.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  <AlertTriangle className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  Nenhuma ocorrência registrada.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Fazenda</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Severidade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead className="w-24" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell>{o.date.slice(0, 10).split("-").reverse().join("/")}</TableCell>
                        <TableCell className="font-medium">{o.title}</TableCell>
                        <TableCell>{farmName(o.farmId)}</TableCell>
                        <TableCell>{label(OCC_TYPES, o.type)}</TableCell>
                        <TableCell><Badge className={sevColor[o.severity]}>{label(OCC_SEVERITIES, o.severity)}</Badge></TableCell>
                        <TableCell><Badge className={statusColor[o.status]}>{label(OCC_STATUS, o.status)}</Badge></TableCell>
                        <TableCell>{o.responsible ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(o)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setToDelete(o)}><Trash2 className="h-4 w-4" /></Button>
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

      <OccDialog
        open={creating || !!editing}
        onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}
        initial={editing ?? undefined}
        companyId={companyId}
        farms={farms}
        onSaved={() => qc.invalidateQueries({ queryKey: ["occurrences", companyId] })}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ocorrência?</AlertDialogTitle>
            <AlertDialogDescription>A ocorrência será removida do histórico ativo.</AlertDialogDescription>
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

function OccDialog({
  open, onOpenChange, initial, companyId, farms, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Occurrence;
  companyId: string | null;
  farms: { id: string; name: string }[];
  onSaved: () => void;
}) {
  const [values, setValues] = useState<OccurrenceInput>(empty);

  useEffect(() => {
    if (!open) return;
    if (initial) setValues({
      farmId: initial.farmId ?? "",
      plotId: initial.plotId ?? "",
      date: initial.date.slice(0, 10),
      type: initial.type,
      severity: initial.severity,
      status: initial.status,
      title: initial.title,
      description: initial.description ?? "",
      responsible: initial.responsible ?? "",
    });
    else setValues({ ...empty });
  }, [open, initial]);

  const mut = useMutation({
    mutationFn: async () => initial ? updateOccurrence(initial.id, values) : createOccurrence(companyId!, values),
    onSuccess: () => { toast.success(initial ? "Ocorrência atualizada" : "Ocorrência criada"); onSaved(); onOpenChange(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{initial ? "Editar ocorrência" : "Nova ocorrência"}</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!values.title.trim()) return toast.error("Título obrigatório");
            if (!values.date) return toast.error("Data obrigatória");
            mut.mutate();
          }}
          className="grid gap-3 md:grid-cols-2"
        >
          <div className="md:col-span-2"><Label>Título *</Label><Input value={values.title} onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))} required /></div>
          <div><Label>Data *</Label><Input type="date" value={values.date} onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))} required /></div>
          <div>
            <Label>Fazenda</Label>
            <Select value={values.farmId || "__none"} onValueChange={(v) => setValues((s) => ({ ...s, farmId: v === "__none" ? "" : v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">—</SelectItem>
                {farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo *</Label>
            <Select value={values.type} onValueChange={(v) => setValues((s) => ({ ...s, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{OCC_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Severidade *</Label>
            <Select value={values.severity} onValueChange={(v) => setValues((s) => ({ ...s, severity: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{OCC_SEVERITIES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status *</Label>
            <Select value={values.status} onValueChange={(v) => setValues((s) => ({ ...s, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{OCC_STATUS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Responsável</Label><Input value={values.responsible ?? ""} onChange={(e) => setValues((v) => ({ ...v, responsible: e.target.value }))} /></div>
          <div className="md:col-span-2"><Label>Descrição</Label><Textarea rows={4} value={values.description ?? ""} onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))} /></div>
          <DialogFooter className="md:col-span-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
