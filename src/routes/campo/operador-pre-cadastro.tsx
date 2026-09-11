import { createFileRoute } from "@tanstack/react-router";
import { RolePreCadastroForm } from "@/components/vertex/field/role-pre-cadastro-form";

export const Route = createFileRoute("/campo/operador-pre-cadastro")({
  component: () => <RolePreCadastroForm role="operador" title="Pré-cadastro do operador" personLabel="operador" />,
});
