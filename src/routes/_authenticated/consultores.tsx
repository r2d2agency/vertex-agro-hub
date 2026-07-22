import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/vertex/coming-soon";

export const Route = createFileRoute("/_authenticated/consultores")({
  head: () => ({ meta: [{ title: "Consultores — Vertex Agro" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Consultores" description="Consultores técnicos e agendas." sprint="Sprint 3" />,
});
