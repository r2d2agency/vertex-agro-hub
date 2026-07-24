import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HardHat, Search, Droplets } from "lucide-react";
import { PageHeader } from "@/components/vertex/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { listTappingRecords } from "@/lib/sangrias.functions";

export const Route = createFileRoute("/_authenticated/sangradores")({
  head: () => ({
    meta: [
      { title: "Sangradores — Vertex Agro" },
      { name: "description", content: "Sangradores identificados nas produções da empresa." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SangradoresPage,
});

type Aggregate = {
  name: string;
  records: number;
  liters: number;
  dryKg: number;
  lastDate: string | null;
  farms: Set<string>;
};

function SangradoresPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const [search, setSearch] = useState("");

  const { data: records = [], isLoading: loadingList } = useQuery({
    queryKey: ["tapping-records", companyId],
    queryFn: () => listTappingRecords(companyId!),
    enabled: !!companyId,
  });

  const list = useMemo(() => {
    const map = new Map<string, Aggregate>();
    for (const r of records) {
      const key = r.sangradorName?.trim();
      if (!key) continue;
      const cur = map.get(key) ?? {
        name: key, records: 0, liters: 0, dryKg: 0, lastDate: null, farms: new Set<string>(),
      };
      cur.records += 1;
      cur.liters += r.liters ?? 0;
      cur.dryKg += r.dryKg ?? 0;
      if (r.farmId) cur.farms.add(r.farmId);
      if (!cur.lastDate || r.date > cur.lastDate) cur.lastDate = r.date;
      map.set(key, cur);
    }
    let arr = Array.from(map.values()).sort((a, b) => b.records - a.records);
    const q = search.trim().toLowerCase();
    if (q) arr = arr.filter((a) => a.name.toLowerCase().includes(q));
    return arr;
  }, [records, search]);

  return (
    <div>
      <PageHeader
        title="Sangradores"
        description="Sangradores identificados nos registros de produção. Novos nomes são criados ao lançar sangrias."
      />

      {!isLoading && companies.length === 0 ? (
        <NoCompanyCard />
      ) : (
        <>
          <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />

          <div className="mb-4 relative max-w-sm">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Buscar sangrador..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {loadingList ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Carregando...</CardContent></Card>
          ) : list.length === 0 ? (
            <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
              Nenhum sangrador identificado ainda. Ao lançar uma sangria em <b>Sangrias</b>, o nome informado aparecerá aqui automaticamente.
            </CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {list.map((s) => (
                <Card key={s.name}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <HardHat className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Última sangria: {s.lastDate ? new Date(s.lastDate).toLocaleDateString("pt-BR") : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                      <Stat label="Registros" value={String(s.records)} />
                      <Stat label="Litros" value={s.liters ? s.liters.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—"} />
                      <Stat label="Kg seco" value={s.dryKg ? s.dryKg.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—"} />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Badge variant="outline" className="gap-1"><Droplets className="h-3 w-3" /> {s.farms.size} fazenda{s.farms.size === 1 ? "" : "s"}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
