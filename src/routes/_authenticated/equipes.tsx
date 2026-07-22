import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Trash2, UserPlus, Users, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/vertex/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import {
  addTeamMember, createTeam, deleteTeam, listTeams, removeTeamMember,
  type Team,
} from "@/lib/teams.functions";
import { listPeople } from "@/lib/people.functions";

export const Route = createFileRoute("/_authenticated/equipes")({
  head: () => ({
    meta: [
      { title: "Equipes — Vertex Agro" },
      { name: "description", content: "Monte equipes livres com pessoas da empresa." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TeamsPage,
});

function TeamsPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Team | null>(null);
  const [manageTeam, setManageTeam] = useState<Team | null>(null);

  const { data = [], isLoading: loadingList } = useQuery({
    queryKey: ["teams", companyId],
    queryFn: () => listTeams(companyId!),
    enabled: !!companyId,
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteTeam(id),
    onSuccess: () => {
      toast.success("Equipe excluída");
      qc.invalidateQueries({ queryKey: ["teams", companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Equipes"
        description="Agrupe pessoas em equipes livres para operações no campo."
        actions={
          companyId ? (
            <Button onClick={() => setCreating(true)}>
              <Plus className="mr-2 h-4 w-4" /> Nova equipe
            </Button>
          ) : null
        }
      />

      {!isLoading && companies.length === 0 ? (
        <NoCompanyCard />
      ) : (
        <>
          <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />

          {loadingList ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Carregando...</CardContent></Card>
          ) : data.length === 0 ? (
            <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Nenhuma equipe cadastrada.</CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.map((t) => (
                <Card key={t.id} className="transition-colors hover:border-primary/40">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          <p className="truncate font-semibold">{t.name}</p>
                        </div>
                        {t.description && (
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{t.description}</p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-1">
                          {t.members.length === 0 ? (
                            <span className="text-xs text-muted-foreground">Sem membros</span>
                          ) : (
                            t.members.slice(0, 6).map((m) => (
                              <Badge key={m.id} variant="secondary" className="max-w-[160px] truncate">
                                {m.user.fullName || m.user.email}
                              </Badge>
                            ))
                          )}
                          {t.members.length > 6 && (
                            <Badge variant="outline">+{t.members.length - 6}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setManageTeam(t)} title="Gerenciar membros">
                          <UserPlus className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setToDelete(t)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <CreateTeamDialog
        open={creating}
        onOpenChange={setCreating}
        companyId={companyId}
        onSaved={() => qc.invalidateQueries({ queryKey: ["teams", companyId] })}
      />

      <ManageMembersDialog
        team={manageTeam}
        companyId={companyId}
        onOpenChange={(o) => !o && setManageTeam(null)}
        onChanged={() => qc.invalidateQueries({ queryKey: ["teams", companyId] })}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir equipe?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação inativa a equipe.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (toDelete) del.mutate(toDelete.id); setToDelete(null); }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CreateTeamDialog({
  open, onOpenChange, companyId, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  companyId: string | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const mut = useMutation({
    mutationFn: () => createTeam({ companyId: companyId!, name, description: description || undefined }),
    onSuccess: () => {
      toast.success("Equipe criada");
      onSaved(); onOpenChange(false);
      setName(""); setDescription("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova equipe</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return toast.error("Nome obrigatório"); mut.mutate(); }}
          className="grid gap-4"
        >
          <div><Label>Nome *</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div><Label>Descrição</Label><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Salvando..." : "Criar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ManageMembersDialog({
  team, companyId, onOpenChange, onChanged,
}: {
  team: Team | null;
  companyId: string | null;
  onOpenChange: (o: boolean) => void;
  onChanged: () => void;
}) {
  const open = !!team;
  const [userId, setUserId] = useState<string>("");
  const [roleLabel, setRoleLabel] = useState("");

  const { data: people = [] } = useQuery({
    queryKey: ["people", companyId],
    queryFn: () => listPeople(companyId!),
    enabled: open && !!companyId,
  });

  const memberIds = useMemo(() => new Set(team?.members.map((m) => m.userId) ?? []), [team]);
  const available = people.filter((p) => !memberIds.has(p.id));

  const add = useMutation({
    mutationFn: () => addTeamMember(team!.id, userId, roleLabel || undefined),
    onSuccess: () => {
      toast.success("Membro adicionado");
      setUserId(""); setRoleLabel("");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (uid: string) => removeTeamMember(team!.id, uid),
    onSuccess: () => { toast.success("Membro removido"); onChanged(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Membros — {team?.name}</DialogTitle></DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-3 rounded-lg border p-3">
            <div className="grid gap-2">
              <Label>Adicionar pessoa</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger>
                  <SelectValue placeholder={available.length ? "Selecione..." : "Todas já são membros"} />
                </SelectTrigger>
                <SelectContent>
                  {available.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.fullName || p.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Função na equipe</Label>
              <Input value={roleLabel} onChange={(e) => setRoleLabel(e.target.value)} placeholder="Ex.: Sangrador, Monitor, Motorista..." />
            </div>
            <Button disabled={!userId || add.isPending} onClick={() => add.mutate()}>
              <UserPlus className="mr-2 h-4 w-4" /> Adicionar
            </Button>
          </div>

          <div className="grid gap-2">
            <Label>Membros atuais</Label>
            {team && team.members.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem membros ainda.</p>
            ) : (
              <div className="grid gap-2">
                {team?.members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-md border p-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{m.user.fullName || m.user.email}</p>
                      {m.roleLabel && <p className="text-xs text-muted-foreground">{m.roleLabel}</p>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => remove.mutate(m.userId)} className="text-destructive">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
