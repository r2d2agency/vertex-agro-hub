import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/vertex/coming-soon";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — Vertex Agro" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Usuários" description="Gestão de usuários da plataforma." sprint="Sprint 3" />,
});
