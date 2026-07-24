import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Calculator, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/vertex/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_authenticated/simulador")({
  head: () => ({ meta: [
    { title: "Simulador — Vertex Agro" },
    { name: "description", content: "Simulador de cenários de produção de borracha seca." },
    { name: "robots", content: "noindex" },
  ] }),
  component: SimuladorPage,
});

type State = {
  areaHa: number;
  arvoresHa: number;
  sangradores: number;
  arvoresSangrador: number;
  freqDias: number;   // d/3, d/4...
  diasMes: number;
  mlPorArvore: number;
  drcPct: number;
  precoKg: number;
  custoDia: number;   // custo diário por sangrador
  outrosCustosMes: number;
};

const DEFAULTS: State = {
  areaHa: 100,
  arvoresHa: 500,
  sangradores: 5,
  arvoresSangrador: 600,
  freqDias: 3,
  diasMes: 22,
  mlPorArvore: 35,
  drcPct: 38,
  precoKg: 8.5,
  custoDia: 120,
  outrosCustosMes: 3000,
};

function fmt(n: number, d = 0) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: d });
}

function SimuladorPage() {
  const [s, setS] = useState<State>(DEFAULTS);
  const set = <K extends keyof State>(k: K, v: number) => setS((p) => ({ ...p, [k]: v }));

  const r = useMemo(() => {
    const arvoresTotais = s.sangradores * s.arvoresSangrador;
    const sangriasMes = s.diasMes / s.freqDias;
    const litrosMes = (arvoresTotais * s.mlPorArvore * sangriasMes) / 1000;
    const kgSecosMes = litrosMes * (s.drcPct / 100);
    const kgSecosAno = kgSecosMes * 12;
    const produtividadeKgHa = s.areaHa > 0 ? kgSecosAno / s.areaHa : 0;
    const receitaMes = kgSecosMes * s.precoKg;
    const custoSangradores = s.sangradores * s.custoDia * s.diasMes;
    const custoTotalMes = custoSangradores + s.outrosCustosMes;
    const margemMes = receitaMes - custoTotalMes;
    const custoPorKg = kgSecosMes > 0 ? custoTotalMes / kgSecosMes : 0;
    return {
      arvoresTotais, sangriasMes, litrosMes, kgSecosMes, kgSecosAno,
      produtividadeKgHa, receitaMes, custoSangradores, custoTotalMes, margemMes, custoPorKg,
    };
  }, [s]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Simulador"
        description="Projete produção, receita e margem a partir de parâmetros operacionais."
        actions={
          <Button variant="outline" onClick={() => setS(DEFAULTS)}>
            <RefreshCw className="mr-2 h-4 w-4" /> Restaurar padrões
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Calculator className="h-4 w-4" /> Parâmetros</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <Section title="Área e plantio">
              <Field label="Área (ha)" value={s.areaHa} onChange={(v) => set("areaHa", v)} />
              <Field label="Árvores/ha" value={s.arvoresHa} onChange={(v) => set("arvoresHa", v)} />
            </Section>
            <Section title="Equipe e sangria">
              <Field label="Sangradores" value={s.sangradores} onChange={(v) => set("sangradores", v)} />
              <Field label="Árvores por sangrador" value={s.arvoresSangrador} onChange={(v) => set("arvoresSangrador", v)} />
              <Field label="Frequência (d/N)" value={s.freqDias} onChange={(v) => set("freqDias", Math.max(1, v))} />
              <Field label="Dias úteis/mês" value={s.diasMes} onChange={(v) => set("diasMes", v)} />
            </Section>
            <Section title="Produção">
              <Field label="mL por árvore / sangria" value={s.mlPorArvore} onChange={(v) => set("mlPorArvore", v)} />
              <Field label="DRC médio (%)" value={s.drcPct} step={0.1} onChange={(v) => set("drcPct", v)} />
            </Section>
            <Section title="Financeiro">
              <Field label="Preço kg seco (R$)" value={s.precoKg} step={0.1} onChange={(v) => set("precoKg", v)} />
              <Field label="Custo diário/sangrador (R$)" value={s.custoDia} onChange={(v) => set("custoDia", v)} />
              <Field label="Outros custos/mês (R$)" value={s.outrosCustosMes} onChange={(v) => set("outrosCustosMes", v)} />
            </Section>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Result label="Árvores em sangria" value={fmt(r.arvoresTotais)} />
            <Result label="Sangrias/mês" value={fmt(r.sangriasMes, 1)} />
            <Result label="Litros/mês" value={fmt(r.litrosMes)} />
            <Result label="Kg secos/mês" value={fmt(r.kgSecosMes)} highlight />
            <Result label="Kg secos/ano" value={fmt(r.kgSecosAno)} />
            <Result label="Produtividade (kg/ha·ano)" value={fmt(r.produtividadeKgHa, 1)} />
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Resultado financeiro (mensal)</CardTitle></CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <Row label="Receita" value={`R$ ${fmt(r.receitaMes, 2)}`} />
              <Row label="Custo com sangradores" value={`R$ ${fmt(r.custoSangradores, 2)}`} />
              <Row label="Outros custos" value={`R$ ${fmt(s.outrosCustosMes, 2)}`} />
              <Separator />
              <Row label="Custo total" value={`R$ ${fmt(r.custoTotalMes, 2)}`} />
              <Row label="Custo por kg seco" value={`R$ ${fmt(r.custoPorKg, 2)}`} />
              <Separator />
              <Row
                label="Margem"
                value={`R$ ${fmt(r.margemMes, 2)}`}
                emphasis={r.margemMes >= 0 ? "positive" : "negative"}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
    </div>
  );
}
function Field({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <div className="grid gap-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  );
}
function Result({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle></CardHeader>
      <CardContent><p className={highlight ? "text-2xl font-semibold text-primary" : "text-xl font-semibold"}>{value}</p></CardContent>
    </Card>
  );
}
function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: "positive" | "negative" }) {
  const cls = emphasis === "positive" ? "font-semibold text-emerald-600"
    : emphasis === "negative" ? "font-semibold text-red-600" : "";
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cls}>{value}</span>
    </div>
  );
}
