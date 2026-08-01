import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, UserPlus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { getFieldMe, type FieldMe } from "@/lib/field.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldCard, StepHeader } from "@/components/vertex/field/step-header";
import {
  TAPPER_CONTRACT_TYPES, lookupTapperByCpf, maskCpf, onlyDigits, upsertTapperByCpf,
  type TapperInput,
} from "@/lib/tappers.functions";

export const Route = createFileRoute("/campo/sangrador")({ component: SangradorPage });

type Form = TapperInput & { cpf: string };

function SangradorPage() {
  const nav = useNavigate();
  const [me, setMe] = useState<FieldMe | null>(null);
  const [farmId, setFarmId] = useState("");
  const [step, setStep] = useState(1);

  const [cpf, setCpf] = useState("");
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"new" | "existing" | "other-company" | null>(null);
  const [currentFarm, setCurrentFarm] = useState<string | null>(null);
  const [form, setForm] = useState<Form>({ cpf: "", status: "ativo" });

  useEffect(() => {
    getFieldMe().then((m) => {
      setMe(m);
      if (m.assignments[0]) setFarmId(m.assignments[0].farm.id);
    });
  }, []);

  const farm = useMemo(() => me?.assignments.find((a) => a.farm.id === farmId)?.farm, [me, farmId]);
  const set = (k: keyof Form, v: unknown) => setForm((f) => ({ ...f, [k]: v as never }));

  if (!me) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (me.assignments.length === 0) return <p className="text-sm text-muted-foreground">Sem fazendas atribuídas.</p>;

  async function check() {
    const digits = onlyDigits(cpf);
    if (digits.length !== 11) { toast.error("Digite os 11 dígitos do CPF"); return; }
    if (!farm) { toast.error("Selecione a fazenda"); return; }
    setChecking(true);
    try {
      const res = await lookupTapperByCpf(farm.companyId, digits);
      if (res.found && res.tapper) {
        const t = res.tapper;
        setForm({
          cpf: digits,
          fullName: t.fullName, nickname: t.nickname, code: t.code, rg: t.rg,
          birthDate: t.birthDate?.slice(0, 10) ?? null,
          phone: t.phone, addressCity: t.addressCity, addressState: t.addressState,
          contractType: t.contractType, dailyRate: t.dailyRate, pisNumber: t.pisNumber,
          bankPixKey: t.bankPixKey, emergencyContactName: t.emergencyContactName,
          emergencyContactPhone: t.emergencyContactPhone, status: t.status ?? "ativo", notes: t.notes,
        });
        setStatus(res.sameCompany ? "existing" : "other-company");
        setCurrentFarm(res.currentFarm?.name ?? null);
        toast.success(res.sameCompany ? "Ficha encontrada — confirme os dados" : "Cadastro encontrado em outra empresa — confirme e vincule");
      } else {
        setForm({ cpf: digits, status: "ativo" });
        setStatus("new");
        setCurrentFarm(null);
        toast.info("CPF não cadastrado — preencha a ficha");
      }
      setStep(2);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na consulta");
    } finally {
      setChecking(false);
    }
  }

  async function save() {
    if (!farm) return;
    if (!form.fullName || form.fullName.trim().length < 2) { toast.error("Informe o nome completo"); return; }
    setSaving(true);
    try {
      const res = await upsertTapperByCpf({
        ...form,
        cpf: onlyDigits(form.cpf || cpf),
        companyId: farm.companyId,
        farmId: farm.id,
        stintStartAt: new Date().toISOString().slice(0, 10),
      });
      toast.success(res.created ? "Sangrador cadastrado e vinculado" : "Ficha atualizada e vínculo confirmado");
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
        title="Ficha do sangrador"
        step={step}
        steps={["CPF", "Dados", "Vincular"]}
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
          <F label="CPF do sangrador">
            <Input
              className="h-12 rounded-xl text-lg tracking-wider"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={maskCpf(cpf)}
              onChange={(e) => setCpf(onlyDigits(e.target.value))}
            />
          </F>
          <p className="text-xs text-muted-foreground">
            O sistema consulta o CPF: se já houver ficha, os dados são carregados para você apenas confirmar e vincular à fazenda.
          </p>
          <Button className="h-12 w-full rounded-xl text-base font-semibold" onClick={check} disabled={checking}>
            {checking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Consultar CPF
          </Button>
        </FieldCard>
      )}

      {step === 2 && (
        <FieldCard className="space-y-4">
          <div className="flex items-center gap-2">
            {status === "new" ? (
              <Badge variant="secondary" className="gap-1"><UserPlus className="h-3 w-3" /> Novo cadastro</Badge>
            ) : (
              <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> {status === "existing" ? "Ficha existente" : "Cadastro em outra empresa"}</Badge>
            )}
            {currentFarm && <span className="text-xs text-muted-foreground">Atual: {currentFarm}</span>}
          </div>

          <p className="text-xs font-semibold uppercase text-muted-foreground">Pessoal</p>
          <F label="Nome completo *"><Input className="h-11 rounded-xl" value={form.fullName ?? ""} onChange={(e) => set("fullName", e.target.value)} /></F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Apelido"><Input className="h-11 rounded-xl" value={form.nickname ?? ""} onChange={(e) => set("nickname", e.target.value)} /></F>
            <F label="RG"><Input className="h-11 rounded-xl" value={form.rg ?? ""} onChange={(e) => set("rg", e.target.value)} /></F>
            <F label="Nascimento"><Input type="date" className="h-11 rounded-xl" value={form.birthDate ?? ""} onChange={(e) => set("birthDate", e.target.value)} /></F>
            <F label="Matrícula"><Input className="h-11 rounded-xl" value={form.code ?? ""} onChange={(e) => set("code", e.target.value)} /></F>
          </div>

          <p className="pt-2 text-xs font-semibold uppercase text-muted-foreground">Contatos</p>
          <div className="grid grid-cols-2 gap-3">
            <F label="Telefone"><Input className="h-11 rounded-xl" inputMode="tel" value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></F>
            <F label="Cidade"><Input className="h-11 rounded-xl" value={form.addressCity ?? ""} onChange={(e) => set("addressCity", e.target.value)} /></F>
            <F label="Emergência (nome)"><Input className="h-11 rounded-xl" value={form.emergencyContactName ?? ""} onChange={(e) => set("emergencyContactName", e.target.value)} /></F>
            <F label="Emergência (fone)"><Input className="h-11 rounded-xl" inputMode="tel" value={form.emergencyContactPhone ?? ""} onChange={(e) => set("emergencyContactPhone", e.target.value)} /></F>
          </div>

          <p className="pt-2 text-xs font-semibold uppercase text-muted-foreground">Financeiro</p>
          <div className="grid grid-cols-2 gap-3">
            <F label="Contrato">
              <Select value={form.contractType ?? ""} onValueChange={(v) => set("contractType", v)}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {TAPPER_CONTRACT_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
            <F label="Diária (R$)">
              <Input className="h-11 rounded-xl" inputMode="decimal" value={form.dailyRate ?? ""} onChange={(e) => set("dailyRate", e.target.value ? Number(e.target.value) : null)} />
            </F>
            <F label="PIS/PASEP"><Input className="h-11 rounded-xl" value={form.pisNumber ?? ""} onChange={(e) => set("pisNumber", e.target.value)} /></F>
            <F label="Chave PIX"><Input className="h-11 rounded-xl" value={form.bankPixKey ?? ""} onChange={(e) => set("bankPixKey", e.target.value)} /></F>
          </div>

          <F label="Observações"><Textarea rows={2} className="rounded-xl" value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></F>

          <Button className="h-12 w-full rounded-xl text-base font-semibold" onClick={() => setStep(3)}>Continuar</Button>
        </FieldCard>
      )}

      {step === 3 && (
        <FieldCard className="space-y-4">
          <h3 className="text-sm font-semibold">Confirmar vínculo</h3>
          <dl className="divide-y divide-border/60 rounded-xl border border-border/60 bg-background/40 text-sm">
            <Row label="Sangrador" value={form.fullName || "—"} />
            <Row label="CPF" value={maskCpf(form.cpf || cpf)} />
            <Row label="Telefone" value={form.phone || "—"} />
            <Row label="Contrato" value={form.contractType || "—"} />
            <Row label="Diária" value={form.dailyRate ? `R$ ${form.dailyRate}` : "—"} />
            <Row label="Fazenda" value={farm?.name ?? "—"} />
          </dl>
          <p className="text-xs text-muted-foreground">
            Ao confirmar, o sangrador passa a constar nesta fazenda e o vínculo anterior é encerrado automaticamente com data de hoje.
          </p>
          <Button className="h-12 w-full rounded-xl text-base font-semibold" onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar e vincular
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
