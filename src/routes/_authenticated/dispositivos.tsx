import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/vertex/coming-soon";

export const Route = createFileRoute("/_authenticated/dispositivos")({
  head: () => ({ meta: [{ title: "Dispositivos — Vertex Agro" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Dispositivos" description="Dispositivos dos aplicativos de campo." sprint="Sprint 5" />,
});
