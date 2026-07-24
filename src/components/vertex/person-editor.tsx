import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ExternalLink } from "lucide-react";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CepInput } from "@/components/vertex/cep-input";
import { UfSelect } from "@/components/vertex/uf-select";
import {
  CONTRACT_TYPES, DOCUMENT_KINDS, GENDERS, MARITAL_STATUSES,
  createPersonDocument, deletePersonDocument, getPerson, listPersonDocuments,
  updatePersonPersonal, upsertPersonEmployment,
  type Employment, type PersonalData,
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

  const set = (patch: PersonalData) => setPersonal((p) => ({ ...p, ...patch }));
  const setE = (patch: Partial<Employment>) => setEmployment((p) => ({ ...p, ...patch }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Ficha cadastral{data?.fullName ? ` — ${data.fullName}` : ""}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <Tabs defaultValue="personal">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="personal">Pessoal</TabsTrigger>
              <TabsTrigger value="contact">Contato</TabsTrigger>
              <TabsTrigger value="employment">Profissional</TabsTrigger>
              <TabsTrigger value="documents">Documentos</TabsTrigger>
            </TabsList>

            <ScrollArea className="max-h-[65vh] pr-4">
              {/* PESSOAL */}
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
                <Field label="URL da foto">
                  <Input value={personal.avatarUrl ?? ""} onChange={(e) => set({ avatarUrl: e.target.value })} placeholder="https://..." />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Observações">
                    <Textarea rows={3} value={personal.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} />
                  </Field>
                </div>
              </TabsContent>

              {/* CONTATO */}
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

              {/* PROFISSIONAL */}
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

              {/* DOCUMENTOS */}
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
          <Field label="URL do arquivo">
            <Input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://..." />
          </Field>
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
