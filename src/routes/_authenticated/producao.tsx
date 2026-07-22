import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/vertex/coming-soon";

export const Route = createFileRoute("/_authenticated/producao")({
  head: () => ({ meta: [{ title: "Produção — Vertex Agro" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Produção" description="Produção prevista x realizada." sprint="Sprint 4" />,
});
