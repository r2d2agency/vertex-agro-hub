import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getFieldMe, type FieldMe } from "@/lib/field.functions";
import { uploadFile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldCard, StepHeader } from "@/components/vertex/field/step-header";
import {
  createTapperPreRegistration, TAPPER_CONTRACT_TYPES, maskCpf, onlyDigits,
  type PreRegistrationRole,
} from "@/lib/tappers.functions";

type Form = {
  fullName: string;
  rg: string;
  birthDate: string;
  phone: string;
  addressCity: string;
  addressState: string;
  contractType: string;
  dailyRate: string;
  notes: string;
};

const EMPTY_FORM: Form = {
  fullName: "", rg: "", birthDate: "", phone: "", addressCity: "", addressState: "", contractType: "", dailyRate: "", notes: "",
};

export function RolePreCadastroForm({
  role,
  title,
  personLabel,
}: {
  role: Extract<PreRegistrationRole, "monitor" | "operador">;
  title: string;
  personLabel: string;
}) {
  const nav = useNavigate();
  const [me, setMe] = useState<FieldMe | null>(null);
  const [farmId, setFarmId] = useState("");
  const [step, setStep] = useState(1);
  const [cpf, setCpf] = useState("");
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [rgPhotoUrl, setRgPhotoUrl] = useState("");
  const [cpfPhotoUrl, setCpfPhotoUrl] = useState("");
  const [uploadingRg, setUploadingRg] = useState(false);
  const [uploadingCpf, setUploadingCpf] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getFieldMe().then((m) => {
      setMe(m);
      if (m.assignments[0]) setFarmId(m.assignments[0].farm.id);
    });
  }, []);

  const farm = useMemo(() => me?.assignments.find((a) => a.farm.id === farmId)?.farm, [me, farmId]);
  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  if (!me) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (me.assignments.length === 0) return <p className="text-sm text-muted-foreground">Sem fazendas atribuídas.</p>;

  async function onPhoto(kind: "rg" | "cpf", f: File | null) {
    if (!f) return;
    const setUploading = kind === "rg" ? setUploadingRg : setUploadingCpf;
    const setUrl = kind === "rg" ? setRgPhotoUrl : setCpfPhotoUrl;
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

  function goToConfirm() {
    if (!farm) { toast.error("Selecione a fazenda"); return; }
    if (onlyDigits(cpf).length !== 11) { toast.error("Digite os 11 dígitos do CPF"); return; }
    if (!form.fullName || form.fullName.trim().length < 2) { toast.error("Informe o nome completo"); return; }
    if (!rgPhotoUrl || !cpfPhotoUrl) { toast.error(`Envie as fotos do RG e do CPF do ${personLabel}`); return; }
    setStep(2);
  }

  async function save() {
    if (!farm) return;
    setSaving(true);
    try {
      await createTapperPreRegistration({
        companyId: farm.companyId,
        farmId: farm.id,
        role,
        fullName: form.fullName.trim(),
        cpf: onlyDigits(cpf),
        rg: form.rg || null,
        birthDate: form.birthDate || null,
        phone: form.phone || null,
        addressCity: form.addressCity || null,
        addressState: form.addressState || null,
        contractType: form.contractType || null,
        dailyRate: form.dailyRate ? Number(form.dailyRate) : null,
        rgPhotoUrl,
        cpfPhotoUrl,
        notes: form.notes || null,
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
        step={step}
        steps={["Dados", "Enviar"]}
        onBack={() => (step > 1 ? setStep(step - 1) : nav({ to: "/campo" }))}
      />

      {step === 1 && (
        <FieldCard className="space-y-4">
          <F label="Fazenda">
            <Select value={farmId} onValueChange={setFarmId}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {me.assignments.map((a) => <SelectItem key={a.farm.id} value={a.farm.id}>{a.farm.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </F>

          <F label={`CPF do ${personLabel}`}>
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
            <F label="Nascimento"><Input type="date" className="h-11 rounded-xl" value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} /></F>
            <F label="Telefone / WhatsApp"><Input className="h-11 rounded-xl" inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></F>
            <F label="Cidade"><Input className="h-11 rounded-xl" value={form.addressCity} onChange={(e) => set("addressCity", e.target.value)} /></F>
          </div>

          <p className="pt-2 text-xs font-semibold uppercase text-muted-foreground">Documentos (obrigatório)</p>
          <div className="grid grid-cols-2 gap-3">
            <F label="Foto do RG *">
              {rgPhotoUrl ? (
                <img src={rgPhotoUrl} alt="RG" className="h-24 w-full rounded-xl border border-border/60 object-cover" />
              ) : (
                <label className="grid h-24 w-full cursor-pointer place-items-center rounded-xl border border-dashed border-border/60 bg-background/40 text-muted-foreground hover:border-primary hover:text-primary">
                  {uploadingRg ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhoto("rg", e.target.files?.[0] ?? null)} />
                </label>
              )}
            </F>
            <F label="Foto do CPF *">
              {cpfPhotoUrl ? (
                <img src={cpfPhotoUrl} alt="CPF" className="h-24 w-full rounded-xl border border-border/60 object-cover" />
              ) : (
                <label className="grid h-24 w-full cursor-pointer place-items-center rounded-xl border border-dashed border-border/60 bg-background/40 text-muted-foreground hover:border-primary hover:text-primary">
                  {uploadingCpf ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhoto("cpf", e.target.files?.[0] ?? null)} />
                </label>
              )}
            </F>
          </div>

          <p className="pt-2 text-xs font-semibold uppercase text-muted-foreground">Contrato</p>
          <div className="grid grid-cols-2 gap-3">
            <F label="Contrato">
              <Select value={form.contractType} onValueChange={(v) => set("contractType", v)}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {TAPPER_CONTRACT_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
            <F label="Diária (R$)">
              <Input className="h-11 rounded-xl" inputMode="decimal" value={form.dailyRate} onChange={(e) => set("dailyRate", e.target.value)} />
            </F>
          </div>

          <F label="Observações"><Textarea rows={2} className="rounded-xl" value={form.notes} onChange={(e) => set("notes", e.target.value)} /></F>

          <Button className="h-12 w-full rounded-xl text-base font-semibold" onClick={goToConfirm}>
            Continuar
          </Button>
        </FieldCard>
      )}

      {step === 2 && (
        <FieldCard className="space-y-4">
          <h3 className="text-sm font-semibold">Confirmar envio ao RH</h3>
          <dl className="divide-y divide-border/60 rounded-xl border border-border/60 bg-background/40 text-sm">
            <Row label="Nome" value={form.fullName || "—"} />
            <Row label="CPF" value={maskCpf(cpf)} />
            <Row label="Telefone" value={form.phone || "—"} />
            <Row label="Contrato" value={form.contractType || "—"} />
            <Row label="Fazenda" value={farm?.name ?? "—"} />
            <Row label="Documentos" value={rgPhotoUrl && cpfPhotoUrl ? "RG e CPF anexados" : "Pendente"} />
          </dl>
          <p className="text-xs text-muted-foreground">
            Ao confirmar, o consultor envia um cadastro provisório para o RH. O vínculo definitivo e a regularização continuam sendo feitos no administrativo.
          </p>
          <Button className="h-12 w-full rounded-xl text-base font-semibold" onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enviar pré-cadastro
          </Button>
        </FieldCard>
      )}
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
