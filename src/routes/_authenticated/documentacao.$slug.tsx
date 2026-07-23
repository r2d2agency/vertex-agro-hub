import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PageHeader } from "@/components/vertex/page-header";
import { Card, CardContent } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { docs } from "@/lib/docs";

export const Route = createFileRoute("/_authenticated/documentacao/$slug")({
  head: ({ params }) => {
    const doc = docs.find((d) => d.slug === params.slug);
    return {
      meta: [
        { title: `${doc?.title ?? "Documentação"} — Vertex Agro` },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  loader: ({ params }) => {
    const doc = docs.find((d) => d.slug === params.slug);
    if (!doc) throw notFound();
    return doc;
  },
  component: DocPage,
  notFoundComponent: () => (
    <div className="p-6 text-sm text-muted-foreground">Guia não encontrado.</div>
  ),
});

function DocPage() {
  const doc = Route.useLoaderData()!;
  return (
    <div>
      <div className="mb-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/documentacao">
            <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
          </Link>
        </Button>
      </div>
      <PageHeader title={doc.title} description={doc.summary} />
      <Card>
        <CardContent className="prose prose-sm max-w-none p-6 dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.body}</ReactMarkdown>
        </CardContent>
      </Card>
    </div>
  );
}
