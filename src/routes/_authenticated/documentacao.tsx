import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/vertex/page-header";
import { Card, CardContent } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { docs } from "@/lib/docs";

export const Route = createFileRoute("/_authenticated/documentacao")({
  head: () => ({
    meta: [
      { title: "Documentação — Vertex Agro" },
      { name: "description", content: "Guias passo a passo para operar o Vertex Agro." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DocsPage,
});

function DocsPage() {
  return (
    <div>
      <PageHeader
        title="Documentação"
        description="Guias rápidos para cadastros, operação diária e sincronização com os apps de campo."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {docs.map((d) => (
          <Card key={d.slug}>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold">{d.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d.summary}</p>
              <Link
                to="/documentacao/$slug"
                params={{ slug: d.slug }}
                className="mt-3 inline-block text-sm font-medium text-primary underline"
              >
                Ler guia →
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardContent className="prose prose-sm max-w-none p-6 dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{intro}</ReactMarkdown>
        </CardContent>
      </Card>
    </div>
  );
}

const intro = `## Como usar esta documentação

1. **Comece pelos cadastros base**: Empresa → Regionais → Fazendas → Talhões.
2. **Depois cadastre pessoas e equipes** que farão a operação.
3. **Configure tabelas de sangria e clones** antes de lançar sangrias/produção.
4. **Use o menu Apps** para compartilhar acesso com sua equipe.

Se algo não estiver claro, fale com o time de suporte Vertex.`;
