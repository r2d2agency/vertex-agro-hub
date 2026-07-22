import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/vertex/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import { listFarms } from "@/lib/fazendas.functions";
import { createDelivery, type DeliveryInput } from "@/lib/producao.functions";

export const Route = createFileRoute("/_authenticated/importar")({
  head: () => ({
    meta: [
      { title: "Importar CSV — Vertex Agro" },
      { name: "description", content: "Importar entregas de produção históricas da planilha." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ImportarPage,
});

type Row = {
  season?: string;
  deliveryDate: string;
  turnDay?: number | null;
  propertyName?: string;
  ownerName?: string;
  status?: string;
  consultantName?: string;
  monitorName?: string;
  coagulant?: string;
  latexType?: string;
  grossWeightKg?: number | null;
  netWeightKg?: number | null;
  drcAvgPercent?: number | null;
  notes?: string;
  _error?: string;
};

const FIELDS: { key: keyof Row; label: string }[] = [
  { key: "season", label: "Safra" },
  { key: "deliveryDate", label: "Data Entrega *" },
  { key: "turnDay", label: "Dia Virada" },
  { key: "propertyName", label: "Propriedade" },
  { key: "ownerName", label: "Proprietário" },
  { key: "status", label: "Status" },
  { key: "consultantName", label: "Consultor" },
  { key: "monitorName", label: "Monitor" },
  { key: "coagulant", label: "Coagulante" },
  { key: "latexType", label: "Tipo (CL/CN)" },
  { key: "grossWeightKg", label: "Peso Bruto (kg)" },
  { key: "netWeightKg", label: "Peso Líquido (kg)" },
  { key: "drcAvgPercent", label: "DRC (%)" },
  { key: "notes", label: "Observações" },
];

function ImportarPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const [farmId, setFarmId] = useState<string>("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: number; fail: number } | null>(null);

  const { data: farms = [] } = useQuery({
    queryKey: ["farms", companyId],
    queryFn: () => listFarms(companyId!),
    enabled: !!companyId,
  });

  const parsed = useMemo<Row[]>(() => {
    if (!rawRows.length) return [];
    return rawRows.map((raw) => {
      const r: Row = { deliveryDate: "" };
      for (const [target, src] of Object.entries(mapping)) {
        if (!src || src === "__none") continue;
        const v = raw[src]?.trim();
        if (!v) continue;
        if (target === "deliveryDate") r.deliveryDate = normalizeDate(v);
        else if (target === "turnDay") r.turnDay = toNumber(v);
        else if (["grossWeightKg", "netWeightKg", "drcAvgPercent"].includes(target)) {
          (r as any)[target] = toNumber(v);
        } else (r as any)[target] = v;
      }
      if (!r.deliveryDate) r._error = "Data inválida";
      return r;
    });
  }, [rawRows, mapping]);

  const valid = parsed.filter((r) => !r._error);

  const onFile = async (file: File) => {
    const text = await file.text();
    const { headers: h, rows } = parseCsv(text);
    setHeaders(h);
    setRawRows(rows);
    const auto: Record<string, string> = {};
    for (const f of FIELDS) {
      const match = h.find((col) => normalize(col).includes(normalize(f.label.replace(" *", ""))));
      if (match) auto[f.key] = match;
    }
    setMapping(auto);
    setResult(null);
  };

  const runImport = async () => {
    if (!companyId) return;
    setImporting(true);
    let ok = 0, fail = 0;
    for (const r of valid) {
      const payload: DeliveryInput = {
        farmId: farmId || undefined,
        season: r.season,
        deliveryDate: r.deliveryDate,
        turnDay: r.turnDay ?? null,
        propertyName: r.propertyName,
        ownerName: r.ownerName,
        status: r.status,
        consultantName: r.consultantName,
        monitorName: r.monitorName,
        coagulant: r.coagulant,
        latexType: r.latexType,
        grossWeightKg: r.grossWeightKg ?? null,
        netWeightKg: r.netWeightKg ?? null,
        drcAvgPercent: r.drcAvgPercent ?? null,
        notes: r.notes,
      };
      try {
        await createDelivery(companyId, payload);
        ok++;
      } catch {
        fail++;
      }
    }
    setImporting(false);
    setResult({ ok, fail });
    if (ok) toast.success(`${ok} entregas importadas`);
    if (fail) toast.error(`${fail} falharam`);
  };

  return (
    <div>
      <PageHeader
        title="Importar CSV"
        description="Importe suas entregas de produção históricas a partir da planilha atual."
      />

      {!isLoading && companies.length === 0 ? (
        <NoCompanyCard />
      ) : (
        <>
          <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />

          <Card className="mb-4">
            <CardContent className="p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Fazenda (opcional — aplicada a todas as linhas)</Label>
                  <Select value={farmId || "__none"} onValueChange={(v) => setFarmId(v === "__none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">—</SelectItem>
                      {farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Arquivo CSV (separador vírgula ou ponto-e-vírgula)</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-accent">
                      <Upload className="h-4 w-4" />
                      Escolher arquivo
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
                      />
                    </label>
                    {rawRows.length > 0 && (
                      <span className="text-sm text-muted-foreground">{rawRows.length} linhas detectadas</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {headers.length > 0 && (
            <Card className="mb-4">
              <CardContent className="p-6">
                <h3 className="mb-3 flex items-center gap-2 font-semibold"><FileSpreadsheet className="h-4 w-4" /> Mapeamento de colunas</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {FIELDS.map((f) => (
                    <div key={f.key} className="grid grid-cols-2 items-center gap-2">
                      <Label className="text-xs">{f.label}</Label>
                      <Select
                        value={mapping[f.key] || "__none"}
                        onValueChange={(v) => setMapping((m) => ({ ...m, [f.key]: v }))}
                      >
                        <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">—</SelectItem>
                          {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {parsed.length > 0 && (
            <Card className="mb-4">
              <CardContent className="p-0">
                <div className="flex items-center justify-between border-b p-4">
                  <div className="text-sm">
                    <span className="font-semibold text-primary">{valid.length}</span> válidas ·{" "}
                    <span className="font-semibold text-destructive">{parsed.length - valid.length}</span> com erro
                  </div>
                  <Button onClick={runImport} disabled={importing || valid.length === 0 || !companyId}>
                    {importing ? "Importando..." : `Importar ${valid.length} entregas`}
                  </Button>
                </div>
                <div className="max-h-96 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8" />
                        <TableHead>Data</TableHead>
                        <TableHead>Safra</TableHead>
                        <TableHead>Propriedade</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Bruto</TableHead>
                        <TableHead className="text-right">Líquido</TableHead>
                        <TableHead className="text-right">DRC</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsed.slice(0, 100).map((r, i) => (
                        <TableRow key={i} className={r._error ? "bg-destructive/5" : ""}>
                          <TableCell>{r._error ? <AlertCircle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-primary" />}</TableCell>
                          <TableCell>{r.deliveryDate || <span className="text-destructive">{r._error}</span>}</TableCell>
                          <TableCell>{r.season ?? "—"}</TableCell>
                          <TableCell>{r.propertyName ?? "—"}</TableCell>
                          <TableCell>{r.latexType ?? "—"}</TableCell>
                          <TableCell className="text-right">{r.grossWeightKg ?? "—"}</TableCell>
                          <TableCell className="text-right">{r.netWeightKg ?? "—"}</TableCell>
                          <TableCell className="text-right">{r.drcAvgPercent ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {parsed.length > 100 && (
                  <p className="border-t p-2 text-center text-xs text-muted-foreground">
                    Mostrando 100 de {parsed.length} linhas.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {result && (
            <Card>
              <CardContent className="p-6 text-sm">
                Importação finalizada: <strong className="text-primary">{result.ok}</strong> sucesso ·{" "}
                <strong className="text-destructive">{result.fail}</strong> falhas.
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function parseCsv(text: string) {
  const clean = text.replace(/^\uFEFF/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const delim = firstLine.split(";").length > firstLine.split(",").length ? ";" : ",";
  const lines: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"' && clean[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === delim) { cur.push(field); field = ""; }
      else if (c === "\n") { cur.push(field); lines.push(cur); cur = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field || cur.length) { cur.push(field); lines.push(cur); }
  const headers = (lines.shift() ?? []).map((h) => h.trim());
  const rows = lines
    .filter((l) => l.some((c) => c.trim()))
    .map((l) => Object.fromEntries(headers.map((h, i) => [h, l[i] ?? ""])));
  return { headers, rows };
}

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function toNumber(v: string): number | null {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function normalizeDate(v: string): string {
  const s = v.trim();
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const yy = y.length === 2 ? `20${y}` : y;
    return `${yy}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return "";
}
