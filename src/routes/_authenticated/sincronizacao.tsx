import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/vertex/coming-soon";

export const Route = createFileRoute("/_authenticated/sincronizacao")({
  head: () => ({ meta: [{ title: "Sincronização — Vertex Agro" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Sincronização" description="Monitoramento da sincronização offline." sprint="Sprint 5" />,
});
