import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Camera, Loader2, MapPin } from "lucide-react";
import { getFieldMe, type FieldMe, submitOccurrence, captureLocation, type Coords } from "@/lib/field.functions";
import { uploadFile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { OCC_SEVERITIES, OCC_TYPES } from "@/lib/ocorrencias.functions";
import { toast } from "sonner";
import { FieldCard, StepHeader } from "@/components/vertex/field/step-header";

export const Route = createFileRoute("/campo/ocorrencia")({ component: OcorrenciaPage });

function OcorrenciaPage() {
  const nav = useNavigate();
  const [me, setMe] = useState<FieldMe | null>(null);
  const [farmId, setFarmId] = useState("");
  const [type, setType] = useState("processo");
  const [severity, setSeverity] = useState("alta");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [action, setAction] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [loc, setLoc] = useState<Coords | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getFieldMe().then((m) => { setMe(m); if (m.assignments[0]) setFarmId(m.assignments[0].farm.id); });
    captureLocation().then(setLoc);
  }, []);
  const farm = useMemo(() => me?.assignments.find((a) => a.farm.id === farmId)?.farm, [me, farmId]);
  if (!me) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  async function onFile(f: File | null) {
    if (!f) return;
    setUploading(true);
    try { const r = await uploadFile(f); setPhotoUrls((cur) => [...cur, r.url]); toast.success("Foto anexada"); }
    catch (e: any) { toast.error(e?.message ?? "Falha no upload"); }
    finally { setUploading(false); }
  }

  async function save() {
    if (!farm || !title.trim()) { toast.error("Fazenda e título são obrigatórios"); return; }
    setSaving(true);
    const descParts: string[] = [];
    if (description.trim()) descParts.push(description.trim());
    if (action.trim()) descParts.push(`Ação corretiva: ${action.trim()}`);
    if (loc) descParts.push(`GPS ${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)} (±${Math.round(loc.accuracyM ?? 0)}m)`);
    if (photoUrls.length) descParts.push(`Fotos: ${photoUrls.join(", ")}`);
    const res = await submitOccurrence({
      companyId: farm.companyId, farmId: farm.id,
      date: new Date().toISOString().slice(0, 10),
      type, severity, status: "aberta",
      title: title.trim(), description: descParts.join("\n"),
      responsible: me?.user.fullName ?? me?.user.email,
    });
    setSaving(false);
    toast.success(res.queued ? "Ocorrência salva na fila (offline)" : "Ocorrência registrada");
    nav({ to: "/campo" });
  }

  const sevDot: Record<string, string> = { baixa: "bg-primary", media: "bg-warning", alta: "bg-destructive", critica: "bg-destructive" };

  return (
    <div>
      <StepHeader title="Registrar ocorrência" step={1} steps={["Detalhes", "Salvar"]} />
      <FieldCard className="space-y-4">
        <Field label="Fazenda">
          <Select value={farmId} onValueChange={setFarmId}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>{me.assignments.map((a) => <SelectItem key={a.farm.id} value={a.farm.id}>{a.farm.name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Categoria">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>{OCC_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Prioridade">
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="h-11 rounded-xl">
              <span className={`mr-2 inline-block h-2 w-2 rounded-full ${sevDot[severity] ?? "bg-muted"}`} />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>{OCC_SEVERITIES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Título">
          <Input className="h-11 rounded-xl" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Ponte caída no acesso ao A1" />
        </Field>
        <Field label="Descrição">
          <Textarea rows={3} className="rounded-xl" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>

        <div>
          <Label className="mb-2 block text-xs font-medium text-muted-foreground">Fotos</Label>
          <div className="grid grid-cols-3 gap-2">
            {photoUrls.map((u, i) => (
              <img key={i} src={u} alt="anexo" className="h-20 w-full rounded-xl object-cover" />
            ))}
            <label className="grid h-20 w-full cursor-pointer place-items-center rounded-xl border border-dashed border-border/60 bg-background/40 text-muted-foreground hover:border-primary hover:text-primary">
              <Camera className="h-5 w-5" />
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          {uploading && <div className="mt-2 text-xs text-muted-foreground">Enviando...</div>}
        </div>

        <Field label="Ação corretiva">
          <Textarea rows={2} className="rounded-xl" value={action} onChange={(e) => setAction(e.target.value)} placeholder="Sangria adiada até liberação de acesso." />
        </Field>

        <div className="flex items-center gap-2 rounded-xl bg-background/40 px-3 py-2 text-[11px] text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {loc ? `GPS: ${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)} (±${Math.round(loc.accuracyM ?? 0)}m)` : "Buscando localização..."}
        </div>

        <Button className="h-12 w-full rounded-xl text-base font-semibold" onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar ocorrência
        </Button>
      </FieldCard>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
