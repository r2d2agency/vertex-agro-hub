import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/vertex/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { createActionPlan, deleteActionPlan, listActionPlans, updateActionPlan, type ActionPlan } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/planos-acao")({
  head: () => ({ meta: [
    { title: "Planos de Ação — Vertex Agro" },
    { name: "description", content: "Planos de ação priorizados para a operação." },
    { name: "robots", content: "noindex" },
  ] }),
  component: PlanosAcaoPage,
});

const STATUS = ["aberto", "andamento", "concluido", "cancelado"] as const;
const PRIORITY = ["baixa", "media", "alta"] as const;

const PRIO_BADGE: Record<string, "outline" | "secondary" | "destructive"> = {
  baixa: "outline", media: "secondary", alta: "destructive",
};

function PlanosAcaoPage() {
  const qc = useQueryClient();
  const { companyId, companies, isLoading, setCompanyId } = useSelectedCompany();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState<typeof PRIORITY[number]>("media");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");

  const { data: items = [] } = useQuery({
    queryKey: ["action-plans", companyId],
    queryFn: () => listActionPlans(companyId!),
    enabled: !!companyId,
  });

  const create = useMutation({
    mutationFn: () => createActionPlan({ companyId: companyId!, title, description: desc, priority, assignee, dueDate: dueDate || undefined }),
    onSuccess: () => {
      toast.success("Plano criado"); setOpen(false);
      setTitle(""); setDesc(""); setAssignee(""); setDueDate(""); setPriority("media");
      qc.invalidateQueries({ queryKey: ["action-plans", companyId] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const upd = useMutation({
    mutationFn: (p: { id: string; status: string }) => updateActionPlan(p.id, { status: p.status as any }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["action-plans", companyId] }),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteActionPlan(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["action-plans", companyId] }),
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Planos de Ação"
        description="Planos operacionais priorizados, criados manualmente ou a partir de insights de IA."
        actions={companyId ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Novo plano</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo plano de ação</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1"><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                <div className="grid gap-1"><Label>Descrição</Label><Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="grid gap-1">
                    <Label>Prioridade</Label>
                    <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PRIORITY.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1"><Label>Responsável</Label><Input value={assignee} onChange={(e) => setAssignee(e.target.value)} /></div>
                  <div className="grid gap-1"><Label>Prazo</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={() => create.mutate()} disabled={!title || create.isPending}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : undefined}
      />
      <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />
      {!isLoading && companies.length === 0 && <NoCompanyCard />}

      {companyId && (
        <div className="grid gap-3">
          {items.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Nenhum plano cadastrado.</CardContent></Card>
          ) : items.map((p: ActionPlan) => (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2"><ListChecks className="h-4 w-4" /> {p.title}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={PRIO_BADGE[p.priority] ?? "outline"}>{p.priority}</Badge>
                    <Select value={p.status} onValueChange={(v) => upd.mutate({ id: p.id, status: v })}>
                      <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" onClick={() => del.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                {Array.isArray(p.steps) && p.steps.length > 0 && (
                  <ul className="ml-5 list-disc text-sm">{p.steps.map((s, i) => <li key={i}>{s}</li>)}</ul>
                )}
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  {p.assignee && <span>Responsável: {p.assignee}</span>}
                  {p.dueDate && <span>Prazo: {new Date(p.dueDate).toLocaleDateString("pt-BR")}</span>}
                  {p.insightId && <span>· gerado por IA</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
