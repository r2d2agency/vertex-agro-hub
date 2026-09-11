import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/vertex/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { AiProviderConfigCard } from "@/components/vertex/ai-provider-config";
import { getSettings, updateSettings, type CompanySettings } from "@/lib/configuracoes.functions";
import { APP_VERSION, checkForUpdate, applyUpdate } from "@/lib/app-update";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [
    { title: "Configurações — Vertex Agro" },
    { name: "description", content: "Preferências operacionais da empresa." },
    { name: "robots", content: "noindex" },
  ] }),
  component: ConfigPage,
});

function ConfigPage() {
  const { companyId, companies, isLoading, setCompanyId } = useSelectedCompany();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["settings", companyId], queryFn: () => getSettings(companyId!), enabled: !!companyId });
  const [form, setForm] = useState<Partial<CompanySettings>>({});

  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = useMutation({
    mutationFn: () => updateSettings(companyId!, form),
    onSuccess: () => { toast.success("Configurações salvas"); qc.invalidateQueries({ queryKey: ["settings", companyId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6">
      <PageHeader title="Configurações" description="Preferências operacionais e de retenção da empresa." />
      <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />
      {!isLoading && companies.length === 0 && <NoCompanyCard />}

      {companyId && (
        <Card>
          <CardHeader><CardTitle className="text-base">Preferências</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-1">
              <Label>Fuso horário</Label>
              <Select value={form.timezone ?? "America/Sao_Paulo"} onValueChange={(v) => setForm({ ...form, timezone: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/Sao_Paulo">America/Sao_Paulo</SelectItem>
                  <SelectItem value="America/Manaus">America/Manaus</SelectItem>
                  <SelectItem value="America/Cuiaba">America/Cuiaba</SelectItem>
                  <SelectItem value="America/Bahia">America/Bahia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label>Moeda</Label>
              <Select value={form.currency ?? "BRL"} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">BRL</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label>Unidade de peso</Label>
              <Select value={form.unitWeight ?? "kg"} onValueChange={(v) => setForm({ ...form, unitWeight: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="kg">kg</SelectItem><SelectItem value="t">t</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label>Unidade de volume</Label>
              <Select value={form.unitVolume ?? "L"} onValueChange={(v) => setForm({ ...form, unitVolume: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="L">L</SelectItem><SelectItem value="mL">mL</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label>Retenção de fotografias (dias)</Label>
              <Input type="number" value={form.photoRetentionDays ?? 365} onChange={(e) => setForm({ ...form, photoRetentionDays: Number(e.target.value) })} />
            </div>
            <div className="grid gap-1">
              <Label>Frequência mínima de visita do consultor (dias)</Label>
              <Input
                type="number"
                value={form.extra?.visitFrequencyDays ?? 30}
                onChange={(e) => setForm({ ...form, extra: { ...form.extra, visitFrequencyDays: Number(e.target.value) } })}
              />
              <p className="text-xs text-muted-foreground">Prazo máximo sem visita registrada antes de a fazenda aparecer como atrasada para o consultor.</p>
            </div>
            <div className="md:col-span-2">
              <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {companyId && <AiProviderConfigCard companyId={companyId} />}

      <SystemVersionCard />
    </div>
  );
}

function SystemVersionCard() {
  const [checking, setChecking] = useState(false);

  async function handleCheck() {
    setChecking(true);
    try {
      const hasUpdate = await checkForUpdate();
      if (hasUpdate) {
        toast.info("Nova versão encontrada, atualizando...");
        await applyUpdate();
      } else {
        toast.success("Você já está na versão mais recente");
      }
    } finally {
      setChecking(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Sistema</CardTitle></CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm">Versão atual (build)</p>
          <p className="text-xs text-muted-foreground">{APP_VERSION}</p>
        </div>
        <Button variant="outline" onClick={handleCheck} disabled={checking}>
          {checking ? "Verificando..." : "Verificar atualizações"}
        </Button>
      </CardContent>
    </Card>
  );
}
