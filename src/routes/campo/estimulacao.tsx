import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { getFieldMe, type FieldMe, submitOccurrence } from "@/lib/field.functions";
import { uploadFile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FieldCard, StepHeader } from "@/components/vertex/field/step-header";
import { getLocalIsoDate } from "@/lib/date-utils";

export const Route = createFileRoute("/campo/estimulacao")({ component: EstimulacaoPage });

const PRODUCTS = ["Ethephon 48%", "Ethephon 25%", "Ethephon 5%", "Outro"];

function EstimulacaoPage() {
  const nav = useNavigate();
  const [me, setMe] = useState<FieldMe | null>(null);
  const [farmId, setFarmId] = useState("");
  const [product, setProduct] = useState(PRODUCTS[0]);
  const [dose, setDose] = useState("2,5");
  const [previstas, setPrevistas] = useState("");
  const [realizadas, setRealizadas] = useState("");
  const [team, setTeam] = useState("");
  const [next, setNext] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { getFieldMe().then((m) => { setMe(m); if (m.assignments[0]) setFarmId(m.assignments[0].farm.id); }); }, []);
  const farm = useMemo(() => me?.assignments.find((a) => a.farm.id === farmId)?.farm, [me, farmId]);

  async function onFile(f: File | null) {
    if (!f) return;
    setUploading(true);
    try { const r = await uploadFile(f); setPhotos((c) => [...c, r.url]); } catch (e: any) { toast.error(e?.message ?? "Falha"); }
    finally { setUploading(false); }
  }

  async function save() {
    if (!farm) return;
    setSaving(true);
    const res = await submitOccurrence({
      companyId: farm.companyId, farmId: farm.id,
      date: getLocalIsoDate(),
      type: "processo", severity: "baixa", status: "resolvida",
      title: `Estimulação ${product} — ${dose} ml/árvore`,
      description: [
        `Árvores: ${realizadas || "—"} / ${previstas || "—"}`,
        team && `Equipe: ${team}`,
        next && `Próxima aplicação: ${next}`,
        photos.length && `Fotos: ${photos.join(", ")}`,
      ].filter(Boolean).join("\n"),
    });
    setSaving(false);
    toast.success(res.queued ? "Salvo na fila" : "Estimulação registrada");
    nav({ to: "/campo" });
  }

  if (!me) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <StepHeader title="Registrar estimulação" step={1} steps={["Dados", "Salvar"]} />
      <FieldCard className="space-y-4">
        <F label="Fazenda">
          <Select value={farmId} onValueChange={setFarmId}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>{me.assignments.map((a) => <SelectItem key={a.farm.id} value={a.farm.id}>{a.farm.name}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <F label="Produto">
          <Select value={product} onValueChange={setProduct}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>{PRODUCTS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <F label="Dosagem"><div className="flex items-center gap-2"><Input className="h-11 rounded-xl" inputMode="decimal" value={dose} onChange={(e) => setDose(e.target.value)} /><span className="text-xs text-muted-foreground">ml/árvore</span></div></F>
        <div className="grid grid-cols-2 gap-3">
          <F label="Árvores previstas"><Input className="h-11 rounded-xl" inputMode="numeric" value={previstas} onChange={(e) => setPrevistas(e.target.value)} /></F>
          <F label="Realizadas"><Input className="h-11 rounded-xl" inputMode="numeric" value={realizadas} onChange={(e) => setRealizadas(e.target.value)} /></F>
        </div>
        <F label="Responsável pela aplicação"><Input className="h-11 rounded-xl" value={team} onChange={(e) => setTeam(e.target.value)} placeholder="Ex.: Equipe 02 — Carlos Silva" /></F>
        <F label="Próxima estimulação"><Input type="date" className="h-11 rounded-xl" value={next} onChange={(e) => setNext(e.target.value)} /></F>
        <div>
          <Label className="mb-2 block text-xs font-medium text-muted-foreground">Fotos</Label>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((u, i) => <img key={i} src={u} alt="" className="h-20 w-full rounded-xl object-cover" />)}
            <label className="grid h-20 w-full cursor-pointer place-items-center rounded-xl border border-dashed border-border/60 bg-background/40 text-muted-foreground hover:border-primary hover:text-primary">
              <Camera className="h-5 w-5" />
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          {uploading && <div className="mt-2 text-xs text-muted-foreground">Enviando...</div>}
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
