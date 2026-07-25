import { createFileRoute } from "@tanstack/react-router";
import { TaskCategoryPage } from "./visitas";

export const Route = createFileRoute("/_authenticated/inspecoes")({
  head: () => ({ meta: [
    { title: "Inspeções — Vertex Agro" },
    { name: "description", content: "Planejamento e execução de inspeções técnicas com check-in por GPS." },
    { name: "robots", content: "noindex" },
  ]}),
  component: () => (
    <TaskCategoryPage
      category="inspecao"
      title="Inspeções"
      description="Agende inspeções sanitárias/técnicas e registre check-in por GPS."
      emptyLabel="Nenhuma inspeção agendada."
    />
  ),
});
