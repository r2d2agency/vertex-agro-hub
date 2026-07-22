import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/vertex/coming-soon";

export const Route = createFileRoute("/_authenticated/permissoes")({
  head: () => ({ meta: [{ title: "Perfis e Permissões — Vertex Agro" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Perfis e Permissões" description="Editor de permissões por perfil e usuário." sprint="Sprint 3" />,
});
