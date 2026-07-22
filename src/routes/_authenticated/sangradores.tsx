import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/vertex/coming-soon";

export const Route = createFileRoute("/_authenticated/sangradores")({
  head: () => ({ meta: [{ title: "Sangradores — Vertex Agro" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Sangradores" description="Cadastro de sangradores." sprint="Sprint 3" />,
});
