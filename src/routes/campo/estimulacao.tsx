import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import {
  getFieldMe, submitStimulation, listFieldTappers, listFieldTappingTables,
  type FieldMe, type FieldTapper, type FieldTappingTable,
} from "@/lib/field.functions";
import { STIM_CONCENTRATIONS } from "@/lib/estimulacoes.functions";
import { uploadFile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FieldCard, StepHeader } from "@/components/vertex/field/step-header";
import { ChipToggle } from "@/components/vertex/field/chip-toggle";
import { getLocalIsoDate } from "@/lib/date-utils";

export const Route = createFileRoute("/campo/estimulacao")({ component: EstimulacaoPage });

const PRODUCTS = ["Ethephon 48%", "Ethephon 25%", "Ethephon 5%", "Outro"];

function EstimulacaoPage() {
  const nav = useNavigate();
  const [me, setMe] = useState<FieldMe | null>(null);
  const [farmId, setFarmId] = useState("");
  const [plotId, setPlotId] = useState("");
  const [tapperId, setTapperId] = useState("");
  const [tappers, setTappers] = useState<FieldTapper[]>([]);
  const [tables, setTables] = useState<FieldTappingTable[]>([]);
  const [tappingTableId, setTappingTableId] = useState("");
  const [product, setProduct] = useState(PRODUCTS[0]);
  const [concentration, setConcentration] = useState("");
  const [dose, setDose] = useState("2,5");
  const [realizadas, setRealizadas] = useState("");
  const [reason, setReason] = useState("");
  const [next, setNext] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { getFieldMe().then((m) => { setMe(m); if (m.assignments[0]) setFarmId(m.assignments[0].farm.id); }); }, []);
  const farm = useMemo(() => me?.assignments.find((a) => a.farm.id === farmId)?.farm, [me, farmId]);
  const plots = farm?.plots ?? [];
  const plot = plots.find((p) => p.id === plotId);
  const tapper = tappers.find((t) => t.id === tapperId);

  useEffect(() => {
    setPlotId(""); setTapperId(""); setTappingTableId("");
    setTappers([]); setTables([]);
    if (!farm) return;
    listFieldTappers(farm.companyId, farm.id).then(setTappers).catch(() => undefined);
    listFieldTappingTables(farm.companyId).then(setTables).catch(() => undefined);
  }, [farm]);

  function selectPlot(id: string) {
    setPlotId(id);
    const p = plots.find((x) => x.id === id);
    const t = p?.tappingSystem
      ? tables.find((table) => table.notation === p.tappingSystem || table.name === p.tappingSystem)
      : undefined;
    if (t) setTappingTableId(t.id);
  }

  async function onFile(f: File | null) {
    if (!f) return;
    setUploading(true);
    try { const r = await uploadFile(f); setPhotos((c) => [...c, r.url]); } catch (e: any) { toast.error(e?.message ?? "Falha"); }
    finally { setUploading(false); }
  }

  async function save() {
    if (!farm) return;
    setSaving(true);
    const res = await submitStimulation({
      companyId: farm.companyId, farmId: farm.id, plotId: plotId || undefined,
      date: getLocalIsoDate(),
      product,
      concentration: concentration || undefined,
      // Sangradores vinculados só pelo RH (sem ficha Tapper legada) vêm com um
      // id sintético "rh:<userId>" — não pode ser enviado como tapperId (FK).
      tapperId: tapperId && !tapperId.startsWith("rh:") ? tapperId : undefined,
      tappingTableId: tappingTableId || undefined,
      reason: reason.trim() || undefined,
      doseMlPerTree: dose ? Number(dose.replace(",", ".")) : undefined,
      treesStimulated: realizadas ? Number(realizadas) : undefined,
      notes: [
        realizadas && `Árvores realizadas: ${realizadas}`,
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
      <StepHeader title="Registrar estimulação" step={1} steps={["Dados"]} />
      <FieldCard className="space-y-4">
        <F label="Fazenda">
          <Select value={farmId} onValueChange={setFarmId}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>{me.assignments.map((a) => <SelectItem key={a.farm.id} value={a.farm.id}>{a.farm.name}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        {plots.length > 0 && (
          <F label="Talhão">
            <Select value={plotId} onValueChange={selectPlot}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione o talhão" /></SelectTrigger>
              <SelectContent>{plots.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </F>
        )}
        <F label="Sangrador">
          <Select value={tapperId} onValueChange={setTapperId}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder={tappers.length ? "Selecione o sangrador" : "Nenhum sangrador vinculado a esta fazenda"} /></SelectTrigger>
            <SelectContent>{tappers.map((t) => <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        {tables.length > 0 && (
          <F label="Tabela de estimulação">
            <Select value={tappingTableId} onValueChange={setTappingTableId}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione a tabela" /></SelectTrigger>
              <SelectContent>{tables.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}{t.notation ? ` — ${t.notation}` : ""}</SelectItem>)}</SelectContent>
            </Select>
          </F>
        )}
        <div>
          <Label className="mb-2 block text-xs font-medium text-muted-foreground">Produto</Label>
          <div className="grid grid-cols-2 gap-2">
            {PRODUCTS.map((p) => (
              <ChipToggle key={p} active={product === p} label={p} onClick={() => setProduct(p)} />
            ))}
          </div>
        </div>
        <F label="Concentração">
          <Select value={concentration} onValueChange={setConcentration}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{STIM_CONCENTRATIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <F label="Dosagem"><div className="flex items-center gap-2"><Input className="h-11 rounded-xl" inputMode="decimal" value={dose} onChange={(e) => setDose(e.target.value)} /><span className="text-xs text-muted-foreground">ml/árvore</span></div></F>
        <F label="Árvores realizadas"><Input className="h-11 rounded-xl" inputMode="numeric" value={realizadas} onChange={(e) => setRealizadas(e.target.value)} /></F>
        <F label="Motivo (opcional)">
          <Textarea className="rounded-xl" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: painel em repouso, estimulação preventiva..." />
        </F>
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
