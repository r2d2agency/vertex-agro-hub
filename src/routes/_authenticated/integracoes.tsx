import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/vertex/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { createIntegration, deleteIntegration, listDeliveries, listIntegrations, testIntegration, updateIntegration } from "@/lib/integracoes.functions";
import { Plug, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/integracoes")({
  head: () => ({ meta: [
    { title: "Integrações — Vertex Agro" },
    { name: "description", content: "Webhooks e integrações externas (AGS, ERPs)." },
    { name: "robots", content: "noindex" },
  ] }),
  component: IntPage,
});

const PROVIDERS = [
  { value: "webhook", label: "Webhook genérico" },
  { value: "ags", label: "AGS (webhook)" },
];

function IntPage() {
  const { companyId, companies, isLoading, setCompanyId } = useSelectedCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", provider: "webhook", url: "", secret: "" });

  const { data: rows = [] } = useQuery({ queryKey: ["integrations", companyId], queryFn: () => listIntegrations(companyId!), enabled: !!companyId });
  const { data: deliveries = [] } = useQuery({ queryKey: ["deliveries", selected], queryFn: () => listDeliveries(selected!), enabled: !!selected });

  const createMut = useMutation({
    mutationFn: () => createIntegration({ companyId: companyId!, name: form.name, provider: form.provider, config: { url: form.url }, secret: form.secret || undefined }),
    onSuccess: () => { toast.success("Integração criada"); setOpen(false); setForm({ name: "", provider: "webhook", url: "", secret: "" }); qc.invalidateQueries({ queryKey: ["integrations", companyId] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const toggle = useMutation({ mutationFn: (r: { id: string; active: boolean }) => updateIntegration(r.id, { active: r.active }), onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations", companyId] }) });
  const del = useMutation({ mutationFn: (id: string) => deleteIntegration(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations", companyId] }) });
  const test = useMutation({ mutationFn: (id: string) => testIntegration(id), onSuccess: (r) => { toast.success(`Teste ${r.status} (${r.statusCode})`); if (selected) qc.invalidateQueries({ queryKey: ["deliveries", selected] }); } });

  return (
    <div className="grid gap-6">
      <PageHeader title="Integrações" description="Envie eventos para sistemas externos via webhook." actions={companyId ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nova integração</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova integração</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid gap-1"><Label>Provedor</Label>
                <Select value={form.provider} onValueChange={(v) => setForm({ ...form, provider: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PROVIDERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-1"><Label>URL</Label><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" /></div>
              <div className="grid gap-1"><Label>Segredo (assinatura X-Vertex-Signature)</Label><Input value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={() => createMut.mutate()} disabled={!form.name || !form.url}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : undefined} />
      <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />
      {!isLoading && companies.length === 0 && <NoCompanyCard />}

      {companyId && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plug className="h-4 w-4" /> Integrações configuradas</CardTitle></CardHeader>
          <CardContent className="grid gap-2">
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma integração cadastrada.</p>
            ) : rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <button className="grid text-left" onClick={() => setSelected(r.id)}>
                  <span className="font-medium">{r.name} <Badge variant="outline" className="ml-1">{r.provider}</Badge></span>
                  <span className="text-xs text-muted-foreground">{(r.config as any)?.url}</span>
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2"><Switch checked={r.active} onCheckedChange={(v) => toggle.mutate({ id: r.id, active: v })} /><span className="text-xs text-muted-foreground">Ativa</span></div>
                  <Button size="sm" variant="outline" onClick={() => test.mutate(r.id)}><Send className="mr-2 h-4 w-4" />Testar</Button>
                  <Button size="icon" variant="ghost" onClick={() => del.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {selected && (
        <Card>
          <CardHeader><CardTitle className="text-base">Últimas entregas</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr><th className="p-3">Quando</th><th className="p-3">Evento</th><th className="p-3">Status</th><th className="p-3">HTTP</th><th className="p-3">Resposta</th></tr>
                </thead>
                <tbody>
                  {deliveries.length === 0 ? (
                    <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Sem entregas.</td></tr>
                  ) : deliveries.map((d) => (
                    <tr key={d.id} className="border-t">
                      <td className="p-3 whitespace-nowrap">{new Date(d.attemptedAt).toLocaleString("pt-BR")}</td>
                      <td className="p-3">{d.event}</td>
                      <td className="p-3"><Badge variant={d.status === "ok" ? "outline" : "destructive"}>{d.status}</Badge></td>
                      <td className="p-3">{d.statusCode ?? "—"}</td>
                      <td className="p-3 max-w-[400px] truncate text-muted-foreground">{d.responseBody ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
