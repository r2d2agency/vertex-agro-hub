import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { getFieldMe, type FieldMe, submitOccurrence } from "@/lib/field.functions";
import { uploadFile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FieldCard, StepHeader } from "@/components/vertex/field/step-header";

export const Route = createFileRoute("/campo/chuva")({ component: ChuvaPage });

function ChuvaPage() {
  const nav = useNavigate();
  const [me, setMe] = useState<FieldMe | null>(null);
  const [farmId, setFarmId] = useState("");
  const [ini, setIni] = useState<string>("2026-08-12T00:00");
  useEffect(() => {
    setIni(new Date().toISOString().slice(0, 16));
  }, []);
  const [fim, setFim] = useState<string>("");
  const [intensidade, setIntensidade] = useState("forte");
  const [interrompeu, setInterrompeu] = useState("sim");
  const [areas, setAreas] = useState("");
  const [perda, setPerda] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { getFieldMe().then((m) => { setMe(m); if (m.assignments[0]) setFarmId(m.assignments[0].farm.id); }); }, []);
  const farm = useMemo(() => me?.assignments.find((a) => a.farm.id === farmId)?.farm, [me, farmId]);

  async function onFile(f: File | null) {
    if (!f) return;
    setUploading(true);
    try { const r = await uploadFile(f); setPhoto(r.url); } catch (e: any) { toast.error(e?.message ?? "Falha"); }
    finally { setUploading(false); }
  }

  async function save() {
    if (!farm) return;
    setSaving(true);
    const res = await submitOccurrence({
      companyId: farm.companyId, farmId: farm.id,
      date: ini.slice(0, 10),
      type: "clima", severity: interrompeu === "sim" ? "media" : "baixa", status: "aberta",
      title: `Chuva ${intensidade}`,
      description: [
        `Início: ${ini}`,
        fim && `Fim: ${fim}`,
        `Intensidade: ${intensidade}`,
        `Interrompeu atividade: ${interrompeu}`,
        areas && `Áreas afetadas: ${areas}`,
        perda && `Produção não realizada: ${perda} kg`,
        notes,
        photo && `Foto: ${photo}`,
      ].filter(Boolean).join("\n"),
    });
    setSaving(false);
    toast.success(res.queued ? "Salvo na fila" : "Chuva registrada");
    nav({ to: "/campo" });
  }

  if (!me) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <StepHeader title="Informar chuva" step={1} steps={["Dados", "Salvar"]} />
      <FieldCard className="space-y-4">
        <F label="Fazenda">
          <Select value={farmId} onValueChange={setFarmId}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>{me.assignments.map((a) => <SelectItem key={a.farm.id} value={a.farm.id}>{a.farm.name}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <F label="Início aproximado"><Input type="datetime-local" className="h-11 rounded-xl" value={ini} onChange={(e) => setIni(e.target.value)} /></F>
        <F label="Fim aproximado"><Input type="datetime-local" className="h-11 rounded-xl" value={fim} onChange={(e) => setFim(e.target.value)} /></F>
        <F label="Intensidade">
          <Select value={intensidade} onValueChange={setIntensidade}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fraca">Fraca</SelectItem>
              <SelectItem value="moderada">Moderada</SelectItem>
              <SelectItem value="forte">Forte</SelectItem>
              <SelectItem value="temporal">Temporal</SelectItem>
            </SelectContent>
          </Select>
        </F>
        <F label="Atividade interrompida?">
          <Select value={interrompeu} onValueChange={setInterrompeu}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sim">Sim</SelectItem>
              <SelectItem value="parcial">Parcial</SelectItem>
              <SelectItem value="nao">Não</SelectItem>
            </SelectContent>
          </Select>
        </F>
        <F label="Áreas afetadas"><Input className="h-11 rounded-xl" value={areas} onChange={(e) => setAreas(e.target.value)} placeholder="Ex.: Talhão A1, A2 e B1" /></F>
        <F label="Produção estimada não realizada (kg)"><Input inputMode="decimal" className="h-11 rounded-xl" value={perda} onChange={(e) => setPerda(e.target.value)} /></F>
        <F label="Observações"><Textarea rows={3} className="rounded-xl" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Chuva forte com vento." /></F>
        <div>
          <Label className="mb-2 block text-xs font-medium text-muted-foreground">Foto (opcional)</Label>
          <div className="grid grid-cols-2 gap-3">
            {photo ? <img src={photo} alt="" className="h-24 w-full rounded-xl object-cover" /> : <div className="grid h-24 w-full place-items-center rounded-xl border border-dashed border-border/60 text-xs text-muted-foreground">Sem foto</div>}
            <label className="grid h-24 w-full cursor-pointer place-items-center rounded-xl border border-dashed border-border/60 bg-background/40 text-muted-foreground hover:border-primary hover:text-primary">
              <div className="flex flex-col items-center text-xs"><Camera className="h-5 w-5" />{uploading ? "Enviando..." : "Tirar foto"}</div>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>
        <Button className="h-12 w-full rounded-xl text-base font-semibold" onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
        </Button>
      </FieldCard>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">{label}</Label>{children}</div>;
}
