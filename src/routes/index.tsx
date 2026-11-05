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
  // A raiz abre o app de campo; a rota protegida envia usuários sem sessão
  // para o login.
  beforeLoad: () => {
    throw redirect({ to: "/campo" });
  },
});
