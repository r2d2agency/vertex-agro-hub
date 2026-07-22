import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/vertex/coming-soon";

export const Route = createFileRoute("/_authenticated/clones")({
  head: () => ({ meta: [{ title: "Clones — Vertex Agro" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Clones" description="Catálogo de clones de seringueira." sprint="Sprint 2" />,
});
