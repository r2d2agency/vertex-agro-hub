import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/vertex/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { changelog, changelogTypeLabels, type ChangelogType } from "@/lib/changelog";

export const Route = createFileRoute("/_authenticated/atualizacoes")({
  head: () => ({
    meta: [
      { title: "Atualizações — Vertex Agro" },
      { name: "description", content: "Histórico de novidades, melhorias e correções do sistema." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ChangelogPage,
});

const typeBadgeClass: Record<ChangelogType, string> = {
  novidade: "border-transparent bg-primary/10 text-primary",
  melhoria: "border-transparent bg-blue-500/10 text-blue-600 dark:text-blue-400",
  correcao: "border-transparent bg-amber-500/10 text-amber-600 dark:text-amber-500",
};

function formatDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function ChangelogPage() {
  return (
    <div>
      <PageHeader
        title="Atualizações"
        description="Novidades, melhorias e correções aplicadas ao Vertex Agro, em ordem cronológica."
      />

      <div className="space-y-6">
        {changelog.map((release) => (
          <Card key={release.date}>
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-muted-foreground">
                {formatDate(release.date)}
              </h3>

              <ul className="mt-4 space-y-4">
                {release.entries.map((entry, i) => (
                  <li
                    key={i}
                    className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3"
                  >
                    <Badge className={cn("w-fit shrink-0", typeBadgeClass[entry.type])}>
                      {changelogTypeLabels[entry.type]}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium text-foreground">{entry.title}</p>
                      <p className="text-sm text-muted-foreground">{entry.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
