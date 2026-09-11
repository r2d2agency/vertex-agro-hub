import { createFileRoute } from "@tanstack/react-router";
import { RolePreCadastroForm } from "@/components/vertex/field/role-pre-cadastro-form";

export const Route = createFileRoute("/campo/sangrador")({
  component: () => <RolePreCadastroForm role="sangrador" title="Pré-cadastro do sangrador" personLabel="sangrador" />,
});
