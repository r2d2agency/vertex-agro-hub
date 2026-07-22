import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/vertex/coming-soon";

export const Route = createFileRoute("/_authenticated/fotografias")({
  head: () => ({ meta: [{ title: "Fotografias — Vertex Agro" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Fotografias" description="Central de fotografias georreferenciadas." sprint="Sprint 4" />,
});
