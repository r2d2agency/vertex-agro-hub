import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/vertex/coming-soon";

export const Route = createFileRoute("/_authenticated/equipes")({
  head: () => ({ meta: [{ title: "Equipes — Vertex Agro" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Equipes" description="Composição de equipes de campo." sprint="Sprint 3" />,
});
