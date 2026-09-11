import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getFieldMe, type FieldMe } from "@/lib/field.functions";
import { uploadFile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldCard, StepHeader } from "@/components/vertex/field/step-header";
import {
  createTapperPreRegistration, TAPPER_CONTRACT_TYPES, maskCpf, onlyDigits,
  type PreRegistrationRole,
} from "@/lib/tappers.functions";

type Form = {
  fullName: string;
  rg: string;
  phone: string;
  contractType: string;
  dailyRate: string;
};

const EMPTY_FORM: Form = { fullName: "", rg: "", phone: "", contractType: "", dailyRate: "" };

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
  const [step, setStep] = useState(1);
  const [cpf, setCpf] = useState("");
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [docFrontUrl, setDocFrontUrl] = useState("");
  const [docBackUrl, setDocBackUrl] = useState("");
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
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

  function goToConfirm() {
    if (!farm) { toast.error("Selecione a fazenda"); return; }
    if (onlyDigits(cpf).length !== 11) { toast.error("Digite os 11 dígitos do CPF"); return; }
    if (!form.fullName || form.fullName.trim().length < 2) { toast.error("Informe o nome completo"); return; }
    if (!docFrontUrl || !docBackUrl) { toast.error(`Envie a foto da frente e do verso do documento (RG ou CNH) do ${personLabel}`); return; }
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
        phone: form.phone || null,
        contractType: form.contractType || null,
        dailyRate: form.dailyRate ? Number(form.dailyRate) : null,
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

          <div className="grid grid-cols-2 gap-3">
            <F label="Tipo de contratação">
              <Select value={form.contractType} onValueChange={(v) => set("contractType", v)}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {TAPPER_CONTRACT_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
            <F label="Salário / Diária (R$)">
              <Input className="h-11 rounded-xl" inputMode="decimal" value={form.dailyRate} onChange={(e) => set("dailyRate", e.target.value)} />
            </F>
          </div>

          <p className="pt-2 text-xs font-semibold uppercase text-muted-foreground">Documento (RG ou CNH) — obrigatório</p>
          <div className="grid grid-cols-2 gap-3">
            <F label="Frente *">
              {docFrontUrl ? (
                <img src={docFrontUrl} alt="Frente do documento" className="h-24 w-full rounded-xl border border-border/60 object-cover" />
              ) : (
                <label className="grid h-24 w-full cursor-pointer place-items-center rounded-xl border border-dashed border-border/60 bg-background/40 text-muted-foreground hover:border-primary hover:text-primary">
                  {uploadingFront ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhoto("frente", e.target.files?.[0] ?? null)} />
                </label>
              )}
            </F>
            <F label="Verso *">
              {docBackUrl ? (
                <img src={docBackUrl} alt="Verso do documento" className="h-24 w-full rounded-xl border border-border/60 object-cover" />
              ) : (
                <label className="grid h-24 w-full cursor-pointer place-items-center rounded-xl border border-dashed border-border/60 bg-background/40 text-muted-foreground hover:border-primary hover:text-primary">
                  {uploadingBack ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhoto("verso", e.target.files?.[0] ?? null)} />
                </label>
              )}
            </F>
          </div>

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
            <Row label="RG" value={form.rg || "—"} />
            <Row label="WhatsApp" value={form.phone || "—"} />
            <Row label="Contratação" value={form.contractType || "—"} />
            <Row label="Salário / Diária" value={form.dailyRate ? `R$ ${form.dailyRate}` : "—"} />
            <Row label="Fazenda" value={farm?.name ?? "—"} />
            <Row label="Documento" value={docFrontUrl && docBackUrl ? "Frente e verso anexados" : "Pendente"} />
          </dl>
          <p className="text-xs text-muted-foreground">
            Ao confirmar, o consultor envia um cadastro provisório para o RH. O restante do cadastro é feito pelo administrativo.
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
