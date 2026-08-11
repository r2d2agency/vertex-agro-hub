import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HardHat, Search, Plus, Pencil, Trash2, MapPin, Phone, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { PersonEditor } from "@/components/vertex/person-editor";
import { PageHeader } from "@/components/vertex/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UfSelect } from "@/components/vertex/uf-select";
import { FileDropzone } from "@/components/vertex/file-dropzone";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { listFarms } from "@/lib/fazendas.functions";
import {
  TAPPER_CONTRACT_TYPES, TAPPER_STATUS, addTapperStint, createTapper, deleteTapper,
  deleteTapperStint, endTapperStint, getTapper, listTappers, updateTapper,
  type TapperInput, type TapperListItem,
} from "@/lib/tappers.functions";

export const Route = createFileRoute("/_authenticated/sangradores")({
  head: () => ({
    meta: [
      { title: "Sangradores — Vertex Agro" },
      { name: "description", content: "Ficha cadastral dos sangradores, histórico de fazendas e atividade de sangria." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SangradoresPage,
});

const fmt = (n?: number | null, d = 1) =>
  n ? n.toLocaleString("pt-BR", { maximumFractionDigits: d }) : "—";
const date = (v?: string | null) => (v ? new Date(v).toLocaleDateString("pt-BR") : "—");

function SangradoresPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<TapperListItem | "new" | null>(null);
  const [toDelete, setToDelete] = useState<TapperListItem | null>(null);

  const { data: tappers = [], isLoading: loadingList } = useQuery({
    queryKey: ["tappers", companyId],
    queryFn: () => listTappers(companyId!),
    enabled: !!companyId,
  });

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tappers;
    return tappers.filter((t) =>
      [t.fullName, t.nickname, t.code, t.cpf].some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [tappers, search]);

  const del = useMutation({
    mutationFn: (id: string) => deleteTapper(id),
    onSuccess: () => {
      toast.success("Sangrador removido");
      qc.invalidateQueries({ queryKey: ["tappers", companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Sangradores"
        description="Ficha cadastral no estilo RH: dados básicos, contrato, histórico de fazendas e atividade registrada."
        actions={companyId ? (
          <Button onClick={() => setEditing("new")}><Plus className="mr-2 h-4 w-4" /> Novo sangrador</Button>
        ) : null}
      />

      {!isLoading && companies.length === 0 ? (
        <NoCompanyCard />
      ) : (
        <>
          <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />

          <div className="mb-4 relative max-w-sm">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Buscar por nome, apelido, código ou CPF..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {loadingList ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Carregando...</CardContent></Card>
          ) : list.length === 0 ? (
            <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
              Nenhum sangrador cadastrado. Clique em <b>Novo sangrador</b> para criar a ficha.
            </CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {list.map((t) => {
                const current = t.stints.find((s) => !s.endAt);
                return (
                  <Card key={t.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary">
                          {t.photoUrl
                            ? <img src={t.photoUrl} alt={t.fullName} className="h-full w-full object-cover" />
                            : <HardHat className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{t.fullName}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {t.nickname ? `"${t.nickname}" · ` : ""}{t.code ? `#${t.code} · ` : ""}
                            {t.contractType ?? "Sem contrato"}
                          </p>
                        </div>
                        <Badge variant={t.status === "ativo" ? "default" : "secondary"}>
                          {TAPPER_STATUS.find((s) => s.value === t.status)?.label ?? t.status}
                        </Badge>
                      </div>

                      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                        <p className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {current?.farm?.name ?? "Sem fazenda vinculada"}</p>
                        <p className="flex items-center gap-1"><Phone className="h-3 w-3" /> {t.phone ?? "—"}</p>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                        <Stat label="Sangrias" value={String(t.stats.records)} />
                        <Stat label="Litros" value={fmt(t.stats.liters)} />
                        <Stat label="Kg seco" value={fmt(t.stats.dryKg)} />
                      </div>
                      <p className="mt-2 text-[11px] text-muted-foreground">Última atividade: {date(t.stats.lastDate)}</p>

                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditing(t)}>
                          <Pencil className="mr-2 h-3.5 w-3.5" /> Abrir ficha
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setToDelete(t)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {editing && companyId && (
        <TapperDialog
          companyId={companyId}
          tapper={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover sangrador?</AlertDialogTitle>
            <AlertDialogDescription>
              A ficha de <b>{toDelete?.fullName}</b> será arquivada. Os registros de sangria já lançados permanecem no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (toDelete) del.mutate(toDelete.id); setToDelete(null); }}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function TapperDialog({
  companyId, tapper, onClose,
}: { companyId: string; tapper: TapperListItem | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<TapperInput>({ status: "ativo" });

  const { data: detail, isLoading } = useQuery({
    queryKey: ["tapper", tapper?.id, companyId],
    queryFn: () => getTapper(tapper!.id, companyId),
    enabled: !!tapper,
  });

  useEffect(() => {
    if (tapper) {
      const { id: _i, companyId: _c, createdAt: _cr, ...rest } = tapper as unknown as Record<string, unknown> & TapperListItem;
      setForm({
        ...(rest as TapperInput),
        birthDate: tapper.birthDate?.slice(0, 10) ?? null,
        admissionDate: tapper.admissionDate?.slice(0, 10) ?? null,
        terminationDate: tapper.terminationDate?.slice(0, 10) ?? null,
      });
    }
  }, [tapper]);

  const set = (k: keyof TapperInput, v: unknown) => setForm((f) => ({ ...f, [k]: v as never }));

  const save = useMutation({
    mutationFn: async () => {
      const payload: TapperInput = {
        fullName: form.fullName, nickname: form.nickname, code: form.code, cpf: form.cpf, rg: form.rg,
        birthDate: form.birthDate, phone: form.phone, photoUrl: form.photoUrl,
        addressCity: form.addressCity, addressState: form.addressState,
        contractType: form.contractType, admissionDate: form.admissionDate,
        terminationDate: form.terminationDate, dailyRate: form.dailyRate,
        pisNumber: form.pisNumber, bankPixKey: form.bankPixKey,
        emergencyContactName: form.emergencyContactName, emergencyContactPhone: form.emergencyContactPhone,
        status: form.status ?? "ativo", notes: form.notes,
      };
      if (tapper) return updateTapper(tapper.id, payload);
      if (!payload.fullName || payload.fullName.trim().length < 2) throw new Error("Informe o nome completo");
      return createTapper(companyId, payload);
    },
    onSuccess: () => {
      toast.success("Ficha salva");
      qc.invalidateQueries({ queryKey: ["tappers", companyId] });
      qc.invalidateQueries({ queryKey: ["tapper", tapper?.id, companyId] });
      if (!tapper) onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{tapper ? `Ficha — ${tapper.fullName}` : "Novo sangrador"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="dados" className="flex min-h-0 flex-1 flex-col">
          <TabsList>
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="contrato">Contrato</TabsTrigger>
            <TabsTrigger value="fazendas" disabled={!tapper}>Fazendas</TabsTrigger>
            <TabsTrigger value="atividade" disabled={!tapper}>Atividade</TabsTrigger>
          </TabsList>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1 pt-4">
            <TabsContent value="dados" className="mt-0 space-y-4">
              <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
                <div>
                  <Label className="mb-1.5 block text-xs">Foto</Label>
                  <FileDropzone
                    value={form.photoUrl ?? undefined}
                    preview="image"
                    accept="image/*"
                    label="Foto"
                    onUploaded={(url) => set("photoUrl", url)}
                    onClear={() => set("photoUrl", null)}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <F label="Nome completo *"><Input value={form.fullName ?? ""} onChange={(e) => set("fullName", e.target.value)} /></F>
                  <F label="Apelido"><Input value={form.nickname ?? ""} onChange={(e) => set("nickname", e.target.value)} /></F>
                  <F label="Matrícula / código"><Input value={form.code ?? ""} onChange={(e) => set("code", e.target.value)} /></F>
                  <F label="Situação">
                    <Select value={form.status ?? "ativo"} onValueChange={(v) => set("status", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TAPPER_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </F>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <F label="CPF"><Input value={form.cpf ?? ""} onChange={(e) => set("cpf", e.target.value)} /></F>
                <F label="RG"><Input value={form.rg ?? ""} onChange={(e) => set("rg", e.target.value)} /></F>
                <F label="Nascimento"><Input type="date" value={form.birthDate ?? ""} onChange={(e) => set("birthDate", e.target.value)} /></F>
                <F label="Telefone"><Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></F>
                <F label="Cidade"><Input value={form.addressCity ?? ""} onChange={(e) => set("addressCity", e.target.value)} /></F>
                <F label="UF"><UfSelect value={form.addressState ?? ""} onChange={(v) => set("addressState", v)} /></F>
                <F label="Contato de emergência"><Input value={form.emergencyContactName ?? ""} onChange={(e) => set("emergencyContactName", e.target.value)} /></F>
                <F label="Telefone de emergência"><Input value={form.emergencyContactPhone ?? ""} onChange={(e) => set("emergencyContactPhone", e.target.value)} /></F>
              </div>

              <F label="Observações">
                <Textarea rows={3} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
              </F>
            </TabsContent>

            <TabsContent value="contrato" className="mt-0 grid gap-3 sm:grid-cols-2">
              <F label="Tipo de contrato">
                <Select value={form.contractType ?? ""} onValueChange={(v) => set("contractType", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {TAPPER_CONTRACT_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </F>
              <F label="Valor da diária (R$)">
                <Input type="number" step="0.01" value={form.dailyRate ?? ""} onChange={(e) => set("dailyRate", e.target.value ? Number(e.target.value) : null)} />
              </F>
              <F label="Admissão"><Input type="date" value={form.admissionDate ?? ""} onChange={(e) => set("admissionDate", e.target.value)} /></F>
              <F label="Desligamento"><Input type="date" value={form.terminationDate ?? ""} onChange={(e) => set("terminationDate", e.target.value)} /></F>
              <F label="PIS/PASEP"><Input value={form.pisNumber ?? ""} onChange={(e) => set("pisNumber", e.target.value)} /></F>
              <F label="Chave PIX"><Input value={form.bankPixKey ?? ""} onChange={(e) => set("bankPixKey", e.target.value)} /></F>
            </TabsContent>

            <TabsContent value="fazendas" className="mt-0">
              {tapper && <StintsTab tapperId={tapper.id} companyId={companyId} />}
            </TabsContent>

            <TabsContent value="atividade" className="mt-0 space-y-3">
              {isLoading ? (
                <p className="py-8 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></p>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <Stat label="Sangrias" value={String(detail?.totals.records ?? 0)} />
                    <Stat label="Litros" value={fmt(detail?.totals.liters)} />
                    <Stat label="Kg seco" value={fmt(detail?.totals.dryKg)} />
                    <Stat label="Árvores" value={fmt(detail?.totals.trees, 0)} />
                  </div>
                  {(detail?.activity ?? []).length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Nenhuma sangria registrada com este nome ainda.
                    </p>
                  ) : (
                    <div className="divide-y rounded-md border">
                      {detail!.activity.map((a) => (
                        <div key={a.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                          <span className="w-24 shrink-0 font-medium">{date(a.date)}</span>
                          <span className="min-w-0 flex-1 truncate text-muted-foreground">{a.farm?.name ?? "Sem fazenda"}</span>
                          <span className="text-xs">{fmt(a.liters)} L</span>
                          <span className="text-xs">{fmt(a.dryKg)} kg</span>
                          <span className="text-xs text-muted-foreground">{a.drcPercent ? `DRC ${fmt(a.drcPercent)}%` : ""}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar ficha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StintsTab({ tapperId, companyId }: { tapperId: string; companyId: string }) {
  const qc = useQueryClient();
  const [farmId, setFarmId] = useState("");
  const [startAt, setStartAt] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const { data: farms = [] } = useQuery({ queryKey: ["farms", companyId], queryFn: () => listFarms(companyId) });
  const { data: detail } = useQuery({
    queryKey: ["tapper", tapperId, companyId],
    queryFn: () => getTapper(tapperId, companyId),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["tapper", tapperId, companyId] });
    qc.invalidateQueries({ queryKey: ["tappers", companyId] });
  };

  const add = useMutation({
    mutationFn: () => addTapperStint(tapperId, { companyId, farmId, startAt, notes: notes || undefined }),
    onSuccess: () => { toast.success("Vínculo registrado"); setNotes(""); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const end = useMutation({
    mutationFn: (id: string) => endTapperStint(tapperId, id, companyId),
    onSuccess: () => { toast.success("Vínculo encerrado"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const rm = useMutation({
    mutationFn: (id: string) => deleteTapperStint(tapperId, id, companyId),
    onSuccess: () => { toast.success("Registro excluído"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-md border p-3">
        <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Vincular a uma fazenda</p>
        <div className="grid gap-2 sm:grid-cols-[1fr_150px_auto]">
          <Select value={farmId} onValueChange={setFarmId}>
            <SelectTrigger><SelectValue placeholder="Fazenda" /></SelectTrigger>
            <SelectContent>
              {farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
          <Button disabled={!farmId || add.isPending} onClick={() => add.mutate()}>
            <Plus className="mr-2 h-4 w-4" /> Vincular
          </Button>
        </div>
        <Input className="mt-2" placeholder="Observação (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <p className="mt-2 text-[11px] text-muted-foreground">
          Ao vincular a uma nova fazenda, o vínculo aberto anterior é encerrado automaticamente.
        </p>
      </div>

      {(detail?.stints ?? []).length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma fazenda registrada no histórico.</p>
      ) : (
        <div className="divide-y rounded-md border">
          {detail!.stints.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{s.farm?.name ?? "Fazenda removida"}</p>
                <p className="text-xs text-muted-foreground">
                  {date(s.startAt)} → {s.endAt ? date(s.endAt) : "atual"}
                  {s.endReason ? ` · ${s.endReason}` : ""}{s.notes ? ` · ${s.notes}` : ""}
                </p>
              </div>
              <Badge variant={s.endAt ? "secondary" : "default"}>{s.endAt ? "Encerrado" : "Ativo"}</Badge>
              {!s.endAt && (
                <Button size="sm" variant="outline" onClick={() => end.mutate(s.id)}>Encerrar</Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => rm.mutate(s.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
