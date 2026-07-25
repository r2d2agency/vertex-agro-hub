import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { getFieldMe, type FieldMe, submitTapping } from "@/lib/field.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_field/sangria")({ component: SangriaPage });

function SangriaPage() {
  const nav = useNavigate();
  const [me, setMe] = useState<FieldMe | null>(null);
  const [farmId, setFarmId] = useState<string>("");
  const [sangrador, setSangrador] = useState("");
  const [liters, setLiters] = useState("");
  const [drc, setDrc] = useState("");
  const [ader, setAder] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { getFieldMe().then((m) => { setMe(m); setSangrador(m.user.fullName ?? ""); if (m.assignments[0]) setFarmId(m.assignments[0].farm.id); }); }, []);

  const farm = useMemo(() => me?.assignments.find((a) => a.farm.id === farmId)?.farm, [me, farmId]);

  if (!me) return <Loader2 className="mx-auto mt-10 h-5 w-5 animate-spin text-primary" />;
  if (me.assignments.length === 0) return <p className="text-sm text-muted-foreground">Sem fazendas atribuídas.</p>;

  async function save() {
    if (!farm || !sangrador.trim()) { toast.error("Preencha fazenda e sangrador"); return; }
    setSaving(true);
    const res = await submitTapping({
      companyId: farm.companyId, farmId: farm.id,
      date: new Date().toISOString().slice(0, 10),
      sangradorName: sangrador.trim(),
      liters: liters ? Number(liters) : null,
      drcPercent: drc ? Number(drc) : null,
      adherencePct: ader ? Number(ader) : null,
      notes: notes.trim() || undefined,
    });
    setSaving(false);
    toast.success(res.queued ? "Sangria salva na fila (offline)" : "Sangria registrada");
    nav({ to: "/campo" });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Registrar sangria</h1>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label>Fazenda</Label>
          <Select value={farmId} onValueChange={setFarmId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{me.assignments.map((a) => <SelectItem key={a.farm.id} value={a.farm.id}>{a.farm.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label>Sangrador</Label><Input value={sangrador} onChange={(e) => setSangrador(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Litros</Label><Input inputMode="decimal" value={liters} onChange={(e) => setLiters(e.target.value)} /></div>
          <div className="space-y-1"><Label>DRC %</Label><Input inputMode="decimal" value={drc} onChange={(e) => setDrc(e.target.value)} /></div>
        </div>
        <div className="space-y-1"><Label>Aderência %</Label><Input inputMode="decimal" value={ader} onChange={(e) => setAder(e.target.value)} /></div>
        <div className="space-y-1"><Label>Observações</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <Button className="w-full" onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
        </Button>
      </div>
    </div>
  );
}
