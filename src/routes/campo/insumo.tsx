import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Package } from "lucide-react";
import { getFieldMe, type FieldMe, submitInventoryMovement } from "@/lib/field.functions";
import { listInventoryItems, type InventoryItem } from "@/lib/frota-ops.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FieldCard, StepHeader } from "@/components/vertex/field/step-header";
import { getLocalIsoString } from "@/lib/date-utils";

export const Route = createFileRoute("/campo/insumo")({ component: InsumoPage });

function InsumoPage() {
  const nav = useNavigate();
  const [me, setMe] = useState<FieldMe | null>(null);
  const [farmId, setFarmId] = useState("");
  const [items, setItems] = useState<InventoryItem[]>([]);

  const [kind, setKind] = useState<"saida" | "entrada" | "ajuste">("saida");
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [supplier, setSupplier] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { getFieldMe().then((m) => { setMe(m); if (m.assignments[0]) setFarmId(m.assignments[0].farm.id); }); }, []);
  const farm = useMemo(() => me?.assignments.find((a) => a.farm.id === farmId)?.farm, [me, farmId]);
  const companyId = farm?.companyId;

  useEffect(() => {
    if (!companyId) return;
    listInventoryItems(companyId).then(setItems).catch(() => setItems([]));
  }, [companyId]);

  // Insumos apenas — filtra por categoria "insumo/produto/lubrificante" e, se possível, pela fazenda
  const farmItems = useMemo(() => {
    const inputs = items.filter(i => ["insumo", "produto", "lubrificante"].includes(i.category));
    const scoped = inputs.filter(i => !i.farmId || i.farmId === farmId);
    return scoped.length ? scoped : inputs;
  }, [items, farmId]);

  const item = farmItems.find(i => i.id === itemId);

  async function save() {
    if (!companyId || !itemId || !quantity) { toast.error("Preencha item e quantidade"); return; }
    setSaving(true);
    const res = await submitInventoryMovement({
      companyId, itemId, kind,
      quantity: Number(quantity.replace(",", ".")),
      occurredAt: getLocalIsoString(),
      reason: kind !== "entrada" ? (reason || `Uso na fazenda ${farm?.name ?? ""}`).trim() : undefined,
      supplier: kind === "entrada" ? supplier || undefined : undefined,
      unitCost: kind === "entrada" && unitCost ? Number(unitCost.replace(",", ".")) : undefined,
      notes: notes || undefined,
    });
    setSaving(false);
    toast.success(res.queued ? "Salvo na fila" : "Insumo registrado");
    nav({ to: "/campo" });
  }

  if (!me) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <StepHeader title="Insumo da fazenda" step={1} steps={["Registro"]} />
      <FieldCard className="space-y-4">
        <F label="Fazenda">
          <Select value={farmId} onValueChange={setFarmId}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>{me.assignments.map((a) => <SelectItem key={a.farm.id} value={a.farm.id}>{a.farm.name}</SelectItem>)}</SelectContent>
          </Select>
        </F>

        <div className="grid grid-cols-3 gap-2">
          <KindPill active={kind === "saida"} label="Utilizar" tone="primary" onClick={() => setKind("saida")} />
          <KindPill active={kind === "entrada"} label="Receber" tone="chart-2" onClick={() => setKind("entrada")} />
          <KindPill active={kind === "ajuste"} label="Ajustar" tone="warning" onClick={() => setKind("ajuste")} />
        </div>

        <F label="Insumo *">
          <Select value={itemId} onValueChange={setItemId}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione o insumo" /></SelectTrigger>
            <SelectContent>
              {farmItems.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.name} · {i.currentStock}{i.unit}{i.minStock != null && i.currentStock <= i.minStock ? " ⚠" : ""}
                </SelectItem>
              ))}
              {farmItems.length === 0 && <SelectItem value="none" disabled>Sem insumos cadastrados</SelectItem>}
            </SelectContent>
          </Select>
          {item && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Saldo: <b>{item.currentStock}</b> {item.unit}
              {item.minStock != null ? ` · mín. ${item.minStock}` : ""}
              {item.location ? ` · ${item.location}` : ""}
            </p>
          )}
        </F>

        <F label={kind === "ajuste" ? `Novo saldo (${item?.unit ?? ""}) *` : `Quantidade (${item?.unit ?? ""}) *`}>
          <Input className="h-11 rounded-xl" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </F>

        {kind === "saida" && (
          <F label="Finalidade">
            <Input className="h-11 rounded-xl" placeholder="Ex.: Aplicação talhão 03" value={reason} onChange={(e) => setReason(e.target.value)} />
          </F>
        )}
        {kind === "entrada" && (
          <div className="grid grid-cols-2 gap-3">
            <F label="Custo un. (R$)"><Input className="h-11 rounded-xl" inputMode="decimal" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} /></F>
            <F label="Fornecedor"><Input className="h-11 rounded-xl" value={supplier} onChange={(e) => setSupplier(e.target.value)} /></F>
          </div>
        )}
        <F label="Observações"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></F>

        <Button className="h-12 w-full rounded-xl text-base font-semibold" onClick={save} disabled={saving || !itemId}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
        </Button>

        {farmItems.length === 0 && (
          <div className="mt-2 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
            <Package className="mt-0.5 h-4 w-4" />
            Nenhum insumo cadastrado para esta empresa. Cadastre em <b>Estoque</b> no painel administrativo (categoria "Insumo") e vincule à fazenda.
          </div>
        )}
      </FieldCard>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">{label}</Label>{children}</div>;
}

function KindPill({ active, label, tone, onClick }: { active: boolean; label: string; tone: "primary" | "chart-2" | "warning"; onClick: () => void }) {
  const activeCls =
    tone === "primary" ? "bg-primary text-primary-foreground border-primary" :
    tone === "chart-2" ? "bg-chart-2 text-primary-foreground border-chart-2" :
    "bg-warning text-primary-foreground border-warning";
  return (
    <button type="button" onClick={onClick}
      className={`h-11 rounded-xl border text-sm font-semibold ${active ? activeCls : "border-border/60 bg-background/40 text-muted-foreground"}`}>
      {label}
    </button>
  );
}
