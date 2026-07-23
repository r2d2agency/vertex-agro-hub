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
      title: "Painel Administrativo",
      description: "Acesso web para gestores, consultores e equipe interna.",
      url: origin,
    },
    {
      title: "Vertex Monitor (em breve)",
      description: "App de campo para monitores registrarem sangrias, produção e ocorrências offline.",
      url: `${origin}/apps/monitor`,
    },
    {
      title: "Vertex Consultor (em breve)",
      description: "App para consultores realizarem visitas, inspeções e planos de ação.",
      url: `${origin}/apps/consultor`,
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
          Os apps móveis Vertex Monitor e Vertex Consultor estão em desenvolvimento.
          Enquanto isso, o painel web está totalmente disponível para uso em desktop,
          tablet e celular.
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
