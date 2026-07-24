import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PersonEditor } from "@/components/vertex/person-editor";
import { Pencil } from "lucide-react";
import { Plus, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/vertex/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  COMPANY_ROLES, invitePerson, listPeople, removePerson, updatePersonRole,
  type CompanyRole, type Person,
} from "@/lib/people.functions";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({
    meta: [
      { title: "Pessoas — Vertex Agro" },
      { name: "description", content: "Cadastro de pessoas e permissões por empresa." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PeoplePage,
});

function roleLabel(role: CompanyRole) {
  return COMPANY_ROLES.find((r) => r.value === role)?.label ?? role;
}

function PeoplePage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Person | null>(null);

  const { data = [], isLoading: loadingList } = useQuery({
    queryKey: ["people", companyId],
    queryFn: () => listPeople(companyId!),
    enabled: !!companyId,
  });

  const changeRole = useMutation({
    mutationFn: (v: { userId: string; role: CompanyRole }) =>
      updatePersonRole(v.userId, companyId!, v.role),
    onSuccess: () => {
      toast.success("Papel atualizado");
      qc.invalidateQueries({ queryKey: ["people", companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (userId: string) => removePerson(userId, companyId!),
    onSuccess: () => {
      toast.success("Pessoa removida da empresa");
      qc.invalidateQueries({ queryKey: ["people", companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Pessoas"
        description="Cadastre monitores, sangradores, consultores e defina seus papéis."
        actions={
          companyId ? (
            <Button onClick={() => setCreating(true)}>
              <Plus className="mr-2 h-4 w-4" /> Nova pessoa
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
            <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Nenhuma pessoa vinculada a esta empresa.</CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {data.map((p) => {
                const currentRole = p.roles[0] ?? "consulta";
                return (
                  <Card key={p.id}>
                    <CardContent className="flex flex-wrap items-center gap-4 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <UserRound className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{p.fullName || p.email}</p>
                        <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {p.roles.map((r) => (
                          <Badge key={r} variant="secondary">{roleLabel(r)}</Badge>
                        ))}
                      </div>
                      <div className="w-52">
                        <Select
                          value={currentRole}
                          onValueChange={(v) => changeRole.mutate({ userId: p.id, role: v as CompanyRole })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {COMPANY_ROLES.map((r) => (
                              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setToDelete(p)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      <InviteDialog
        open={creating}
        onOpenChange={setCreating}
        companyId={companyId}
        onSaved={() => qc.invalidateQueries({ queryKey: ["people", companyId] })}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover da empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              A pessoa perde o acesso a esta empresa. O usuário continua existindo no sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (toDelete) del.mutate(toDelete.id); setToDelete(null); }}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InviteDialog({
  open, onOpenChange, companyId, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  companyId: string | null;
  onSaved: () => void;
}) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<CompanyRole>("monitor");

  const mut = useMutation({
    mutationFn: () => invitePerson({ companyId: companyId!, email, fullName, password: password || undefined, role }),
    onSuccess: () => {
      toast.success("Pessoa cadastrada");
      onSaved();
      onOpenChange(false);
      setEmail(""); setFullName(""); setPassword(""); setRole("monitor");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova pessoa</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.trim() || !fullName.trim()) { toast.error("Preencha nome e email"); return; }
            mut.mutate();
          }}
          className="grid gap-4"
        >
          <div><Label>Nome completo *</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
          <div><Label>Email *</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div>
            <Label>Senha inicial</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Opcional — gerada se vazia" />
          </div>
          <div>
            <Label>Papel</Label>
            <Select value={role} onValueChange={(v) => setRole(v as CompanyRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COMPANY_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Salvando..." : "Cadastrar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
