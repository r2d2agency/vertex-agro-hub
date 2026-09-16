import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Camera, Clock3, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getFieldMe, listFieldTappingTables, type FieldMe, type FieldTappingTable } from "@/lib/field.functions";
import { uploadFile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldCard, StepHeader } from "@/components/vertex/field/step-header";
import { ChipToggle } from "@/components/vertex/field/chip-toggle";
import {
  createTapperPreRegistration, listTapperPreRegistrations, TAPPER_CONTRACT_TYPES, maskCpf, onlyDigits,
  type PreRegistrationRole, type TapperPreRegistration,
} from "@/lib/tappers.functions";

type Form = {
  fullName: string;
  rg: string;
  phone: string;
  contractType: string;
  dailyRate: string;
  treesAssigned: string;
  taskPercent: string;
  tappingTableId: string;
};

const EMPTY_FORM: Form = {
  fullName: "", rg: "", phone: "", contractType: "", dailyRate: "",
  treesAssigned: "", taskPercent: "", tappingTableId: "",
};

const STATUS_LABEL: Record<string, string> = { pending: "Pendente", approved: "Aprovado", rejected: "Arquivado" };
const STATUS_CLASS: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  approved: "bg-primary/15 text-primary",
  rejected: "bg-muted text-muted-foreground",
};

export function RolePreCadastroForm({
  role,
  title,
  personLabel,
}: {
  role: PreRegistrationRole;
  title: string;
  personLabel: string;
}) {
  const nav = useNavigate();
  const [me, setMe] = useState<FieldMe | null>(null);
  const [farmId, setFarmId] = useState("");
  const [cpf, setCpf] = useState("");
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [docFrontUrl, setDocFrontUrl] = useState("");
  const [docBackUrl, setDocBackUrl] = useState("");
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [saving, setSaving] = useState(false);
  const [myPreRegistrations, setMyPreRegistrations] = useState<TapperPreRegistration[]>([]);
  const [tables, setTables] = useState<FieldTappingTable[]>([]);

  useEffect(() => {
    getFieldMe().then((m) => {
      setMe(m);
      if (m.assignments[0]) setFarmId(m.assignments[0].farm.id);
    });
  }, []);

  const farm = useMemo(() => me?.assignments.find((a) => a.farm.id === farmId)?.farm, [me, farmId]);

  // Pré-cadastros que este consultor já enviou pra esse papel — mostrado no
  // topo pra ele não reenviar o mesmo CPF por engano.
  useEffect(() => {
    if (!farm?.companyId) return;
    listTapperPreRegistrations(farm.companyId, { role, status: "" })
      .then(setMyPreRegistrations)
      .catch(() => setMyPreRegistrations([]));
  }, [farm?.companyId, role]);

  // Sistema de sangria (tabela) só faz sentido pro pré-cadastro de sangrador.
  useEffect(() => {
    if (!farm?.companyId || role !== "sangrador") { setTables([]); return; }
    listFieldTappingTables(farm.companyId).then(setTables).catch(() => setTables([]));
  }, [farm?.companyId, role]);
  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  if (!me) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (me.assignments.length === 0) return <p className="text-sm text-muted-foreground">Sem fazendas atribuídas.</p>;

  async function onPhoto(side: "frente" | "verso", f: File | null) {
    if (!f) return;
    const setUploading = side === "frente" ? setUploadingFront : setUploadingBack;
    const setUrl = side === "frente" ? setDocFrontUrl : setDocBackUrl;
    setUploading(true);
    try {
      const r = await uploadFile(f);
      setUrl(r.url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar foto");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!farm) { toast.error("Selecione a fazenda"); return; }
    if (onlyDigits(cpf).length !== 11) { toast.error("Digite os 11 dígitos do CPF"); return; }
    if (!form.fullName || form.fullName.trim().length < 2) { toast.error("Informe o nome completo"); return; }
    if (!docFrontUrl || !docBackUrl) { toast.error(`Envie a foto da frente e do verso do documento (RG ou CNH) do ${personLabel}`); return; }
    setSaving(true);
    try {
      await createTapperPreRegistration({
        companyId: farm.companyId,
        farmId: farm.id,
        role,
        fullName: form.fullName.trim(),
        cpf: onlyDigits(cpf),
        rg: form.rg || null,
        phone: form.phone || null,
        contractType: form.contractType || null,
        dailyRate: form.dailyRate ? Number(form.dailyRate) : null,
        treesAssigned: form.treesAssigned ? Number(form.treesAssigned) : null,
        taskPercent: form.taskPercent ? Number(form.taskPercent) : null,
        tappingTableId: form.tappingTableId || null,
        rgPhotoUrl: docFrontUrl,
        cpfPhotoUrl: docBackUrl,
      });
      toast.success("Pré-cadastro enviado ao RH para validação");
      nav({ to: "/campo" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <StepHeader
        title={title}
        step={1}
        steps={["Dados"]}
        onBack={() => nav({ to: "/campo" })}
      />

      {myPreRegistrations.length > 0 && (
        <FieldCard className="mb-4 space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" /> Pré-cadastros já enviados por você
          </p>
          <ul className="space-y-1.5">
            {myPreRegistrations.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/40 p-2.5 text-xs">
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.fullName}</p>
                  <p className="truncate text-muted-foreground">
                    CPF {maskCpf(p.cpf)}{p.farmName ? ` · ${p.farmName}` : ""}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${STATUS_CLASS[p.status] ?? "bg-muted text-muted-foreground"}`}>
                  {STATUS_LABEL[p.status] ?? p.status}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted-foreground">
            Se o {personLabel} que você quer cadastrar já está pendente aqui, não é preciso enviar de novo — aguarde a validação do RH.
          </p>
        </FieldCard>
      )}

      <FieldCard className="space-y-4">
          <F label="Fazenda">
            <Select value={farmId} onValueChange={setFarmId}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {me.assignments.map((a) => <SelectItem key={a.farm.id} value={a.farm.id}>{a.farm.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </F>

          <F label={`CPF do ${personLabel} *`}>
            <Input
              className="h-12 rounded-xl text-lg tracking-wider"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={maskCpf(cpf)}
              onChange={(e) => setCpf(onlyDigits(e.target.value))}
            />
          </F>

          <F label="Nome completo *">
            <Input className="h-11 rounded-xl" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
          </F>
          <div className="grid grid-cols-2 gap-3">
            <F label="RG"><Input className="h-11 rounded-xl" value={form.rg} onChange={(e) => set("rg", e.target.value)} /></F>
            <F label="WhatsApp"><Input className="h-11 rounded-xl" inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></F>
          </div>

          <div>
            <Label className="mb-2 block text-xs font-medium text-muted-foreground">Tipo de contratação</Label>
            <div className="grid grid-cols-3 gap-2">
              {TAPPER_CONTRACT_TYPES.map((c) => (
                <ChipToggle key={c} active={form.contractType === c} label={c} onClick={() => set("contractType", c)} />
              ))}
            </div>
          </div>
          <F label="Salário / Diária (R$)">
            <Input className="h-11 rounded-xl" inputMode="decimal" value={form.dailyRate} onChange={(e) => set("dailyRate", e.target.value)} />
          </F>

          {role === "sangrador" && (
            <>
              <F label="Sistema de sangria">
                <Select value={form.tappingTableId} onValueChange={(v) => set("tappingTableId", v)}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder={tables.length ? "Selecione a tabela" : "Nenhuma tabela cadastrada"} /></SelectTrigger>
                  <SelectContent>
                    {tables.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}{t.notation ? ` — ${t.notation}` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </F>
              <div className="grid grid-cols-2 gap-3">
                <F label="Número de plantas">
                  <Input className="h-11 rounded-xl" inputMode="numeric" value={form.treesAssigned} onChange={(e) => set("treesAssigned", e.target.value)} />
                </F>
                <F label="% da tarefa">
                  <Input className="h-11 rounded-xl" inputMode="decimal" value={form.taskPercent} onChange={(e) => set("taskPercent", e.target.value)} />
                </F>
              </div>
            </>
          )}

          <p className="pt-2 text-xs font-semibold uppercase text-muted-foreground">Documento (RG ou CNH) — obrigatório</p>
          <div className="grid grid-cols-2 gap-3">
            <F label="Frente *">
              {docFrontUrl ? (
                <img src={docFrontUrl} alt="Frente do documento" className="h-24 w-full rounded-xl border border-border/60 object-cover" />
              ) : (
                <label className="grid h-24 w-full cursor-pointer place-items-center rounded-xl border border-dashed border-border/60 bg-background/40 text-muted-foreground hover:border-primary hover:text-primary">
                  {uploadingFront ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto("frente", e.target.files?.[0] ?? null)} />
                </label>
              )}
            </F>
            <F label="Verso *">
              {docBackUrl ? (
                <img src={docBackUrl} alt="Verso do documento" className="h-24 w-full rounded-xl border border-border/60 object-cover" />
              ) : (
                <label className="grid h-24 w-full cursor-pointer place-items-center rounded-xl border border-dashed border-border/60 bg-background/40 text-muted-foreground hover:border-primary hover:text-primary">
                  {uploadingBack ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto("verso", e.target.files?.[0] ?? null)} />
                </label>
              )}
            </F>
          </div>

          <p className="text-xs text-muted-foreground">
            Ao enviar, o consultor manda um cadastro provisório para o RH. O restante do cadastro é feito pelo administrativo.
          </p>
          <Button className="h-12 w-full rounded-xl text-base font-semibold" onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enviar pré-cadastro
          </Button>
      </FieldCard>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
