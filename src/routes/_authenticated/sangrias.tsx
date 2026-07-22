import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/vertex/coming-soon";

export const Route = createFileRoute("/_authenticated/sangrias")({
  head: () => ({ meta: [{ title: "Sangrias — Vertex Agro" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Sangrias" description="Registros de sangria." sprint="Sprint 4" />,
});
