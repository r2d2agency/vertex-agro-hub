import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { getFieldMe, type FieldMe, submitDelivery } from "@/lib/field.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/campo/producao")({ component: ProducaoPage });

function ProducaoPage() {
  const nav = useNavigate();
  const [me, setMe] = useState<FieldMe | null>(null);
  const [farmId, setFarmId] = useState("");
  const [gross, setGross] = useState("");
  const [net, setNet] = useState("");
  const [drc, setDrc] = useState("");
  const [latexType, setLatexType] = useState("cernambi");
  const [coag, setCoag] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { getFieldMe().then((m) => { setMe(m); if (m.assignments[0]) setFarmId(m.assignments[0].farm.id); }); }, []);
  const farm = useMemo(() => me?.assignments.find((a) => a.farm.id === farmId)?.farm, [me, farmId]);
  if (!me) return <Loader2 className="mx-auto mt-10 h-5 w-5 animate-spin text-primary" />;
  if (me.assignments.length === 0) return <p className="text-sm text-muted-foreground">Sem fazendas atribuídas.</p>;

  const dryPreview = net && drc ? ((Number(net) * Number(drc)) / 100).toFixed(2) : "—";

  async function save() {
    if (!farm) return;
    setSaving(true);
    const res = await submitDelivery({
      companyId: farm.companyId, farmId: farm.id,
      deliveryDate: new Date().toISOString().slice(0, 10),
      grossWeightKg: gross ? Number(gross) : null,
      netWeightKg: net ? Number(net) : null,
      drcAvgPercent: drc ? Number(drc) : null,
      latexType: latexType || undefined,
      coagulant: coag || undefined,
      notes: notes || undefined,
    });
    setSaving(false);
    toast.success(res.queued ? "Entrega salva na fila (offline)" : "Entrega registrada");
    nav({ to: "/campo" });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Registrar produção</h1>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label>Fazenda</Label>
          <Select value={farmId} onValueChange={setFarmId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{me.assignments.map((a) => <SelectItem key={a.farm.id} value={a.farm.id}>{a.farm.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Peso bruto (kg)</Label><Input inputMode="decimal" value={gross} onChange={(e) => setGross(e.target.value)} /></div>
          <div className="space-y-1"><Label>Peso líquido (kg)</Label><Input inputMode="decimal" value={net} onChange={(e) => setNet(e.target.value)} /></div>
          <div className="space-y-1"><Label>DRC médio %</Label><Input inputMode="decimal" value={drc} onChange={(e) => setDrc(e.target.value)} /></div>
          <div className="space-y-1"><Label>Kg secos</Label><Input value={dryPreview} readOnly /></div>
        </div>
        <div className="space-y-1">
          <Label>Tipo de látex</Label>
          <Select value={latexType} onValueChange={setLatexType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="liquido">Líquido</SelectItem>
              <SelectItem value="cernambi">Cernambi</SelectItem>
              <SelectItem value="prancha">Prancha</SelectItem>
              <SelectItem value="gsl">GSL</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label>Coagulante</Label><Input value={coag} onChange={(e) => setCoag(e.target.value)} placeholder="ex: ácido acético" /></div>
        <div className="space-y-1"><Label>Observações</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <Button className="w-full" onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
        </Button>
      </div>
    </div>
  );
}
