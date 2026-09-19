import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/vertex/page-header";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { createTappingTask, deleteTappingTask, listTappingTasks, updateTappingTask, type TappingTask } from "@/lib/sangrias.functions";

export const Route = createFileRoute("/_authenticated/tarefas-sangria")({ component: TarefasSangriaPage });

function TarefasSangriaPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<TappingTask | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<TappingTask | null>(null);
  const { data = [], isLoading: loading } = useQuery({ queryKey: ["tapping-tasks", companyId], queryFn: () => listTappingTasks(companyId!), enabled: !!companyId });
  const refresh = () => qc.invalidateQueries({ queryKey: ["tapping-tasks", companyId] });
  const del = useMutation({ mutationFn: (id: string) => deleteTappingTask(id), onSuccess: () => { toast.success("Tarefa removida"); refresh(); }, onError: (e: Error) => toast.error(e.message) });
  if (!isLoading && companies.length === 0) return <NoCompanyCard />;
  return <div>
    <PageHeader title="Tarefas de Sangria" description="Gerencie as tarefas que o monitor poderá selecionar no app." actions={companyId ? <Button onClick={() => setCreating(true)}><Plus className="mr-2 h-4 w-4" /> Nova tarefa</Button> : null} />
    <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />
    {loading ? <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Carregando...</CardContent></Card> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.map((task) => <Card key={task.id}><CardContent className="flex items-start justify-between p-5"><div><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{task.position + 1}</span><p className="font-semibold">{task.label}</p></div><p className="mt-1 font-mono text-xs text-muted-foreground">Código: {task.code}</p><p className="mt-2 text-xs text-muted-foreground">{task.active ? "Ativa" : "Inativa"} · posição {task.position + 1}</p></div><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => setEditing(task)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-destructive" onClick={() => setToDelete(task)}><Trash2 className="h-4 w-4" /></Button></div></CardContent></Card>)}</div>}
    <TaskDialog open={creating || !!editing} initial={editing ?? undefined} companyId={companyId} onOpenChange={(open) => { if (!open) { setCreating(false); setEditing(null); } }} onSaved={refresh} />
    <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remover tarefa?</AlertDialogTitle><AlertDialogDescription>Ela deixará de aparecer para novos registros, mas históricos serão preservados.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { if (toDelete) del.mutate(toDelete.id); setToDelete(null); }}>Remover</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

function TaskDialog({ open, initial, companyId, onOpenChange, onSaved }: { open: boolean; initial?: TappingTask; companyId: string | null; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const [code, setCode] = useState(""); const [label, setLabel] = useState(""); const [position, setPosition] = useState("0"); const [active, setActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    setCode(initial?.code ?? "");
    setLabel(initial?.label ?? "");
    setPosition(String(initial?.position ?? 0));
    setActive(initial?.active ?? true);
  }, [open, initial]);
  const mut = useMutation({ mutationFn: () => initial ? updateTappingTask(initial.id, { code: code.trim(), label: label.trim(), position: Number(position), active }) : createTappingTask({ companyId: companyId!, code: code.trim(), label: label.trim(), position: Number(position), active }), onSuccess: () => { toast.success(initial ? "Tarefa atualizada" : "Tarefa criada"); onSaved(); onOpenChange(false); }, onError: (e: Error) => toast.error(e.message) });
  const openChange = (next: boolean) => { onOpenChange(next); };
  return <Dialog open={open} onOpenChange={openChange}><DialogContent><DialogHeader><DialogTitle>{initial ? "Editar tarefa" : "Nova tarefa de sangria"}</DialogTitle></DialogHeader><form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); if (!code.trim() || !label.trim()) return toast.error("Código e nome são obrigatórios"); mut.mutate(); }}><div><Label>Código *</Label><Input value={code} onChange={(e) => setCode(e.target.value)} /></div><div><Label>Nome exibido *</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} /></div><div><Label>Ordem</Label><Input type="number" min="0" value={position} onChange={(e) => setPosition(e.target.value)} /></div><div className="flex items-center gap-3"><Switch checked={active} onCheckedChange={setActive} /><Label>Ativa</Label></div><DialogFooter><Button type="button" variant="ghost" onClick={() => openChange(false)}>Cancelar</Button><Button type="submit" disabled={mut.isPending}>Salvar</Button></DialogFooter></form></DialogContent></Dialog>;
}
