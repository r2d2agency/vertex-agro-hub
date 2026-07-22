import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/vertex/coming-soon";

export const Route = createFileRoute("/_authenticated/inspecoes")({
  head: () => ({ meta: [{ title: "Inspeções — Vertex Agro" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Inspeções" description="Inspeções técnicas." sprint="Sprint 6" />,
});
