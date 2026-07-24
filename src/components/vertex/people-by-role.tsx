import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, UserRound, Mail, Search, Pencil } from "lucide-react";
import { PersonEditor } from "@/components/vertex/person-editor";
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import {
  COMPANY_ROLES, invitePerson, listPeople, removePerson,
  type CompanyRole, type Person,
} from "@/lib/people.functions";

export function PeopleByRolePage({
  role,
  title,
  description,
  emptyLabel,
}: {
  role: CompanyRole;
  title: string;
  description: string;
  emptyLabel: string;
}) {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Person | null>(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const roleLabel = COMPANY_ROLES.find((r) => r.value === role)?.label ?? role;

  const { data = [], isLoading: loadingList } = useQuery({
    queryKey: ["people", companyId],
    queryFn: () => listPeople(companyId!),
    enabled: !!companyId,
  });

  const filtered = data
    .filter((p) => p.roles.includes(role))
    .filter((p) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (p.fullName ?? "").toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
    });

  const del = useMutation({
    mutationFn: (userId: string) => removePerson(userId, companyId!),
    onSuccess: () => {
      toast.success("Removido da empresa");
      qc.invalidateQueries({ queryKey: ["people", companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={companyId ? (
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo {roleLabel.toLowerCase()}
          </Button>
        ) : null}
      />

      {!isLoading && companies.length === 0 ? (
        <NoCompanyCard />
      ) : (
        <>
          <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />

          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar por nome ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loadingList ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Carregando...</CardContent></Card>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">{emptyLabel}</CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {filtered.map((p) => (
                <Card key={p.id}>
                  <CardContent className="flex flex-wrap items-center gap-4 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <UserRound className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{p.fullName || p.email}</p>
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" /> {p.email}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {p.roles.map((r) => (
                        <Badge key={r} variant={r === role ? "default" : "secondary"}>
                          {COMPANY_ROLES.find((x) => x.value === r)?.label ?? r}
                        </Badge>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingId(p.id)}
                      title="Editar ficha"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => setToDelete(p)}
                      title="Remover da empresa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <InviteDialog
        open={creating}
        role={role}
        roleLabel={roleLabel}
        onOpenChange={setCreating}
        companyId={companyId}
        onSaved={() => qc.invalidateQueries({ queryKey: ["people", companyId] })}
      />

      {companyId && (
        <PersonEditor
          open={!!editingId}
          onOpenChange={(o) => !o && setEditingId(null)}
          userId={editingId}
          companyId={companyId}
        />
      )}


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
  open, onOpenChange, companyId, onSaved, role, roleLabel,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  companyId: string | null;
  onSaved: () => void;
  role: CompanyRole;
  roleLabel: string;
}) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");

  const mut = useMutation({
    mutationFn: () => invitePerson({
      companyId: companyId!, email, fullName,
      password: password || undefined, role,
    }),
    onSuccess: () => {
      toast.success(`${roleLabel} cadastrado`);
      onSaved(); onOpenChange(false);
      setEmail(""); setFullName(""); setPassword("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo {roleLabel.toLowerCase()}</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.trim() || !fullName.trim()) return toast.error("Preencha nome e email");
            mut.mutate();
          }}
          className="grid gap-4"
        >
          <div><Label>Nome completo *</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
          <div><Label>Email *</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div>
            <Label>Senha inicial</Label>
            <Input
              type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Opcional — gerada se vazia"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
