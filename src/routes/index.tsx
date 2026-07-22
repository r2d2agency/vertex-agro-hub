import { createFileRoute, Link } from "@tanstack/react-router";
import { Leaf, MapPin, ShieldCheck, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vertex Agro — Gestão operacional de seringais" },
      {
        name: "description",
        content:
          "Plataforma multiempresa para gestão de seringais: fazendas, talhões, sangrias, estimulações, produção, ocorrências e consultoria técnica com sincronização offline.",
      },
      { property: "og:title", content: "Vertex Agro" },
      {
        property: "og:description",
        content:
          "Centralize a operação dos seringais: monitores, sangradores, consultores, produção e indicadores em uma única plataforma.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Leaf className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Vertex Agro</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link to="/auth">
              <Button>Acessar plataforma</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-6 py-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              Plataforma para gestão de seringais
            </span>
            <h1 className="mt-6 text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
              A operação inteira do seu seringal, organizada em uma plataforma.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Empresas, fazendas, talhões, tabelas de sangria, monitores, sangradores, consultores,
              produção, ocorrências e indicadores — tudo conectado, rastreável e preparado para
              funcionamento offline em campo.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/auth">
                <Button size="lg">Entrar na plataforma</Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-card">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-20 sm:grid-cols-2 lg:grid-cols-3">
            <Feature
              icon={<MapPin className="h-6 w-6" />}
              title="Gestão territorial"
              desc="Empresas, regionais, fazendas, talhões e tabelas de sangria com perímetros geográficos e mapas."
            />
            <Feature
              icon={<Wifi className="h-6 w-6" />}
              title="Offline-first"
              desc="Aplicativos de campo funcionam sem internet. Sincronização automática ao retornar a conexão. Nenhum dado é perdido."
            />
            <Feature
              icon={<ShieldCheck className="h-6 w-6" />}
              title="Multiempresa com segurança"
              desc="Perfis, permissões e isolamento por empresa. Auditoria completa de todas as ações."
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-8 text-sm text-muted-foreground">
          © {new Date().getFullYear()} Vertex Agro. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-6">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
