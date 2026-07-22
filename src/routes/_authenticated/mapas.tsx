import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/vertex/coming-soon";

export const Route = createFileRoute("/_authenticated/mapas")({
  head: () => ({ meta: [{ title: "Mapas — Vertex Agro" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Mapas" description="Visualização territorial com Mapbox." sprint="Sprint 2" />,
});
