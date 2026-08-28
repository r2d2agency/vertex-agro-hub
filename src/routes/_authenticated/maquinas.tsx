import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, ReactNode } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Truck } from "lucide-react";
import { FileDropzone } from "@/components/vertex/file-dropzone";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/vertex/page-header";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  createMachine, deleteMachine, listImplements, listMachines, updateImplement, updateMachine,
  FUEL_TYPES, MACHINE_CATEGORIES, MACHINE_STATUSES, type Machine,
} from "@/lib/frota.functions";
import { listFarms } from "@/lib/fazendas.functions";
import { listPeople } from "@/lib/people.functions";
import { listChecklists } from "@/lib/frota-ops.functions";

export const Route = createFileRoute("/_authenticated/maquinas")({
  head: () => ({ meta: [
    { title: "Máquinas — Vertex Agro" },
    { name: "description", content: "Cadastro de máquinas, tratores e equipamentos motorizados." },
    { name: "robots", content: "noindex" },
  ] }),
  component: MachinesPage,
});

const statusColor: Record<string, string> = {
  disponivel: "bg-green-100 text-green-800",
  em_operacao: "bg-blue-100 text-blue-800",
  em_manutencao: "bg-orange-100 text-orange-800",
  parada: "bg-yellow-100 text-yellow-800",
  indisponivel: "bg-gray-200 text-gray-800",
  inativa: "bg-red-100 text-red-800",
};
const statusLabel = (s: string) => MACHINE_STATUSES.find((x) => x.value === s)?.label ?? s;
const catLabel = (s: string) => MACHINE_CATEGORIES.find((x) => x.value === s)?.label ?? s;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}


function MachinesPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Machine | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Machine | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data = [], isLoading: loading } = useQuery({
    queryKey: ["machines", companyId, statusFilter],
    queryFn: () => listMachines(companyId!, { status: statusFilter || undefined }),
    enabled: !!companyId,
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteMachine(id),
    onSuccess: () => { toast.success("Máquina inativada"); qc.invalidateQueries({ queryKey: ["machines"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Máquinas"
        description="Frota cadastrada por empresa e fazenda."
        actions={companyId && (
          <Button onClick={() => setCreating(true)}><Plus className="mr-2 h-4 w-4" /> Nova máquina</Button>
        )}
      />
      <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />
      {!isLoading && companies.length === 0 && <NoCompanyCard />}

      {companyId && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {MACHINE_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Carregando…</CardContent></Card>
          ) : data.length === 0 ? (
            <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Nenhuma máquina cadastrada.</CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.map((m) => (
                <Card key={m.id} className="transition-colors hover:border-primary/40">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-primary" />
                          <Link to="/maquinas/$id" params={{ id: m.id }} className="truncate font-semibold hover:underline">{m.name}</Link>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1 text-xs text-muted-foreground">
                          {m.code && <span className="font-mono">{m.code}</span>}
                          {m.patrimony && <span>· Pat. {m.patrimony}</span>}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <Badge className={statusColor[m.status] ?? ""} variant="outline">{statusLabel(m.status)}</Badge>
                          <Badge variant="outline">{catLabel(m.category)}</Badge>
                          {m.plate && <Badge variant="outline">{m.plate}</Badge>}
                        </div>
                        <div className="mt-3 text-xs text-muted-foreground">
                          {m.brand} {m.model} {m.year ? `· ${m.year}` : ""}
                          {m.hourmeter != null && <> · Horímetro: {m.hourmeter} {m.hourmeterUnit || "h"}</>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(m)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setToDelete(m)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <MachineDialog
        open={creating || !!editing}
        onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}
        companyId={companyId}
        initial={editing ?? undefined}
        onSaved={() => qc.invalidateQueries({ queryKey: ["machines", companyId] })}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inativar máquina?</AlertDialogTitle>
            <AlertDialogDescription>A máquina será marcada como inativa. O histórico é preservado.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (toDelete) del.mutate(toDelete.id); setToDelete(null); }}>Inativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type FormState = Partial<Machine> & { linkedImplementId?: string | null };
const empty: FormState = {
  name: "",
  category: "trator",
  status: "disponivel",
  hourmeterUnit: "h",
  fuelType: "Diesel S10",
  photoUrls: [],
  linkedImplementId: null,
};

function MachineDialog({
  open, onOpenChange, companyId, initial, onSaved,
}: { open: boolean; onOpenChange: (o: boolean) => void; companyId: string | null; initial?: Machine; onSaved: () => void }) {
  const [v, setV] = useState<FormState>(empty);
  const { data: farms = [] } = useQuery({ queryKey: ["farms", companyId], queryFn: () => listFarms(companyId!), enabled: !!companyId });
  const { data: implementsData = [] } = useQuery({ queryKey: ["implements", companyId], queryFn: () => listImplements(companyId!), enabled: !!companyId });
  const { data: operatorPeople = [] } = useQuery({ queryKey: ["people", companyId], queryFn: () => listPeople(companyId!), enabled: !!companyId });
  const { data: checklists = [] } = useQuery({
    queryKey: ["machine-checklists", companyId, initial?.id],
    queryFn: () => listChecklists(companyId!, initial?.id),
    enabled: !!companyId && !!initial?.id,
  });
  const operators = operatorPeople.filter((person) => person.roles.includes("operador"));

  useEffect(() => {
    if (!open) return;
    const linkedImplementId = initial ? (implementsData.find((item) => item.machineId === initial.id)?.id ?? null) : null;
    setV(initial ? { ...initial, linkedImplementId } : { ...empty, linkedImplementId: null });
  }, [open, initial, implementsData]);

  const mut = useMutation({
    mutationFn: async (data: FormState) => {
      if (!companyId) throw new Error("Selecione uma empresa");
      const { linkedImplementId, ...payload } = data;
      const dto = { ...payload, companyId, name: (data.name || "").trim() };
      // #region debug-point B:machine-submit
      fetch("http://127.0.0.1:7777/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "machine-save-500",
          runId: "pre-fix",
          hypothesisId: "B",
          location: "src/routes/_authenticated/maquinas.tsx:mutationFn",
          msg: "[DEBUG] machine form submit",
          data: {
            companyId,
            initialId: initial?.id ?? null,
            linkedImplementId: linkedImplementId ?? null,
            dto: {
              name: dto.name ?? null,
              category: dto.category ?? null,
              farmId: dto.farmId ?? null,
              defaultOperatorId: dto.defaultOperatorId ?? null,
              photoCount: Array.isArray(dto.photoUrls) ? dto.photoUrls.length : 0,
            },
          },
          ts: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      const machine = initial ? await updateMachine(initial.id, dto as any) : await createMachine(dto as any);
      const currentMachineId = initial?.id ?? machine.id;
      const currentlyLinked = implementsData.filter((item) => item.machineId === currentMachineId);

      for (const item of currentlyLinked) {
        if (item.id !== linkedImplementId) {
          await updateImplement(item.id, { machineId: null });
        }
      }

      if (linkedImplementId) {
        await updateImplement(linkedImplementId, {
          machineId: machine.id,
          farmId: dto.farmId ?? null,
        });
      }

      return machine;
    },
    onSuccess: () => { 
      toast.success(initial ? "Máquina atualizada" : "Máquina criada"); 
      onSaved(); 
      onOpenChange(false); 
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl p-0 overflow-hidden">
        <div className="px-6 pt-6">
          <DialogHeader><DialogTitle>{initial ? "Editar máquina" : "Nova máquina"}</DialogTitle></DialogHeader>
        </div>
        <div className="flex flex-col h-full max-h-[80vh]">
          <Tabs defaultValue="dados" className="flex-1 overflow-auto">
            <div className="px-6">
              <TabsList className="mb-4">
                <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
                <TabsTrigger value="fotos">Fotos</TabsTrigger>
                <TabsTrigger value="checklist">Checklist</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="dados" className="px-6 pb-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Nome da Máquina *"><Input value={v.name || ""} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="Ex: Trator 01" required /></Field>
                <Field label="Código/Prefixo"><Input value={v.code || ""} onChange={(e) => setV({ ...v, code: e.target.value })} placeholder="Ex: T-01" /></Field>
                <Field label="Patrimônio"><Input value={v.patrimony || ""} onChange={(e) => setV({ ...v, patrimony: e.target.value })} /></Field>
                <Field label="Categoria">
                  <Select value={v.category} onValueChange={(val) => setV({ ...v, category: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MACHINE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Marca"><Input value={v.brand || ""} onChange={(e) => setV({ ...v, brand: e.target.value })} /></Field>
                <Field label="Modelo"><Input value={v.model || ""} onChange={(e) => setV({ ...v, model: e.target.value })} /></Field>
                <Field label="Ano"><Input type="number" value={v.year || ""} onChange={(e) => setV({ ...v, year: e.target.value ? Number(e.target.value) : undefined })} /></Field>
                <Field label="Chassi/Serial"><Input value={v.serial || ""} onChange={(e) => setV({ ...v, serial: e.target.value })} /></Field>
                <Field label="Placa"><Input value={v.plate || ""} onChange={(e) => setV({ ...v, plate: e.target.value })} /></Field>
                <Field label="Capacidade Tanque (L)"><Input type="number" step="0.01" value={v.tankCapacity ?? ""} onChange={(e) => setV({ ...v, tankCapacity: e.target.value ? Number(e.target.value) : null })} /></Field>
                <Field label="Tipo Combustível">
                  <Select value={v.fuelType || ""} onValueChange={(val) => setV({ ...v, fuelType: val })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {FUEL_TYPES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Fazenda Vinculada">
                  <Select value={v.farmId || "none"} onValueChange={(x) => setV({ ...v, farmId: x === "none" ? null : x })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— nenhuma —</SelectItem>
                      {farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Operador padrão">
                  <Select value={v.defaultOperatorId || "none"} onValueChange={(x) => setV({ ...v, defaultOperatorId: x === "none" ? null : x })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— nenhum —</SelectItem>
                      {operators.map((operator) => <SelectItem key={operator.id} value={operator.id}>{operator.fullName || "Sem nome"}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Implemento vinculado">
                  <Select value={v.linkedImplementId || "none"} onValueChange={(x) => setV({ ...v, linkedImplementId: x === "none" ? null : x })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— nenhum —</SelectItem>
                      {implementsData.map((item) => (
                        <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div>
                <Label>Notas/Observações</Label>
                <Textarea rows={3} value={v.notes || ""} onChange={(e) => setV({ ...v, notes: e.target.value })} />
              </div>
            </TabsContent>

            <TabsContent value="fotos" className="px-6 pb-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {(v.photoUrls || []).map((url, i) => (
                  <div key={i} className="group relative aspect-square overflow-hidden rounded-md border bg-muted">
                    <img src={url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => setV({ ...v, photoUrls: v.photoUrls?.filter((_, idx) => idx !== i) })}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <FileDropzone
                  preview="image"
                  accept="image/*"
                  label="Adicionar fotos"
                  multiple
                  onUploaded={(url) => setV({ ...v, photoUrls: [...(v.photoUrls || []), url] })}
                  className="aspect-square"
                />
              </div>
            </TabsContent>

            <TabsContent value="checklist" className="px-6 pb-6 space-y-4">
              {!initial?.id ? (
                <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Salve a máquina primeiro para liberar os checklists vinculados.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4">
                    <div>
                      <p className="text-sm font-medium">Checklists da máquina</p>
                      <p className="text-sm text-muted-foreground">
                        Consulte o histórico desta máquina e abra o módulo completo para lançar um novo checklist.
                      </p>
                    </div>
                    <Button asChild variant="outline">
                      <Link to="/checklists">Abrir checklists</Link>
                    </Button>
                  </div>

                  {checklists.length === 0 ? (
                    <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                      Nenhum checklist encontrado para esta máquina.
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {checklists.slice(0, 5).map((checklist) => (
                        <div key={checklist.id} className="rounded-md border p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium">
                                {new Date(checklist.performedAt).toLocaleString("pt-BR")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {checklist.kind} · {checklist.operator?.name ?? "Sem operador"}
                              </p>
                            </div>
                            <Badge variant={checklist.overallStatus === "ok" ? "default" : "destructive"}>
                              {checklist.overallStatus}
                            </Badge>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {checklist.items.length} itens verificados
                            {checklist.hourmeter != null ? ` · Horímetro ${checklist.hourmeter}` : ""}
                          </p>
                          {checklist.notes && (
                            <p className="mt-2 text-xs text-muted-foreground">{checklist.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="px-6 pb-6 border-t pt-4">
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="button" onClick={() => mut.mutate(v)} disabled={mut.isPending}>
              {mut.isPending ? "Salvando…" : "Salvar"}
            </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
