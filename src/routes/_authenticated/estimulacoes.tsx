import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/vertex/coming-soon";

export const Route = createFileRoute("/_authenticated/estimulacoes")({
  head: () => ({ meta: [{ title: "Estimulações — Vertex Agro" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Estimulações" description="Registros e alertas de estimulação." sprint="Sprint 4" />,
});
