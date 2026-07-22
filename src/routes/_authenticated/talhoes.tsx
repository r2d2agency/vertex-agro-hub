import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/vertex/coming-soon";

export const Route = createFileRoute("/_authenticated/talhoes")({
  head: () => ({ meta: [{ title: "Talhões — Vertex Agro" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Talhões" description="Talhões vinculados às fazendas." sprint="Sprint 2" />,
});
