import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Sparkles, TrendingUp, ListChecks, AlertTriangle, KeyRound, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/vertex/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import {
  listInsights, listActionPlans, listForecasts,
  getAiConfig, updateAiConfig, testAiConfig, type AiProvider,
} from "@/lib/ai.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/ia")({
  head: () => ({ meta: [
    { title: "Central IA — Vertex Agro" },
    { name: "description", content: "Painel central da inteligência artificial da Vertex Agro." },
    { name: "robots", content: "noindex" },
  ] }),
  component: IaPage,
});

const CARDS = [
  { to: "/alertas-ia", title: "Alertas Inteligentes", icon: AlertTriangle, description: "Anomalias e riscos detectados pela IA." },
  { to: "/assistente",  title: "Assistente Gerencial", icon: Bot, description: "Converse com a IA sobre sua operação." },
  { to: "/previsoes",   title: "Previsões",            icon: TrendingUp, description: "Projeções de produção de borracha seca." },
  { to: "/planos-acao", title: "Planos de Ação",       icon: ListChecks, description: "Planos priorizados e acompanhamento." },
] as const;

const PROVIDER_HINTS: Record<AiProvider, { label: string; help: string; keyLabel: string; keyPlaceholder: string; modelPlaceholder: string }> = {
  lovable: {
    label: "Lovable AI Gateway",
    help: "Gateway gerenciado com acesso a Gemini e OpenAI. Use se você tem uma LOVABLE_API_KEY.",
    keyLabel: "LOVABLE_API_KEY",
    keyPlaceholder: "sk-lovable-...",
    modelPlaceholder: "google/gemini-3.6-flash",
  },
  openai: {
    label: "OpenAI (direto)",
    help: "Consulte suas chaves em platform.openai.com/api-keys.",
    keyLabel: "OpenAI API Key",
    keyPlaceholder: "sk-...",
    modelPlaceholder: "gpt-4o-mini",
  },
  gemini: {
    label: "Google Gemini (direto)",
    help: "Gere sua chave em aistudio.google.com/app/apikey.",
    keyLabel: "Google AI Studio Key",
    keyPlaceholder: "AIza...",
    modelPlaceholder: "gemini-2.5-flash",
  },
};

function IaPage() {
  const { companyId, companies, isLoading, setCompanyId } = useSelectedCompany();

  const insights = useQuery({ queryKey: ["ai-insights", companyId], queryFn: () => listInsights(companyId!), enabled: !!companyId });
  const plans = useQuery({ queryKey: ["action-plans", companyId], queryFn: () => listActionPlans(companyId!), enabled: !!companyId });
  const forecasts = useQuery({ queryKey: ["ai-forecast", companyId], queryFn: () => listForecasts(companyId!), enabled: !!companyId });

  const openInsights = (insights.data ?? []).filter((i) => !i.acknowledged).length;
  const openPlans = (plans.data ?? []).filter((p) => p.status !== "concluido" && p.status !== "cancelado").length;
  const lastForecast = forecasts.data?.[0];

  return (
    <div className="grid gap-6">
      <PageHeader title="Central IA" description="Ponto de partida para a inteligência artificial da plataforma." />
      <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />
      {!isLoading && companies.length === 0 && <NoCompanyCard />}

      {companyId && (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Alertas pendentes</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-semibold">{openInsights}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Planos ativos</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-semibold">{openPlans}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Última previsão</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-semibold">{lastForecast ? `${lastForecast.predictedDryKg.toLocaleString("pt-BR")} kg` : "—"}</p></CardContent></Card>
          </div>

          <ProviderConfigCard companyId={companyId} />
        </>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.to} to={c.to} className="block">
              <Card className="transition-colors hover:border-primary">
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Icon className="h-5 w-5 text-primary" /> {c.title}</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground">{c.description}</p></CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4" /> Como funciona</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground">
          <p>A IA da Vertex Agro é alimentada pelos dados operacionais da sua empresa: entregas de produção, dias de sangria, DRC, ocorrências e fazendas.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function ProviderConfigCard({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["ai-config", companyId], queryFn: () => getAiConfig(companyId) });

  const [provider, setProvider] = useState<AiProvider>("lovable");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [useEnvKey, setUseEnvKey] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!data) return;
    setProvider((data.provider as AiProvider) ?? "lovable");
    setModel(data.model ?? "");
    setUseEnvKey(!!data.useEnvKey);
    setApiKey("");
  }, [data]);

  const hint = PROVIDER_HINTS[provider];

  const save = useMutation({
    mutationFn: () => updateAiConfig(companyId, { provider, model: model || null, apiKey: apiKey || undefined, useEnvKey }),
    onSuccess: () => {
      toast.success("Configuração de IA salva");
      setApiKey("");
      qc.invalidateQueries({ queryKey: ["ai-config", companyId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const test = useMutation({
    mutationFn: () => testAiConfig({ companyId, provider, model: model || undefined, apiKey: apiKey || undefined, useEnvKey }),
    onSuccess: (r) => {
      if (r.ok) {
        setTestResult({ ok: true, message: `Conexão OK — ${r.provider}/${r.model}` });
        toast.success("Conexão validada");
      } else {
        setTestResult({ ok: false, message: r.error ?? "Falha desconhecida" });
        toast.error(r.error ?? "Falha no teste");
      }
    },
    onError: (e: any) => {
      setTestResult({ ok: false, message: e.message });
      toast.error(e.message);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4 text-primary" /> Configuração do provedor de IA
          {data?.hasKey && <Badge variant="outline" className="ml-2">Chave salva</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-1">
            <Label>Provedor</Label>
            <Select value={provider} onValueChange={(v) => { setProvider(v as AiProvider); setTestResult(null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lovable">Lovable AI Gateway (Gemini/OpenAI)</SelectItem>
                <SelectItem value="openai">OpenAI (direto)</SelectItem>
                <SelectItem value="gemini">Google Gemini (direto)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{hint.help}</p>
          </div>
          <div className="grid gap-1">
            <Label>Modelo</Label>
            <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder={hint.modelPlaceholder} />
            <p className="text-xs text-muted-foreground">Deixe vazio para usar o padrão.</p>
          </div>
        </div>

        {provider === "lovable" && data?.envKeyAvailable && (
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="grid">
              <span className="text-sm font-medium">Usar LOVABLE_API_KEY do backend</span>
              <span className="text-xs text-muted-foreground">Se ativado, ignora a chave salva por empresa e usa a variável do servidor.</span>
            </div>
            <Switch checked={useEnvKey} onCheckedChange={setUseEnvKey} />
          </div>
        )}

        {!useEnvKey && (
          <div className="grid gap-1">
            <Label>{hint.keyLabel}</Label>
            <Input
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={data?.hasKey ? "•••••••• (chave salva — preencha para substituir)" : hint.keyPlaceholder}
            />
            <p className="text-xs text-muted-foreground">A chave é armazenada no backend e nunca exibida novamente.</p>
          </div>
        )}

        {testResult && (
          <div className={`flex items-start gap-2 rounded-md border p-3 text-sm ${testResult.ok ? "border-emerald-500/40 bg-emerald-500/5" : "border-destructive/40 bg-destructive/5"}`}>
            {testResult.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-destructive" />}
            <span>{testResult.message}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => test.mutate()} disabled={test.isPending}>
            {test.isPending ? "Testando…" : "Testar conexão"}
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Salvando…" : "Salvar configuração"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
