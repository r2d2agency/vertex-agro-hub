import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PersonEditor } from "@/components/vertex/person-editor";
import { Copy, KeyRound, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/vertex/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
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
  COMPANY_ROLES, invitePerson, listPeople, removePerson, resetPersonPassword, updatePersonRole,
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creds, setCreds] = useState<{ email: string; fullName: string | null; password: string } | null>(null);

  const reset = useMutation({
    mutationFn: (userId: string) => resetPersonPassword(userId, companyId!),
    onSuccess: (r) => { setCreds(r); toast.success("Senha temporária gerada"); },
    onError: (e: Error) => toast.error(e.message),
  });

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
    <div className="space-y-6">
      <PageHeader
        title="Gestão de Pessoas e Equipe"
        description="Controle centralizado de colaboradores (Monitores, Sangradores, Consultores) e acesso administrativo."
        actions={
          companyId ? (
            <div className="flex gap-2">
              <Button onClick={() => setCreating(true)} className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" /> Novo Cadastro (RH)
              </Button>

            </div>
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
                  <Card key={p.id} className="overflow-hidden">
                    <CardContent className="flex flex-wrap items-center gap-4 p-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20">
                        {p.avatarUrl ? (
                          <img src={p.avatarUrl} alt={p.fullName || ""} className="h-full w-full rounded-full object-cover" />
                        ) : (
                          <UserRound className="h-6 w-6" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-bold text-lg">{p.fullName || p.email}</p>
                          {p.active === false && <Badge variant="destructive" className="text-[10px] h-4">INATIVO</Badge>}
                        </div>
                        <p className="truncate text-xs text-muted-foreground font-mono">{p.email}</p>
                      </div>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {p.roles.map((r) => (
                          <Badge key={r} variant="secondary" className="text-[10px] font-bold uppercase tracking-wider">{roleLabel(r)}</Badge>
                        ))}
                      </div>
                      <div className="w-48">
                        <Select
                          value={currentRole}
                          onValueChange={(v) => changeRole.mutate({ userId: p.id, role: v as CompanyRole })}
                        >
                          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {COMPANY_ROLES.map((r) => (
                              <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditingId(p.id)} title="Editar ficha completa (RH + Pessoal)" className="h-9 w-9">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" title="Gerar senha temporária vertexXXXX"
                          disabled={reset.isPending}
                          onClick={() => reset.mutate(p.id)}
                          className="h-9 w-9"
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive h-9 w-9" onClick={() => setToDelete(p)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
        onCredentials={setCreds}
      />

      <CredentialsDialog creds={creds} onClose={() => setCreds(null)} />

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
  open, onOpenChange, companyId, onSaved, onCredentials,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  companyId: string | null;
  onSaved: () => void;
  onCredentials: (c: { email: string; fullName: string | null; password: string }) => void;
}) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<CompanyRole>("sangrador");


  const mut = useMutation({
    mutationFn: () => invitePerson({ companyId: companyId!, email, fullName, password: password || undefined, role }),
    onSuccess: (r) => {
      toast.success("Pessoa cadastrada");
      onSaved();
      onOpenChange(false);
      if (r.generatedPassword) {
        onCredentials({ email: r.email, fullName: r.fullName, password: r.generatedPassword });
      }
      setEmail(""); setFullName(""); setPassword(""); setRole("sangrador");
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

function CredentialsDialog({
  creds, onClose,
}: {
  creds: { email: string; fullName: string | null; password: string } | null;
  onClose: () => void;
}) {
  const loginUrl = typeof window !== "undefined" ? `${window.location.origin}/auth` : "/auth";
  if (!creds) return null;

  const whatsappText =
    `Olá${creds.fullName ? " " + creds.fullName.split(" ")[0] : ""}! Seu acesso ao Vertex Agro:\n\n` +
    `🔗 ${loginUrl}\n👤 ${creds.email}\n🔑 ${creds.password}\n\n` +
    `Ao entrar pelo celular, use "Instalar app" para adicionar o ícone à tela inicial.`;

  async function copy(text: string, label: string) {
    try { await navigator.clipboard.writeText(text); toast.success(`${label} copiado`); }
    catch { toast.error("Não foi possível copiar"); }
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

  return (
    <Dialog open={!!creds} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Credenciais de acesso</DialogTitle>
          <DialogDescription>
            Copie e envie ao usuário. Esta senha temporária não será exibida novamente.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Link de acesso" value={loginUrl} onCopy={() => copy(loginUrl, "Link")} />
          <Field label="Usuário (email)" value={creds.email} onCopy={() => copy(creds.email, "Email")} />
          <Field label="Senha temporária" value={creds.password} mono onCopy={() => copy(creds.password, "Senha")} />
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={() => copy(whatsappText, "Mensagem")}>
            <Copy className="mr-2 h-4 w-4" /> Copiar mensagem
          </Button>
          <div className="flex gap-2">
            <a href={whatsappHref} target="_blank" rel="noreferrer">
              <Button variant="outline">Abrir no WhatsApp</Button>
            </a>
            <Button onClick={onClose}>Concluir</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, mono, onCopy }: { label: string; value: string; mono?: boolean; onCopy: () => void }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1 flex gap-2">
        <Input readOnly value={value} className={mono ? "font-mono" : ""} />
        <Button variant="outline" size="icon" onClick={onCopy} title="Copiar">
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

