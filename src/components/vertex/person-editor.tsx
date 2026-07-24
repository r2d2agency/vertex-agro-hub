import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ExternalLink, Star, ShieldOff, ShieldCheck } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CepInput } from "@/components/vertex/cep-input";
import { UfSelect } from "@/components/vertex/uf-select";
import { FileDropzone } from "@/components/vertex/file-dropzone";
import { listFarms } from "@/lib/fazendas.functions";
import {
  ASSIGNMENT_ROLES, CONTRACT_TYPES, DOCUMENT_KINDS, GENDERS, MARITAL_STATUSES,
  createPersonAssignment, createPersonDocument, createPersonEvaluation,
  deletePersonAssignment, deletePersonDocument, deletePersonEvaluation,
  endPersonAssignment, getPerson, listPeople, listPersonAssignments,
  listPersonDocuments, listPersonEvaluations, setPersonActive,
  updatePersonPersonal, upsertPersonEmployment,
  type AssignmentRole, type Employment, type PersonalData,
} from "@/lib/people.functions";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string | null;
  companyId: string;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

const EMPTY_PERSONAL: PersonalData = {};
const EMPTY_EMPLOYMENT = (companyId: string): Employment => ({ companyId });

export function PersonEditor({ open, onOpenChange, userId, companyId }: Props) {
  const qc = useQueryClient();
  const [personal, setPersonal] = useState<PersonalData>(EMPTY_PERSONAL);
  const [employment, setEmployment] = useState<Employment>(EMPTY_EMPLOYMENT(companyId));

  const { data, isLoading } = useQuery({
    queryKey: ["person", userId, companyId],
    queryFn: () => getPerson(userId!, companyId),
    enabled: open && !!userId && !!companyId,
  });

  useEffect(() => {
    if (!data) return;
    const {
      fullName, cpf, rg, birthDate, gender, maritalStatus, nationality, avatarUrl, notes,
      phone, phoneAlt, addressCep, addressStreet, addressNumber, addressComplement,
      addressDistrict, addressCity, addressState, emergencyContactName, emergencyContactPhone,
    } = data;
    setPersonal({
      fullName, cpf, rg,
      birthDate: birthDate ? String(birthDate).slice(0, 10) : "",
      gender, maritalStatus, nationality, avatarUrl, notes,
      phone, phoneAlt, addressCep, addressStreet, addressNumber, addressComplement,
      addressDistrict, addressCity, addressState, emergencyContactName, emergencyContactPhone,
    });
    setEmployment(
      data.employment
        ? {
            ...data.employment,
            companyId,
            admissionDate: data.employment.admissionDate ? String(data.employment.admissionDate).slice(0, 10) : "",
            terminationDate: data.employment.terminationDate ? String(data.employment.terminationDate).slice(0, 10) : "",
          }
        : EMPTY_EMPLOYMENT(companyId),
    );
  }, [data, companyId]);

  const savePersonal = useMutation({
    mutationFn: () => updatePersonPersonal(userId!, companyId, personal),
    onSuccess: () => {
      toast.success("Dados pessoais atualizados");
      qc.invalidateQueries({ queryKey: ["people", companyId] });
      qc.invalidateQueries({ queryKey: ["person", userId, companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveEmployment = useMutation({
    mutationFn: () => upsertPersonEmployment(userId!, {
      ...employment,
      companyId,
      salary: employment.salary === "" || employment.salary == null ? null : Number(employment.salary),
    }),
    onSuccess: () => {
      toast.success("Vínculo profissional salvo");
      qc.invalidateQueries({ queryKey: ["person", userId, companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: (v: { active: boolean; reason?: string }) =>
      setPersonActive(userId!, companyId, v.active, v.reason),
    onSuccess: (_r, v) => {
      toast.success(v.active ? "Acesso reativado" : "Acesso desativado");
      qc.invalidateQueries({ queryKey: ["people", companyId] });
      qc.invalidateQueries({ queryKey: ["person", userId, companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (patch: PersonalData) => setPersonal((p) => ({ ...p, ...patch }));
  const setE = (patch: Partial<Employment>) => setEmployment((p) => ({ ...p, ...patch }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DialogTitle>Ficha cadastral{data?.fullName ? ` — ${data.fullName}` : ""}</DialogTitle>
            {data && (
              <div className="flex items-center gap-3">
                <Badge variant={data.active ? "default" : "destructive"}>
                  {data.active ? (
                    <><ShieldCheck className="mr-1 h-3 w-3" /> Ativo</>
                  ) : (
                    <><ShieldOff className="mr-1 h-3 w-3" /> Inativo</>
                  )}
                </Badge>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={data.active}
                    disabled={toggleActive.isPending}
                    onCheckedChange={(v) => {
                      if (!v) {
                        const reason = window.prompt("Motivo do desligamento (opcional):") ?? undefined;
                        toggleActive.mutate({ active: false, reason });
                      } else {
                        toggleActive.mutate({ active: true });
                      }
                    }}
                  />
                  <span className="text-xs text-muted-foreground">Acesso ao sistema</span>
                </div>
              </div>
            )}
          </div>
          {data && !data.active && data.deactivationReason && (
            <p className="text-xs text-destructive">
              Desligado{data.deactivatedAt ? ` em ${String(data.deactivatedAt).slice(0, 10)}` : ""}: {data.deactivationReason}
            </p>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <Tabs defaultValue="personal">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="personal">Pessoal</TabsTrigger>
              <TabsTrigger value="contact">Contato</TabsTrigger>
              <TabsTrigger value="employment">Profissional</TabsTrigger>
              <TabsTrigger value="assignments">Fazendas</TabsTrigger>
              <TabsTrigger value="evaluations">Avaliações</TabsTrigger>
              <TabsTrigger value="documents">Documentos</TabsTrigger>
            </TabsList>

            <ScrollArea className="max-h-[65vh] pr-4">
              <TabsContent value="personal" className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Nome completo *">
                  <Input value={personal.fullName ?? ""} onChange={(e) => set({ fullName: e.target.value })} />
                </Field>
                <Field label="CPF">
                  <Input value={personal.cpf ?? ""} onChange={(e) => set({ cpf: e.target.value })} placeholder="000.000.000-00" />
                </Field>
                <Field label="RG">
                  <Input value={personal.rg ?? ""} onChange={(e) => set({ rg: e.target.value })} />
                </Field>
                <Field label="Data de nascimento">
                  <Input type="date" value={personal.birthDate ?? ""} onChange={(e) => set({ birthDate: e.target.value })} />
                </Field>
                <Field label="Gênero">
                  <Select value={personal.gender ?? ""} onValueChange={(v) => set({ gender: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Estado civil">
                  <Select value={personal.maritalStatus ?? ""} onValueChange={(v) => set({ maritalStatus: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {MARITAL_STATUSES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Nacionalidade">
                  <Input value={personal.nationality ?? ""} onChange={(e) => set({ nationality: e.target.value })} placeholder="Brasileira" />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Foto do colaborador">
                    <FileDropzone
                      value={personal.avatarUrl ?? ""}
                      preview="image"
                      accept="image/*"
                      label="Arraste a foto aqui ou clique para carregar do PC"
                      onUploaded={(url) => set({ avatarUrl: url })}
                      onClear={() => set({ avatarUrl: "" })}
                    />
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Field label="Observações">
                    <Textarea rows={3} value={personal.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} />
                  </Field>
                </div>
              </TabsContent>

              <TabsContent value="contact" className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Telefone principal">
                  <Input value={personal.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} placeholder="(00) 00000-0000" />
                </Field>
                <Field label="Telefone alternativo">
                  <Input value={personal.phoneAlt ?? ""} onChange={(e) => set({ phoneAlt: e.target.value })} />
                </Field>
                <Field label="CEP">
                  <CepInput
                    value={personal.addressCep ?? ""}
                    onChange={(v) => set({ addressCep: v })}
                    onFilled={(d) => set({
                      addressCep: d.cep, addressStreet: d.endereco, addressDistrict: d.bairro,
                      addressCity: d.cidade, addressState: d.uf,
                    })}
                  />
                </Field>
                <Field label="UF">
                  <UfSelect value={personal.addressState ?? ""} onChange={(v) => set({ addressState: v })} />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Logradouro">
                    <Input value={personal.addressStreet ?? ""} onChange={(e) => set({ addressStreet: e.target.value })} />
                  </Field>
                </div>
                <Field label="Número">
                  <Input value={personal.addressNumber ?? ""} onChange={(e) => set({ addressNumber: e.target.value })} />
                </Field>
                <Field label="Complemento">
                  <Input value={personal.addressComplement ?? ""} onChange={(e) => set({ addressComplement: e.target.value })} />
                </Field>
                <Field label="Bairro">
                  <Input value={personal.addressDistrict ?? ""} onChange={(e) => set({ addressDistrict: e.target.value })} />
                </Field>
                <Field label="Cidade">
                  <Input value={personal.addressCity ?? ""} onChange={(e) => set({ addressCity: e.target.value })} />
                </Field>
                <Field label="Contato de emergência (nome)">
                  <Input value={personal.emergencyContactName ?? ""} onChange={(e) => set({ emergencyContactName: e.target.value })} />
                </Field>
                <Field label="Contato de emergência (telefone)">
                  <Input value={personal.emergencyContactPhone ?? ""} onChange={(e) => set({ emergencyContactPhone: e.target.value })} />
                </Field>
              </TabsContent>

              <TabsContent value="employment" className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Cargo / função">
                  <Input value={employment.position ?? ""} onChange={(e) => setE({ position: e.target.value })} />
                </Field>
                <Field label="Matrícula">
                  <Input value={employment.employeeCode ?? ""} onChange={(e) => setE({ employeeCode: e.target.value })} />
                </Field>
                <Field label="Data de admissão">
                  <Input type="date" value={employment.admissionDate ?? ""} onChange={(e) => setE({ admissionDate: e.target.value })} />
                </Field>
                <Field label="Data de desligamento">
                  <Input type="date" value={employment.terminationDate ?? ""} onChange={(e) => setE({ terminationDate: e.target.value })} />
                </Field>
                <Field label="Tipo de contrato">
                  <Select value={employment.contractType ?? ""} onValueChange={(v) => setE({ contractType: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {CONTRACT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Salário (R$)">
                  <Input type="number" step="0.01" value={employment.salary ?? ""} onChange={(e) => setE({ salary: e.target.value })} />
                </Field>
                <Field label="PIS / PASEP">
                  <Input value={employment.pisNumber ?? ""} onChange={(e) => setE({ pisNumber: e.target.value })} />
                </Field>
                <Field label="CTPS">
                  <Input value={employment.ctpsNumber ?? ""} onChange={(e) => setE({ ctpsNumber: e.target.value })} />
                </Field>
                <Field label="Banco">
                  <Input value={employment.bankName ?? ""} onChange={(e) => setE({ bankName: e.target.value })} />
                </Field>
                <Field label="Agência">
                  <Input value={employment.bankAgency ?? ""} onChange={(e) => setE({ bankAgency: e.target.value })} />
                </Field>
                <Field label="Conta">
                  <Input value={employment.bankAccount ?? ""} onChange={(e) => setE({ bankAccount: e.target.value })} />
                </Field>
                <Field label="Chave PIX">
                  <Input value={employment.bankPixKey ?? ""} onChange={(e) => setE({ bankPixKey: e.target.value })} />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Observações do vínculo">
                    <Textarea rows={3} value={employment.notes ?? ""} onChange={(e) => setE({ notes: e.target.value })} />
                  </Field>
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <Button onClick={() => saveEmployment.mutate()} disabled={saveEmployment.isPending}>
                    {saveEmployment.isPending ? "Salvando..." : "Salvar vínculo profissional"}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="assignments" className="mt-4">
                <AssignmentsTab userId={userId!} companyId={companyId} personRoles={data?.roles ?? []} />
              </TabsContent>

              <TabsContent value="evaluations" className="mt-4">
                <EvaluationsTab userId={userId!} companyId={companyId} />
              </TabsContent>

              <TabsContent value="documents" className="mt-4">
                <DocumentsTab userId={userId!} companyId={companyId} />
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={() => savePersonal.mutate()} disabled={savePersonal.isPending || isLoading}>
            {savePersonal.isPending ? "Salvando..." : "Salvar dados pessoais"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DocumentsTab({ userId, companyId }: { userId: string; companyId: string }) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<string>("RG");
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["person-docs", userId, companyId],
    queryFn: () => listPersonDocuments(userId, companyId),
  });

  const create = useMutation({
    mutationFn: () => createPersonDocument(userId, {
      companyId, kind, name: name || kind, number: number || null,
      fileUrl: fileUrl || null,
      issuedAt: issuedAt || null,
      expiresAt: expiresAt || null,
      notes: null,
    }),
    onSuccess: () => {
      toast.success("Documento adicionado");
      setName(""); setNumber(""); setFileUrl(""); setIssuedAt(""); setExpiresAt("");
      qc.invalidateQueries({ queryKey: ["person-docs", userId, companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (docId: string) => deletePersonDocument(userId, docId, companyId),
    onSuccess: () => {
      toast.success("Documento removido");
      qc.invalidateQueries({ queryKey: ["person-docs", userId, companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-3">
          <Field label="Tipo">
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOCUMENT_KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Nome / descrição">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: RG frente" />
          </Field>
          <Field label="Número">
            <Input value={number} onChange={(e) => setNumber(e.target.value)} />
          </Field>
          <Field label="Emissão">
            <Input type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} />
          </Field>
          <Field label="Validade">
            <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </Field>
          <div className="md:col-span-3">
            <Field label="Arquivo do documento">
              <FileDropzone
                value={fileUrl}
                preview="file"
                label="Arraste o arquivo (PDF, imagem, DOC...) ou clique para carregar do PC"
                onUploaded={(url, meta) => {
                  setFileUrl(url);
                  if (!name) setName(meta.originalName);
                }}
                onClear={() => setFileUrl("")}
              />
            </Field>
          </div>
          <div className="md:col-span-3 flex justify-end">
            <Button size="sm" onClick={() => create.mutate()} disabled={create.isPending}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar documento
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : data.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhum documento cadastrado.</p>
      ) : (
        <div className="grid gap-2">
          {data.map((d) => (
            <Card key={d.id}>
              <CardContent className="flex flex-wrap items-center gap-3 p-3">
                <Badge variant="secondary">{d.kind}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[d.number && `Nº ${d.number}`, d.issuedAt && `Emissão: ${String(d.issuedAt).slice(0, 10)}`, d.expiresAt && `Val.: ${String(d.expiresAt).slice(0, 10)}`]
                      .filter(Boolean).join(" • ") || "—"}
                  </p>
                </div>
                {d.fileUrl && (
                  <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                    Abrir <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => del.mutate(d.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AssignmentsTab({ userId, companyId, personRoles }: { userId: string; companyId: string; personRoles: string[] }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const defaultRole: AssignmentRole =
    personRoles.includes("consultor") ? "consultor" :
    personRoles.includes("monitor") ? "monitor" : "sangrador";
  const [role, setRole] = useState<AssignmentRole>(defaultRole);
  const [farmId, setFarmId] = useState<string>("");
  const [consultorUserId, setConsultorUserId] = useState<string>("");
  const [startAt, setStartAt] = useState<string>(today);
  const [notes, setNotes] = useState("");

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["person-assignments", userId, companyId],
    queryFn: () => listPersonAssignments(userId, companyId),
  });

  const { data: farms = [] } = useQuery({
    queryKey: ["farms", companyId],
    queryFn: () => listFarms(companyId),
  });

  const { data: people = [] } = useQuery({
    queryKey: ["people", companyId],
    queryFn: () => listPeople(companyId),
  });

  const consultores = useMemo(
    () => people.filter((p) => p.roles.includes("consultor")),
    [people],
  );

  const create = useMutation({
    mutationFn: () => createPersonAssignment(userId, {
      companyId, farmId, role,
      consultorUserId: role === "consultor" ? undefined : (consultorUserId || undefined),
      startAt, notes: notes || undefined,
    }),
    onSuccess: () => {
      toast.success("Vínculo cadastrado");
      setFarmId(""); setConsultorUserId(""); setNotes("");
      qc.invalidateQueries({ queryKey: ["person-assignments", userId, companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const end = useMutation({
    mutationFn: (id: string) => {
      const reason = window.prompt("Motivo do desligamento deste vínculo (opcional):") ?? undefined;
      return endPersonAssignment(userId, id, companyId, today, reason);
    },
    onSuccess: () => {
      toast.success("Vínculo encerrado");
      qc.invalidateQueries({ queryKey: ["person-assignments", userId, companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => deletePersonAssignment(userId, id, companyId),
    onSuccess: () => {
      toast.success("Vínculo removido do histórico");
      qc.invalidateQueries({ queryKey: ["person-assignments", userId, companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const active = assignments.filter((a) => !a.endAt);
  const history = assignments.filter((a) => a.endAt);

  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-3">
          <Field label="Papel na fazenda">
            <Select value={role} onValueChange={(v) => setRole(v as AssignmentRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ASSIGNMENT_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Fazenda *">
            <Select value={farmId} onValueChange={setFarmId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {farms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}{f.code ? ` (${f.code})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Data de início *">
            <Input type="date" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
          </Field>
          {role !== "consultor" && (
            <Field label="Consultor responsável">
              <Select value={consultorUserId} onValueChange={setConsultorUserId}>
                <SelectTrigger><SelectValue placeholder="Sem consultor" /></SelectTrigger>
                <SelectContent>
                  {consultores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.fullName || c.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <div className="md:col-span-3">
            <Field label="Observações">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: atua nas quadras 1 a 3" />
            </Field>
          </div>
          <div className="md:col-span-3 flex justify-end">
            <Button size="sm" onClick={() => farmId ? create.mutate() : toast.error("Selecione a fazenda")} disabled={create.isPending}>
              <Plus className="mr-2 h-4 w-4" /> Vincular à fazenda
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <>
          <div>
            <h4 className="mb-2 text-sm font-semibold">Vínculos ativos ({active.length})</h4>
            {active.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum vínculo ativo.</p>
            ) : (
              <div className="grid gap-2">
                {active.map((a) => (
                  <AssignmentRow key={a.id} a={a} onEnd={() => end.mutate(a.id)} onDelete={() => del.mutate(a.id)} />
                ))}
              </div>
            )}
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold">Histórico ({history.length})</h4>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem histórico.</p>
            ) : (
              <div className="grid gap-2">
                {history.map((a) => (
                  <AssignmentRow key={a.id} a={a} historical onDelete={() => del.mutate(a.id)} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function AssignmentRow({
  a, historical, onEnd, onDelete,
}: {
  a: any; historical?: boolean; onEnd?: () => void; onDelete: () => void;
}) {
  const roleLabel = ASSIGNMENT_ROLES.find((r) => r.value === a.role)?.label ?? a.role;
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 p-3">
        <Badge variant={historical ? "secondary" : "default"}>{roleLabel}</Badge>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {a.farm?.name ?? "Fazenda"}{a.farm?.code ? ` — ${a.farm.code}` : ""}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {String(a.startAt).slice(0, 10)} → {a.endAt ? String(a.endAt).slice(0, 10) : "atual"}
            {a.consultor ? ` • Consultor: ${a.consultor.fullName || a.consultor.email}` : ""}
            {a.notes ? ` • ${a.notes}` : ""}
            {a.endReason ? ` • Motivo: ${a.endReason}` : ""}
          </p>
        </div>
        {!historical && onEnd && (
          <Button variant="outline" size="sm" onClick={onEnd}>Encerrar</Button>
        )}
        <Button variant="ghost" size="icon" className="text-destructive" onClick={onDelete} title="Excluir registro">
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function EvaluationsTab({ userId, companyId }: { userId: string; companyId: string }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [ratedAt, setRatedAt] = useState<string>(today);
  const [rating, setRating] = useState<number>(5);
  const [category, setCategory] = useState<string>("Desempenho");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["person-evals", userId, companyId],
    queryFn: () => listPersonEvaluations(userId, companyId),
  });

  const create = useMutation({
    mutationFn: () => createPersonEvaluation(userId, {
      companyId, ratedAt, rating,
      category: category || undefined,
      title: title || undefined,
      notes: notes || undefined,
    }),
    onSuccess: () => {
      toast.success("Avaliação registrada");
      setTitle(""); setNotes("");
      qc.invalidateQueries({ queryKey: ["person-evals", userId, companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => deletePersonEvaluation(userId, id, companyId),
    onSuccess: () => {
      toast.success("Avaliação removida");
      qc.invalidateQueries({ queryKey: ["person-evals", userId, companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const avg = data.length ? (data.reduce((s, e) => s + e.rating, 0) / data.length).toFixed(1) : "—";

  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-4">
          <Field label="Data">
            <Input type="date" value={ratedAt} onChange={(e) => setRatedAt(e.target.value)} />
          </Field>
          <Field label="Nota (1 a 5)">
            <Select value={String(rating)} onValueChange={(v) => setRating(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n} ★</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Categoria">
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Desempenho, conduta, técnica..." />
          </Field>
          <Field label="Título">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <div className="md:col-span-4">
            <Field label="Observações">
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
          <div className="md:col-span-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Média geral: <span className="font-semibold text-foreground">{avg}</span></p>
            <Button size="sm" onClick={() => create.mutate()} disabled={create.isPending}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar avaliação
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : data.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma avaliação cadastrada.</p>
      ) : (
        <div className="grid gap-2">
          {data.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex flex-wrap items-center gap-3 p-3">
                <div className="flex items-center gap-0.5 text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < e.rating ? "fill-current" : "opacity-30"}`} />
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {e.title || e.category || "Avaliação"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {String(e.ratedAt).slice(0, 10)}
                    {e.evaluator ? ` • por ${e.evaluator.fullName || e.evaluator.email}` : ""}
                    {e.notes ? ` • ${e.notes}` : ""}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => del.mutate(e.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
