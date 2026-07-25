import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/vertex/page-header";
import { QrCard } from "@/components/vertex/qr-card";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/apps")({
  head: () => ({
    meta: [
      { title: "Apps móveis — Vertex Agro" },
      { name: "description", content: "Links e QR Codes dos aplicativos Vertex Agro." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AppsPage,
});

function AppsPage() {
  const [origin, setOrigin] = useState("https://app.vertexagro.com.br");
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const items = [
    {
      title: "Vertex Monitor",
      description: "App de campo para monitores: sangria, produção, ocorrências e chuva. Funciona offline.",
      url: `${origin}/monitor`,
    },
    {
      title: "Vertex Consultor",
      description: "App para consultores: agenda de visitas, inspeções, ocorrências e planos de ação.",
      url: `${origin}/consultor`,
    },
    {
      title: "Painel Administrativo",
      description: "Acesso web para gestores e equipe interna.",
      url: origin,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Apps móveis"
        description="Compartilhe o acesso com sua equipe usando o link direto ou o QR Code."
      />
      <Card className="mb-6">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Os links <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/monitor</code> e{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/consultor</code> abrem direto
          o app de campo (PWA instalável). Basta o colaborador entrar com o e-mail e senha
          cadastrados em Usuários.
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {items.map((i) => (
          <QrCard key={i.title} title={i.title} description={i.description} url={i.url} />
        ))}
      </div>
    </div>
  );
}
