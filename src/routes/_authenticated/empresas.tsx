import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search, MoreHorizontal, Trash2, Pencil } from "lucide-react";
import {
  listCompanies,
  deleteCompany,
} from "@/lib/companies.functions";
import { PageHeader } from "@/components/vertex/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/empresas")({
  head: () => ({
    meta: [
      { title: "Empresas — Vertex Agro" },
      { name: "description", content: "Gestão das empresas cadastradas na plataforma." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EmpresasPage,
});

function EmpresasPage() {
  const [q, setQ] = useState("");
  const [toDelete, setToDelete] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: listCompanies,
  });

  const mutation = useMutation({
    mutationFn: (id: string) => deleteCompany({ id }),
    onSuccess: () => {
      toast.success("Empresa excluída");
      qc.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (data ?? []).filter((c) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      c.razao_social?.toLowerCase().includes(s) ||
      c.nome_fantasia?.toLowerCase().includes(s) ||
      c.cnpj?.toLowerCase().includes(s)
    );
  });

  return (
    <div>
      <PageHeader
        title="Empresas"
        description="Cadastro de empresas, grupos e produtores rurais."
        actions={
          <Link to="/empresas/novo">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Nova empresa
            </Button>
          </Link>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome ou CNPJ..."
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Carregando...
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhuma empresa cadastrada. Comece criando a primeira.
            </p>
            <Link to="/empresas/novo" className="mt-4 inline-block">
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Nova empresa
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => (
            <Card key={c.id} className="transition-colors hover:border-primary/40">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">
                      {c.nome_fantasia || c.razao_social}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {c.razao_social}
                    </p>
                    {c.cnpj && (
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{c.cnpj}</p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to="/empresas/$id" params={{ id: c.id }}>
                          <Pencil className="mr-2 h-4 w-4" /> Editar
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setToDelete(c.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge
                    variant={c.status === "ativa" ? "default" : "secondary"}
                    className={
                      c.status === "ativa" ? "bg-success text-success-foreground" : undefined
                    }
                  >
                    {c.status}
                  </Badge>
                  {c.cidade && (
                    <span>
                      {c.cidade}
                      {c.estado ? ` / ${c.estado}` : ""}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação inativa o cadastro (exclusão lógica). Você poderá restaurar depois via
              auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toDelete) mutation.mutate(toDelete);
                setToDelete(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
