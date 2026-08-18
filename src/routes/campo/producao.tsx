import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { getFieldMe, type FieldMe, submitDelivery } from "@/lib/field.functions";
import { uploadFile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FieldCard, StepHeader } from "@/components/vertex/field/step-header";
import { getLocalIsoDate } from "@/lib/date-utils";

export const Route = createFileRoute("/campo/producao")({ component: ProducaoPage });

function ProducaoPage() {
  const nav = useNavigate();
  const [me, setMe] = useState<FieldMe | null>(null);
  const [farmId, setFarmId] = useState("");
  const [prevista, setPrevista] = useState("32,5");
  const [realizada, setRealizada] = useState("");
  const [drc, setDrc] = useState("");
  const [latexType, setLatexType] = useState("cernambi");
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { getFieldMe().then((m) => { setMe(m); if (m.assignments[0]) setFarmId(m.assignments[0].farm.id); }); }, []);
  const farm = useMemo(() => me?.assignments.find((a) => a.farm.id === farmId)?.farm, [me, farmId]);
  
  if (!me) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (me.assignments.length === 0) return <p className="text-sm text-muted-foreground p-8 text-center">Sem fazendas atribuídas.</p>;

  const meta = parseFloat(prevista.replace(",", ".")) || 0;
  const real = parseFloat(realizada.replace(",", ".")) || 0;
  const pct = meta > 0 ? Math.round((real / meta) * 100) : 0;

  async function onFile(f: File | null) {
    if (!f) return;
    setUploading(true);
    try { const r = await uploadFile(f); setPhotoUrl(r.url); toast.success("Foto anexada"); }
    catch (e: any) { toast.error(e?.message ?? "Falha no upload"); }
    finally { setUploading(false); }
  }

  async function save() {
    if (!farm) return;
    setSaving(true);
    const res = await submitDelivery({
      companyId: farm.companyId, farmId: farm.id,
      deliveryDate: getLocalIsoDate(),
      netWeightKg: real || undefined,
      drcAvgPercent: drc ? Number(drc) : undefined,
      latexType: latexType || undefined,
      notes: [notes, `Prevista: ${prevista} kg`, photoUrl && `Foto: ${photoUrl}`].filter(Boolean).join(" | "),
    });
    setSaving(false);
    toast.success(res.queued ? "Entrega salva na fila (offline)" : "Entrega registrada");
    nav({ to: "/campo" });
  }

  return (
    <div>
      <StepHeader title="Registrar produção" step={1} steps={["Dados", "Confirmar"]} />

      <FieldCard className="space-y-4">
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">Fazenda</Label>
          <Select value={farmId} onValueChange={setFarmId}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>{me.assignments.map((a) => <SelectItem key={a.farm.id} value={a.farm.id}>{a.farm.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <BigField label="Produção prevista" suffix="kg" value={prevista} onChange={setPrevista} />
        <BigField label="Produção realizada" suffix="kg" value={realizada} onChange={setRealizada} highlight />
        <BigField label="DRC (se disponível)" suffix="%" value={drc} onChange={setDrc} />

        {(realizada || drc) && (
          <div className="flex items-center justify-between rounded-xl bg-warning/10 px-3 py-2.5 text-sm">
            <span className="font-medium">Resultado</span>
            <span className="font-semibold text-warning">{pct}% da meta</span>
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">Tipo de látex</Label>
          <Select value={latexType} onValueChange={setLatexType}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="liquido">Líquido</SelectItem>
              <SelectItem value="cernambi">Cernambi</SelectItem>
              <SelectItem value="prancha">Prancha</SelectItem>
              <SelectItem value="gsl">GSL</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">Sangrador (Opcional)</Label>
          <Input 
            className="h-11 rounded-xl" 
            placeholder="Nome do sangrador responsável"
            onChange={(e) => {
              const val = e.target.value;
              setNotes(prev => {
                const parts = prev.split(" | ");
                const filtered = parts.filter(p => !p.startsWith("Sangrador:"));
                if (val) filtered.push(`Sangrador: ${val}`);
                return filtered.join(" | ");
              });
            }}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">Observações</Label>
          <Textarea rows={3} className="rounded-xl" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Látex coletado sem rejeição." />
        </div>

        <div>
          <Label className="mb-2 block text-xs font-medium text-muted-foreground">Foto do recipiente (opcional)</Label>
          <div className="grid grid-cols-2 gap-3">
            {photoUrl ? (
              <img src={photoUrl} alt="Recipiente" className="h-24 w-full rounded-xl object-cover" />
            ) : (
              <div className="grid h-24 w-full place-items-center rounded-xl border border-dashed border-border/60 bg-background/40 text-xs text-muted-foreground">Sem foto</div>
            )}
            <label className="grid h-24 w-full cursor-pointer place-items-center rounded-xl border border-dashed border-border/60 bg-background/40 text-muted-foreground hover:border-primary hover:text-primary">
              <div className="flex flex-col items-center gap-1 text-xs">
                <Camera className="h-5 w-5" />
                {uploading ? "Enviando..." : photoUrl ? "Trocar" : "Tirar foto"}
              </div>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>

        <Button className="h-12 w-full rounded-xl text-base font-semibold" onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar produção
        </Button>
      </FieldCard>
    </div>
  );
}

function BigField({ label, suffix, value, onChange, highlight }: { label: string; suffix: string; value: string; onChange: (v: string) => void; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-24 border-none bg-transparent text-right text-2xl font-bold outline-none ${highlight ? "text-primary" : "text-foreground"}`}
          placeholder="—"
        />
        <span className="text-xs font-semibold text-muted-foreground">{suffix}</span>
      </div>
    </div>
  );
}