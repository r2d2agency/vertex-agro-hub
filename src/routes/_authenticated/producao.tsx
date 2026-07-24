import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, BarChart3, Download } from "lucide-react";
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
import {
  createDelivery, deleteDelivery, listDeliveries, updateDelivery,
  type Delivery, type DeliveryInput,
} from "@/lib/producao.functions";

export const Route = createFileRoute("/_authenticated/producao")({
  head: () => ({
    meta: [
      { title: "Produção — Vertex Agro" },
      { name: "description", content: "Entregas de produção de látex e cernambi." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProducaoPage,
});

const today = () => new Date().toISOString().slice(0, 10);
const empty: DeliveryInput = {
  farmId: "", season: "", deliveryDate: today(), turnDay: null,
  propertyName: "", ownerName: "", status: "", consultantName: "", monitorName: "",
  coagulant: "", latexType: "", grossWeightKg: null, netWeightKg: null, drcAvgPercent: null, notes: "",
};

function ProducaoPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const qc = useQueryClient();
  const [farmFilter, setFarmFilter] = useState("__all");
  const [seasonFilter, setSeasonFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Delivery | null>(null);
  const [toDelete, setToDelete] = useState<Delivery | null>(null);

  const { data: farms = [] } = useQuery({
    queryKey: ["farms", companyId],
    queryFn: () => listFarms(companyId!),
    enabled: !!companyId,
  });

  const { data = [], isLoading: loading } = useQuery({
    queryKey: ["deliveries", companyId, farmFilter, seasonFilter, from, to],
    queryFn: () => listDeliveries(companyId!, {
      farmId: farmFilter !== "__all" ? farmFilter : undefined,
      season: seasonFilter || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    enabled: !!companyId,
  });

  const exportCsv = () => {
    const farmName = (id?: string | null) => farms.find((f) => f.id === id)?.name ?? "";
    downloadCsv(`producao-${new Date().toISOString().slice(0, 10)}`, data, [
      { key: "deliveryDate", label: "Data", format: fmtDateBR },
      { key: "season", label: "Safra" },
      { key: "farmId", label: "Fazenda", format: (v) => farmName(v) },
      { key: "propertyName", label: "Propriedade" },
      { key: "ownerName", label: "Proprietário" },
      { key: "latexType", label: "Tipo" },
      { key: "coagulant", label: "Coagulante" },
      { key: "grossWeightKg", label: "Peso bruto (kg)" },
      { key: "netWeightKg", label: "Peso líquido (kg)" },
      { key: "drcAvgPercent", label: "DRC %" },
      { key: "dryKg", label: "Kg secos" },
      { key: "consultantName", label: "Consultor" },
      { key: "monitorName", label: "Monitor" },
      { key: "notes", label: "Observações" },
    ]);
  };


  const del = useMutation({
    mutationFn: (id: string) => deleteDelivery(id),
    onSuccess: () => {
      toast.success("Entrega removida");
      qc.invalidateQueries({ queryKey: ["deliveries", companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const summary = useMemo(() => {
    const dry = data.reduce((a, r) => a + (r.dryKg ?? 0), 0);
    const gross = data.reduce((a, r) => a + (r.grossWeightKg ?? 0), 0);
    const net = data.reduce((a, r) => a + (r.netWeightKg ?? 0), 0);
    const drcs = data.filter((r) => r.drcAvgPercent != null).map((r) => r.drcAvgPercent!);
    const drc = drcs.length ? drcs.reduce((a, b) => a + b, 0) / drcs.length : 0;
    return { dry, gross, net, drc, count: data.length };
  }, [data]);

  return (
    <div>
      <PageHeader
        title="Produção"
        description="Entregas de látex e cernambi por fazenda e safra."
        actions={companyId ? <Button onClick={() => setCreating(true)}><Plus className="mr-2 h-4 w-4" /> Nova entrega</Button> : null}
      />

      {!isLoading && companies.length === 0 ? (
        <NoCompanyCard />
      ) : (
        <>
          <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />

          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <SummaryCard label="Entregas" value={summary.count.toLocaleString("pt-BR")} />
            <SummaryCard label="Peso bruto (kg)" value={summary.gross.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} />
            <SummaryCard label="Kg secos" value={summary.dry.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} />
            <SummaryCard label="DRC médio" value={summary.drc ? `${summary.drc.toFixed(1)}%` : "—"} />
          </div>

          <div className="mb-4 flex flex-wrap items-end gap-2">
            <div>
              <span className="mb-1 block text-xs text-muted-foreground">Fazenda</span>
              <Select value={farmFilter} onValueChange={setFarmFilter}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Todas</SelectItem>
                  {farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="mb-1 block text-xs text-muted-foreground">Safra</span>
              <Input className="w-28" placeholder="2025" value={seasonFilter} onChange={(e) => setSeasonFilter(e.target.value)} />
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
                  <BarChart3 className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  Nenhuma entrega registrada.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Safra</TableHead>
                      <TableHead>Propriedade</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Bruto (kg)</TableHead>
                      <TableHead className="text-right">Líquido (kg)</TableHead>
                      <TableHead className="text-right">DRC %</TableHead>
                      <TableHead className="text-right">Kg secos</TableHead>
                      <TableHead className="w-24" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.deliveryDate.slice(0, 10).split("-").reverse().join("/")}</TableCell>
                        <TableCell>{r.season ?? "—"}</TableCell>
                        <TableCell className="font-medium">{r.propertyName ?? "—"}</TableCell>
                        <TableCell>{r.latexType ?? "—"}</TableCell>
                        <TableCell className="text-right">{r.grossWeightKg?.toLocaleString("pt-BR") ?? "—"}</TableCell>
                        <TableCell className="text-right">{r.netWeightKg?.toLocaleString("pt-BR") ?? "—"}</TableCell>
                        <TableCell className="text-right">{r.drcAvgPercent != null ? `${r.drcAvgPercent}%` : "—"}</TableCell>
                        <TableCell className="text-right">{r.dryKg?.toLocaleString("pt-BR") ?? "—"}</TableCell>
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

      <DeliveryDialog
        open={creating || !!editing}
        onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}
        initial={editing ?? undefined}
        companyId={companyId}
        farms={farms}
        onSaved={() => qc.invalidateQueries({ queryKey: ["deliveries", companyId] })}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir entrega?</AlertDialogTitle>
            <AlertDialogDescription>Esta entrega será removida do histórico ativo.</AlertDialogDescription>
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

function DeliveryDialog({
  open, onOpenChange, initial, companyId, farms, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Delivery;
  companyId: string | null;
  farms: { id: string; name: string }[];
  onSaved: () => void;
}) {
  const [values, setValues] = useState<DeliveryInput>(empty);

  useEffect(() => {
    if (!open) return;
    if (initial) setValues({
      farmId: initial.farmId ?? "",
      season: initial.season ?? "",
      deliveryDate: initial.deliveryDate.slice(0, 10),
      turnDay: initial.turnDay ?? null,
      propertyName: initial.propertyName ?? "",
      ownerName: initial.ownerName ?? "",
      status: initial.status ?? "",
      consultantName: initial.consultantName ?? "",
      monitorName: initial.monitorName ?? "",
      coagulant: initial.coagulant ?? "",
      latexType: initial.latexType ?? "",
      grossWeightKg: initial.grossWeightKg ?? null,
      netWeightKg: initial.netWeightKg ?? null,
      drcAvgPercent: initial.drcAvgPercent ?? null,
      notes: initial.notes ?? "",
    });
    else setValues({ ...empty });
  }, [open, initial]);

  const mut = useMutation({
    mutationFn: async () => {
      if (initial) return updateDelivery(initial.id, values);
      return createDelivery(companyId!, values);
    },
    onSuccess: () => {
      toast.success(initial ? "Entrega atualizada" : "Entrega criada");
      onSaved();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>{initial ? "Editar entrega" : "Nova entrega"}</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!values.deliveryDate) return toast.error("Data obrigatória");
            mut.mutate();
          }}
          className="grid gap-3 md:grid-cols-3"
        >
          <div><Label>Data *</Label><Input type="date" value={values.deliveryDate} onChange={(e) => setValues((v) => ({ ...v, deliveryDate: e.target.value }))} required /></div>
          <div><Label>Safra</Label><Input value={values.season} onChange={(e) => setValues((v) => ({ ...v, season: e.target.value }))} placeholder="2025" /></div>
          <div><Label>Dia da virada</Label><Input type="number" value={values.turnDay ?? ""} onChange={(e) => setValues((v) => ({ ...v, turnDay: e.target.value ? Number(e.target.value) : null }))} /></div>
          <div className="md:col-span-2">
            <Label>Fazenda</Label>
            <Select value={values.farmId || "__none"} onValueChange={(v) => setValues((s) => ({ ...s, farmId: v === "__none" ? "" : v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">—</SelectItem>
                {farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Propriedade</Label><Input value={values.propertyName} onChange={(e) => setValues((v) => ({ ...v, propertyName: e.target.value }))} /></div>
          <div><Label>Proprietário</Label><Input value={values.ownerName} onChange={(e) => setValues((v) => ({ ...v, ownerName: e.target.value }))} /></div>
          <div><Label>Status</Label><Input value={values.status} onChange={(e) => setValues((v) => ({ ...v, status: e.target.value }))} /></div>
          <div><Label>Tipo (CL/CN)</Label><Input value={values.latexType} onChange={(e) => setValues((v) => ({ ...v, latexType: e.target.value }))} placeholder="CL" /></div>
          <div><Label>Coagulante</Label><Input value={values.coagulant} onChange={(e) => setValues((v) => ({ ...v, coagulant: e.target.value }))} /></div>
          <div><Label>Consultor</Label><Input value={values.consultantName} onChange={(e) => setValues((v) => ({ ...v, consultantName: e.target.value }))} /></div>
          <div><Label>Monitor</Label><Input value={values.monitorName} onChange={(e) => setValues((v) => ({ ...v, monitorName: e.target.value }))} /></div>
          <div><Label>Peso bruto (kg)</Label><Input type="number" step="0.01" value={values.grossWeightKg ?? ""} onChange={(e) => setValues((v) => ({ ...v, grossWeightKg: e.target.value ? Number(e.target.value) : null }))} /></div>
          <div><Label>Peso líquido (kg)</Label><Input type="number" step="0.01" value={values.netWeightKg ?? ""} onChange={(e) => setValues((v) => ({ ...v, netWeightKg: e.target.value ? Number(e.target.value) : null }))} /></div>
          <div><Label>DRC médio (%)</Label><Input type="number" step="0.1" value={values.drcAvgPercent ?? ""} onChange={(e) => setValues((v) => ({ ...v, drcAvgPercent: e.target.value ? Number(e.target.value) : null }))} /></div>
          <div className="md:col-span-3"><Label>Observações</Label><Textarea rows={3} value={values.notes} onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))} /></div>
          <DialogFooter className="md:col-span-3">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
