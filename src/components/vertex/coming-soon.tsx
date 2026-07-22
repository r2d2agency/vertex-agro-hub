import { Construction } from "lucide-react";
import { PageHeader } from "./page-header";

export function ComingSoon({
  title,
  description,
  sprint,
}: {
  title: string;
  description?: string;
  sprint?: string;
}) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Construction className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-foreground">Módulo em construção</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Este módulo será entregue em {sprint ?? "uma próxima sprint"}. A estrutura de dados,
          permissões e sincronização offline já estão preparadas.
        </p>
      </div>
    </div>
  );
}
