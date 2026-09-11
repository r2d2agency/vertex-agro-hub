import { createFileRoute } from "@tanstack/react-router";
import { RolePreCadastroForm } from "@/components/vertex/field/role-pre-cadastro-form";

export const Route = createFileRoute("/campo/monitor-pre-cadastro")({
  component: () => <RolePreCadastroForm role="monitor" title="Pré-cadastro do monitor" personLabel="monitor" />,
});
