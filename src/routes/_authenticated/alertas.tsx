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
import { createAlertRule, deleteAlertRule, evaluateAlerts, listAlertEvents, listAlertRules, updateAlertRule } from "@/lib/alertas.functions";
import { Bell, Plus, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/alertas")({
  head: () => ({ meta: [
    { title: "Alertas — Vertex Agro" },
    { name: "description", content: "Regras de alertas operacionais e histórico de eventos." },
    { name: "robots", content: "noindex" },
  ] }),
  component: AlertasPage,
});

const KINDS: Array<{ value: string; label: string; hint: string }> = [
  { value: "occurrence_open_days", label: "Ocorrência aberta há N dias", hint: '{"days": 3}' },
  { value: "drc_out_of_range", label: "DRC fora da faixa (7 dias)", hint: '{"min":25,"max":45}' },
];

function AlertasPage() {
  const { companyId, companies, isLoading, setCompanyId } = useSelectedCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState(KINDS[0].value);
  const [threshold, setThreshold] = useState(KINDS[0].hint);

  const { data: rules = [] } = useQuery({ queryKey: ["alert-rules", companyId], queryFn: () => listAlertRules(companyId!), enabled: !!companyId });
  const { data: events = [] } = useQuery({ queryKey: ["alert-events", companyId], queryFn: () => listAlertEvents(companyId!), enabled: !!companyId });

  const createMut = useMutation({
    mutationFn: () => createAlertRule({ companyId: companyId!, name, kind, threshold: threshold ? JSON.parse(threshold) : undefined }),
    onSuccess: () => { toast.success("Regra criada"); setOpen(false); setName(""); qc.invalidateQueries({ queryKey: ["alert-rules", companyId] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const toggleMut = useMutation({
    mutationFn: (r: { id: string; active: boolean }) => updateAlertRule(r.id, { active: r.active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alert-rules", companyId] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteAlertRule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alert-rules", companyId] }),
  });
  const evalMut = useMutation({
    mutationFn: () => evaluateAlerts(companyId!),
    onSuccess: (r) => { toast.success(`${r.created} alertas gerados`); qc.invalidateQueries({ queryKey: ["alert-events", companyId] }); },
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Alertas"
        description="Motor de regras e histórico de eventos."
        actions={companyId ? (
          <>
            <Button variant="outline" onClick={() => evalMut.mutate()} disabled={evalMut.isPending}>
              <Play className="mr-2 h-4 w-4" /> Avaliar agora
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nova regra</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova regra de alerta</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div className="grid gap-1"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                  <div className="grid gap-1">
                    <Label>Tipo</Label>
                    <Select value={kind} onValueChange={(v) => { setKind(v); setThreshold(KINDS.find((k) => k.value === v)?.hint ?? ""); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1"><Label>Parâmetros (JSON)</Label><Input value={threshold} onChange={(e) => setThreshold(e.target.value)} /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button onClick={() => createMut.mutate()} disabled={!name}>Salvar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : undefined}
      />
      <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />
      {!isLoading && companies.length === 0 && <NoCompanyCard />}

      {companyId && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Regras</CardTitle></CardHeader>
            <CardContent className="grid gap-2">
              {rules.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma regra configurada.</p>
              ) : rules.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <div className="grid">
                    <span className="font-medium">{r.name}</span>
                    <span className="text-xs text-muted-foreground">{r.kind} · {JSON.stringify(r.threshold ?? {})}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2"><Switch checked={r.active} onCheckedChange={(v) => toggleMut.mutate({ id: r.id, active: v })} /><span className="text-xs text-muted-foreground">Ativa</span></div>
                    <Button size="icon" variant="ghost" onClick={() => deleteMut.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" /> Eventos recentes</CardTitle></CardHeader>
            <CardContent className="grid gap-2">
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum evento gerado.</p>
              ) : events.map((e) => (
                <div key={e.id} className="flex items-start justify-between rounded-md border p-3 text-sm">
                  <div className="grid">
                    <div className="flex items-center gap-2"><Badge variant={e.level === "error" ? "destructive" : "outline"}>{e.level}</Badge><span className="font-medium">{e.title}</span></div>
                    {e.message && <span className="text-xs text-muted-foreground">{e.message}</span>}
                  </div>
                  <span className="whitespace-nowrap text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString("pt-BR")}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
