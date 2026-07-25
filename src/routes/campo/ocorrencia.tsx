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

export const Route = createFileRoute("/campo/ocorrencia")({ component: OcorrenciaPage });

function OcorrenciaPage() {
  const nav = useNavigate();
  const [me, setMe] = useState<FieldMe | null>(null);
  const [farmId, setFarmId] = useState("");
  const [type, setType] = useState("processo");
  const [severity, setSeverity] = useState("media");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loc, setLoc] = useState<Coords | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getFieldMe().then((m) => { setMe(m); if (m.assignments[0]) setFarmId(m.assignments[0].farm.id); });
    captureLocation().then(setLoc);
  }, []);
  const farm = useMemo(() => me?.assignments.find((a) => a.farm.id === farmId)?.farm, [me, farmId]);
  if (!me) return <Loader2 className="mx-auto mt-10 h-5 w-5 animate-spin text-primary" />;

  async function onFile(f: File | null) {
    if (!f) return;
    setUploading(true);
    try { const r = await uploadFile(f); setPhotoUrl(r.url); toast.success("Foto anexada"); }
    catch (e: any) { toast.error(e?.message ?? "Falha no upload"); }
    finally { setUploading(false); }
  }

  async function save() {
    if (!farm || !title.trim()) { toast.error("Fazenda e título são obrigatórios"); return; }
    setSaving(true);
    const descParts: string[] = [];
    if (description.trim()) descParts.push(description.trim());
    if (loc) descParts.push(`GPS ${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)} (±${Math.round(loc.accuracyM ?? 0)}m)`);
    if (photoUrl) descParts.push(`Foto: ${photoUrl}`);
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

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Nova ocorrência</h1>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label>Fazenda</Label>
          <Select value={farmId} onValueChange={setFarmId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{me.assignments.map((a) => <SelectItem key={a.farm.id} value={a.farm.id}>{a.farm.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{OCC_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Severidade</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{OCC_SEVERITIES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1"><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="space-y-1"><Label>Descrição</Label><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>

        <div className="rounded-lg border border-dashed border-border p-3 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {loc ? `GPS: ${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)} (±${Math.round(loc.accuracyM ?? 0)}m)` : "Buscando localização..."}
          </div>
        </div>

        <div>
          <Label className="mb-1 block">Foto</Label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm">
            <Camera className="h-4 w-4" />
            {uploading ? "Enviando..." : photoUrl ? "Foto anexada — trocar" : "Tirar foto ou escolher"}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
          </label>
          {photoUrl && <img src={photoUrl} alt="preview" className="mt-2 max-h-40 rounded-md object-cover" />}
        </div>

        <Button className="w-full" onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar ocorrência
        </Button>
      </div>
    </div>
  );
}
