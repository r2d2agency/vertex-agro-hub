import { createFileRoute } from "@tanstack/react-router";
import { Shield, Check, Minus } from "lucide-react";
import { PageHeader } from "@/components/vertex/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/permissoes")({
  head: () => ({
    meta: [
      { title: "Perfis e Permissões — Vertex Agro" },
      { name: "description", content: "Matriz de permissões por papel." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PermissionsPage,
});

type Role = {
  key: string;
  label: string;
  scope: string;
  description: string;
};

const ROLES: Role[] = [
  { key: "admin_global", label: "Admin Global", scope: "Plataforma", description: "Superadmin. Acesso a todas as empresas e configurações do sistema." },
  { key: "admin_empresa", label: "Admin da Empresa", scope: "Empresa", description: "Gestor máximo da empresa. Cria e edita todos os dados." },
  { key: "gestor", label: "Gestor", scope: "Empresa", description: "Gerencia operação, cadastros e usuários da empresa." },
  { key: "supervisor_regional", label: "Supervisor Regional", scope: "Regional", description: "Acompanha fazendas e equipes das suas regionais." },
  { key: "monitor", label: "Monitor", scope: "Fazenda", description: "Registra sangrias, produção e ocorrências em campo." },
  { key: "consultor", label: "Consultor", scope: "Fazenda", description: "Consultor técnico com acesso aos dados das fazendas atribuídas." },
  { key: "consulta", label: "Consulta", scope: "Empresa", description: "Somente leitura." },
];

type Mod = { key: string; label: string; perms: Record<string, "R" | "RW" | "-"> };
const MODULES: Mod[] = [
  { key: "empresas", label: "Empresas", perms: { admin_global: "RW", admin_empresa: "RW", gestor: "R", supervisor_regional: "R", monitor: "-", consultor: "-", consulta: "R" } },
  { key: "regionais", label: "Regionais", perms: { admin_global: "RW", admin_empresa: "RW", gestor: "RW", supervisor_regional: "R", monitor: "R", consultor: "R", consulta: "R" } },
  { key: "fazendas", label: "Fazendas", perms: { admin_global: "RW", admin_empresa: "RW", gestor: "RW", supervisor_regional: "RW", monitor: "R", consultor: "R", consulta: "R" } },
  { key: "talhoes", label: "Talhões", perms: { admin_global: "RW", admin_empresa: "RW", gestor: "RW", supervisor_regional: "RW", monitor: "R", consultor: "R", consulta: "R" } },
  { key: "tabelas", label: "Tabelas / Clones", perms: { admin_global: "RW", admin_empresa: "RW", gestor: "RW", supervisor_regional: "R", monitor: "R", consultor: "R", consulta: "R" } },
  { key: "pessoas", label: "Pessoas", perms: { admin_global: "RW", admin_empresa: "RW", gestor: "RW", supervisor_regional: "R", monitor: "-", consultor: "-", consulta: "R" } },
  { key: "equipes", label: "Equipes", perms: { admin_global: "RW", admin_empresa: "RW", gestor: "RW", supervisor_regional: "RW", monitor: "R", consultor: "-", consulta: "R" } },
  { key: "sangrias", label: "Sangrias", perms: { admin_global: "RW", admin_empresa: "RW", gestor: "RW", supervisor_regional: "RW", monitor: "RW", consultor: "R", consulta: "R" } },
  { key: "producao", label: "Produção", perms: { admin_global: "RW", admin_empresa: "RW", gestor: "RW", supervisor_regional: "RW", monitor: "RW", consultor: "R", consulta: "R" } },
  { key: "ocorrencias", label: "Ocorrências", perms: { admin_global: "RW", admin_empresa: "RW", gestor: "RW", supervisor_regional: "RW", monitor: "RW", consultor: "RW", consulta: "R" } },
  { key: "agenda", label: "Agenda", perms: { admin_global: "RW", admin_empresa: "RW", gestor: "RW", supervisor_regional: "RW", monitor: "R", consultor: "RW", consulta: "R" } },
  { key: "relatorios", label: "Relatórios", perms: { admin_global: "RW", admin_empresa: "RW", gestor: "R", supervisor_regional: "R", monitor: "-", consultor: "R", consulta: "R" } },
  { key: "config", label: "Configurações", perms: { admin_global: "RW", admin_empresa: "RW", gestor: "-", supervisor_regional: "-", monitor: "-", consultor: "-", consulta: "-" } },
];

function Cell({ v }: { v: "R" | "RW" | "-" }) {
  if (v === "-") return <Minus className="mx-auto h-4 w-4 text-muted-foreground/40" />;
  if (v === "R") return <Badge variant="outline" className="text-[10px]">Ler</Badge>;
  return <Badge className="bg-primary/10 text-primary text-[10px] hover:bg-primary/15"><Check className="mr-1 h-3 w-3" />Editar</Badge>;
}

function PermissionsPage() {
  return (
    <div>
      <PageHeader
        title="Perfis e Permissões"
        description="Visão consolidada dos papéis do Vertex Agro e do que cada perfil pode fazer em cada módulo. A atribuição de papéis é feita em Pessoas."
      />

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {ROLES.map((r) => (
          <Card key={r.key}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <p className="font-semibold">{r.label}</p>
                <Badge variant="outline" className="ml-auto text-[10px]">{r.scope}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{r.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="p-3 text-left font-semibold">Módulo</th>
                {ROLES.map((r) => (
                  <th key={r.key} className="p-3 text-center text-xs font-semibold">{r.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((m, i) => (
                <tr key={m.key} className={i % 2 ? "bg-muted/20" : ""}>
                  <td className="p-3 font-medium">{m.label}</td>
                  {ROLES.map((r) => (
                    <td key={r.key} className="p-3 text-center"><Cell v={m.perms[r.key] ?? "-"} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        Regras aplicadas no backend via RLS e guards. A edição fina por usuário será liberada em uma próxima atualização.
      </p>
    </div>
  );
}
