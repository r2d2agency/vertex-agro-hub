import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAiConfig, updateAiConfig, testAiConfig, type AiProvider } from "@/lib/ai.functions";
import { toast } from "sonner";

const PROVIDER_HINTS: Record<Exclude<AiProvider, "lovable">, { label: string; help: string; keyLabel: string; keyPlaceholder: string; modelPlaceholder: string; docsUrl: string }> = {
  openai: {
    label: "OpenAI",
    help: "Consulte suas chaves em platform.openai.com/api-keys.",
    keyLabel: "OpenAI API Key",
    keyPlaceholder: "sk-...",
    modelPlaceholder: "gpt-4o-mini",
    docsUrl: "https://platform.openai.com/api-keys",
  },
  gemini: {
    label: "Google Gemini",
    help: "Gere sua chave em aistudio.google.com/app/apikey.",
    keyLabel: "Google AI Studio Key",
    keyPlaceholder: "AIza...",
    modelPlaceholder: "gemini-2.5-flash",
    docsUrl: "https://aistudio.google.com/app/apikey",
  },
};

export function AiProviderConfigCard({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["ai-config", companyId], queryFn: () => getAiConfig(companyId) });

  const [provider, setProvider] = useState<Exclude<AiProvider, "lovable">>("openai");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!data) return;
    const p = (data.provider as AiProvider) === "gemini" ? "gemini" : "openai";
    setProvider(p);
    setModel(data.model ?? "");
    setApiKey("");
  }, [data]);

  const hint = PROVIDER_HINTS[provider];

  const save = useMutation({
    mutationFn: () => updateAiConfig(companyId, { provider, model: model || null, apiKey: apiKey || undefined, useEnvKey: false }),
    onSuccess: () => {
      toast.success("Configuração de IA salva");
      setApiKey("");
      qc.invalidateQueries({ queryKey: ["ai-config", companyId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const test = useMutation({
    mutationFn: () => testAiConfig({ companyId, provider, model: model || undefined, apiKey: apiKey || undefined, useEnvKey: false }),
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
          <KeyRound className="h-4 w-4 text-primary" /> Provedor de Inteligência Artificial
          {data?.hasKey && <Badge variant="outline" className="ml-2">Chave salva</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <p className="text-sm text-muted-foreground">
          Configure o provedor de IA usado pela Central IA, Assistente Gerencial, Alertas e Previsões.
          A chave é armazenada com segurança no backend e nunca reexibida.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-1">
            <Label>Provedor</Label>
            <Select value={provider} onValueChange={(v) => { setProvider(v as any); setTestResult(null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="gemini">Google Gemini</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {hint.help}{" "}
              <a href={hint.docsUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                Obter chave
              </a>
            </p>
          </div>
          <div className="grid gap-1">
            <Label>Modelo</Label>
            <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder={hint.modelPlaceholder} />
            <p className="text-xs text-muted-foreground">Deixe vazio para usar o padrão.</p>
          </div>
        </div>

        <div className="grid gap-1">
          <Label>{hint.keyLabel}</Label>
          <Input
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={data?.hasKey ? "•••••••• (chave salva — preencha para substituir)" : hint.keyPlaceholder}
          />
        </div>

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
