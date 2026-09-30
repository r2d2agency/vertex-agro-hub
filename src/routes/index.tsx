import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    title: "Vertex Agro - Gestão Inteligente para Seringais",
    meta: [
      { name: "description", content: "Plataforma líder em gestão de seringais, focada em produtividade e controle operacional." },
      { property: "og:title", content: "Vertex Agro" },
      { property: "og:description", content: "Gestão Inteligente para Seringais" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  // A raiz não tem mais landing page: vai direto para o login.
  beforeLoad: () => {
    throw redirect({ to: "/auth" });
  },
});
