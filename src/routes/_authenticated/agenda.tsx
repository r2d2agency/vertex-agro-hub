import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/vertex/coming-soon";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({ meta: [{ title: "Agenda Operacional — Vertex Agro" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Agenda Operacional" description="Agenda de atividades em campo." sprint="Sprint 4" />,
});
