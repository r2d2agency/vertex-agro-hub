import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/vertex/coming-soon";

export const Route = createFileRoute("/_authenticated/ia")({
  head: () => ({ meta: [{ title: "Central IA — Vertex Agro" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Central IA" description="Central de inteligência artificial." sprint="Sprint 6" />,
});
