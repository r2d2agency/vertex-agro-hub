import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, AlertTriangle, HelpCircle, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/vertex/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CompanyPicker, NoCompanyCard, useSelectedCompany } from "@/components/vertex/company-picker";
import {
  previewFarmImport, commitFarmImport,
  type ImportFarmRow, type RowPlan, type MonitorResolutionInput, type ImportCommitResult,
} from "@/lib/fazendas-import.functions";

export const Route = createFileRoute("/_authenticated/fazendas-importar")({
  head: () => ({
    meta: [
      { title: "Importar fazendas — Vertex Agro" },
      { name: "description", content: "Importar fazendas em massa a partir de uma planilha." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FazendasImportarPage,
});

const FIELDS: { key: keyof ImportFarmRow; label: string; required?: boolean; aliases?: string[] }[] = [
  { key: "supplierCode", label: "Código da Propriedade (Fornecedor)", required: true, aliases: ["codigo do fornecedor", "codigo da propriedade", "codigo da fazenda", "fornecedor"] },
  { key: "farmName", label: "Nome da Propriedade", required: true, aliases: ["nome da propriedade", "nome da fazenda", "propriedade"] },
  { key: "ownerLegalName", label: "Razão Social", aliases: ["razao social"] },
  { key: "ownerCode", label: "Código do Proprietário", aliases: ["codigo do proprietario"] },
  { key: "ownerAlternateCode", label: "Código Alternativo", aliases: ["codigo alternativo"] },
  { key: "regimeRaw", label: "Proprietário/Parceiro", aliases: ["proprietario/parceiro", "proprietario parceiro"] },
  { key: "cpf", label: "CPF", aliases: ["cpf"] },
  { key: "cnpjCpf", label: "CNPJ/CPF", aliases: ["cnpj/cpf", "cnpj cpf", "cnpj"] },
  { key: "stateRegistration", label: "Inscrição Estadual", aliases: ["inscricao estadual", "inscr estadual", "inscri estadual", "ie"] },
  { key: "coordinates", label: "Coordenadas Geográficas", aliases: ["coordenadas geograficas", "coordenadas"] },
  { key: "city", label: "Município", aliases: ["municipio", "cidade"] },
  { key: "state", label: "Estado", aliases: ["estado", "uf"] },
  { key: "buyer1Code", label: "Código do Comprador", aliases: ["codigo do comprador", "codigo do comprador 1"] },
  { key: "buyer1Name", label: "Nome do Comprador 1", aliases: ["nome do comprador 1", "comprador 1"] },
  { key: "buyer2Code", label: "Código do Comprador 2", aliases: ["codigo do comprador 2", "codndo do comprador 2"] },
  { key: "buyer2Name", label: "Nome do Comprador 2", aliases: ["nome do comprador 2", "comprador 2"] },
  { key: "monitor1Name", label: "Monitor 1", aliases: ["monitor 1"] },
  { key: "monitor2Name", label: "Monitor 2", aliases: ["monitor 2"] },
];

function normalize(v: string) {
  return v.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

const STATUS_STYLE: Record<RowPlan["status"], string> = {
  ok: "text-primary",
  warning: "text-warning",
  needs_review: "text-warning",
  error: "text-destructive",
};
const STATUS_ICON: Record<RowPlan["status"], typeof CheckCircle2> = {
  ok: CheckCircle2,
  warning: AlertTriangle,
  needs_review: HelpCircle,
  error: AlertCircle,
};

function FazendasImportarPage() {
  const { companies, companyId, setCompanyId, isLoading } = useSelectedCompany();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [validating, setValidating] = useState(false);
  const [plans, setPlans] = useState<RowPlan[] | null>(null);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [resolutions, setResolutions] = useState<Record<string, MonitorResolutionInput>>({});
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<ImportCommitResult | null>(null);

  const rows = useMemo<ImportFarmRow[]>(() => {
    if (!rawRows.length) return [];
    return rawRows.map((raw, i) => {
      const r: ImportFarmRow = { rowIndex: i + 1 };
      for (const [target, src] of Object.entries(mapping)) {
        if (!src || src === "__none") continue;
        const v = raw[src]?.trim();
        if (v) (r as any)[target] = v;
      }
      return r;
    });
  }, [rawRows, mapping]);

  const onFile = async (file: File) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" }) as string[][];
    const h = (aoa[0] ?? []).map((c) => String(c ?? "").trim()).filter(Boolean);
    const dataRows = aoa.slice(1).filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
    const parsedRows = dataRows.map((r) => {
      const obj: Record<string, string> = {};
      h.forEach((col, i) => { obj[col] = String(r[i] ?? "").trim(); });
      return obj;
    });
    setHeaders(h);
    setRawRows(parsedRows);
    const auto: Record<string, string> = {};
    for (const f of FIELDS) {
      const candidates = [f.label, ...(f.aliases ?? [])].map(normalize);
      const match = h.find((col) => {
        const nc = normalize(col);
        return candidates.some((c) => nc.includes(c) || c.includes(nc));
      });
      if (match) auto[f.key] = match;
    }
    setMapping(auto);
    setPlans(null);
    setResult(null);
  };

  const runPreview = async () => {
    if (!companyId) return;
    setValidating(true);
    try {
      const res = await previewFarmImport(companyId, rows);
      setPlans(res);
      setExcluded(new Set(res.filter((p) => p.status === "error").map((p) => p.rowIndex)));
      setResolutions({});
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao validar planilha");
    } finally {
      setValidating(false);
    }
  };

  const counts = useMemo(() => {
    const c = { ok: 0, warning: 0, needs_review: 0, error: 0 };
    for (const p of plans ?? []) c[p.status]++;
    return c;
  }, [plans]);

  const pendingResolutions = useMemo(() => {
    if (!plans) return 0;
    return plans
      .filter((p) => !excluded.has(p.rowIndex))
      .reduce((acc, p) => acc + p.monitors.filter((m) => m.status === "ambiguous" && !resolutions[`${p.rowIndex}:${m.slot}`]).length, 0);
  }, [plans, excluded, resolutions]);

  const includedCount = (plans ?? []).filter((p) => !excluded.has(p.rowIndex)).length;

  const runCommit = async () => {
    if (!companyId || !plans) return;
    setCommitting(true);
    try {
      const res = await commitFarmImport(companyId, rows, Object.values(resolutions), Array.from(excluded));
      setResult(res);
      if (res.created || res.updated) toast.success(`${res.created} criadas · ${res.updated} atualizadas`);
      if (res.failed) toast.error(`${res.failed} linha(s) com erro`);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao importar");
    } finally {
      setCommitting(false);
    }
  };

  function ownerSummary(p: RowPlan) {
    if (p.owner.status === "none") return "—";
    const suffix = p.owner.status === "create" ? " (novo)" : "";
    return `${p.owner.name || "—"}${suffix}`;
  }

  function buyersSummary(p: RowPlan) {
    const names = p.buyers.filter((b) => b.status !== "skipped").map((b) => `${b.name}${b.status === "create" ? " (novo)" : ""}`);
    return names.length ? names.join(", ") : "—";
  }

  return (
    <div>
      <PageHeader
        title="Importar fazendas"
        description="Cadastre fazendas em massa a partir de uma planilha (.xlsx)."
        actions={<Link to="/fazendas"><Button variant="ghost"><ChevronLeft className="mr-2 h-4 w-4" /> Voltar</Button></Link>}
      />

      {!isLoading && companies.length === 0 ? (
        <NoCompanyCard />
      ) : (
        <>
          <CompanyPicker companies={companies} companyId={companyId} onChange={setCompanyId} />

          <Card className="mb-4">
            <CardContent className="p-6">
              <Label>Arquivo da planilha (.xlsx)</Label>
              <div className="mt-1 flex items-center gap-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-accent">
                  <Upload className="h-4 w-4" />
                  Escolher arquivo
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
                  />
                </label>
                {rawRows.length > 0 && <span className="text-sm text-muted-foreground">{rawRows.length} linhas detectadas</span>}
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
                      <Label className="text-xs">{f.label}{f.required ? " *" : ""}</Label>
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
                <Button className="mt-4" onClick={runPreview} disabled={validating || !companyId || rows.length === 0}>
                  {validating ? "Validando..." : `Validar ${rows.length} linha(s)`}
                </Button>
              </CardContent>
            </Card>
          )}

          {plans && (
            <Card className="mb-4">
              <CardContent className="p-0">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
                  <div className="text-sm">
                    <span className="font-semibold text-primary">{counts.ok}</span> ok ·{" "}
                    <span className="font-semibold text-warning">{counts.warning}</span> avisos ·{" "}
                    <span className="font-semibold text-warning">{counts.needs_review}</span> revisão pendente ·{" "}
                    <span className="font-semibold text-destructive">{counts.error}</span> erros ·{" "}
                    <span className="text-muted-foreground">{includedCount} incluídas</span>
                  </div>
                  <Button onClick={runCommit} disabled={committing || includedCount === 0 || pendingResolutions > 0}>
                    {committing ? "Importando..." : pendingResolutions > 0 ? `Resolva ${pendingResolutions} monitor(es)` : `Confirmar importação (${includedCount})`}
                  </Button>
                </div>
                <div className="max-h-[32rem] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8" />
                        <TableHead className="w-8" />
                        <TableHead>Fazenda</TableHead>
                        <TableHead>Proprietário</TableHead>
                        <TableHead>Compradores</TableHead>
                        <TableHead>Monitores</TableHead>
                        <TableHead>Observações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plans.map((p) => {
                        const Icon = STATUS_ICON[p.status];
                        const isExcluded = excluded.has(p.rowIndex);
                        return (
                          <TableRow key={p.rowIndex} className={p.status === "error" ? "bg-destructive/5" : p.status === "needs_review" ? "bg-warning/5" : ""}>
                            <TableCell>
                              <Checkbox
                                checked={!isExcluded}
                                onCheckedChange={(v) => setExcluded((cur) => {
                                  const next = new Set(cur);
                                  if (v) next.delete(p.rowIndex); else next.add(p.rowIndex);
                                  return next;
                                })}
                              />
                            </TableCell>
                            <TableCell><Icon className={`h-4 w-4 ${STATUS_STYLE[p.status]}`} /></TableCell>
                            <TableCell>
                              <div className="font-medium">{p.farmName || "—"}</div>
                              {p.supplierCode && <div className="font-mono text-xs text-muted-foreground">{p.supplierCode}</div>}
                            </TableCell>
                            <TableCell>{ownerSummary(p)}</TableCell>
                            <TableCell>{buyersSummary(p)}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {p.monitors.filter((m) => m.status !== "none").map((m) => (
                                  <div key={m.slot}>
                                    {m.status !== "ambiguous" ? (
                                      <span className="text-xs">
                                        {m.name}{m.status === "create" ? " (novo)" : ""}
                                      </span>
                                    ) : (
                                      <Select
                                        value={resolutions[`${p.rowIndex}:${m.slot}`]
                                          ? (resolutions[`${p.rowIndex}:${m.slot}`].action === "use"
                                            ? `use:${resolutions[`${p.rowIndex}:${m.slot}`].userId}`
                                            : resolutions[`${p.rowIndex}:${m.slot}`].action)
                                          : undefined}
                                        onValueChange={(v) => {
                                          const [action, userId] = v.split(":");
                                          setResolutions((cur) => ({
                                            ...cur,
                                            [`${p.rowIndex}:${m.slot}`]: {
                                              rowIndex: p.rowIndex, slot: m.slot as 1 | 2,
                                              action: action as "use" | "create" | "skip",
                                              userId: action === "use" ? userId : undefined,
                                            },
                                          }));
                                        }}
                                      >
                                        <SelectTrigger className="h-8 w-56 text-xs"><SelectValue placeholder={`Monitor ${m.slot}: "${m.name}" — ambíguo`} /></SelectTrigger>
                                        <SelectContent>
                                          {m.candidates?.map((c) => (
                                            <SelectItem key={c.id} value={`use:${c.id}`}>{c.fullName || c.email}</SelectItem>
                                          ))}
                                          <SelectItem value="create">Criar novo mesmo assim</SelectItem>
                                          <SelectItem value="skip">Não vincular</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <ul className="space-y-0.5 text-xs">
                                {p.issues.map((iss, i) => (
                                  <li key={i} className={iss.severity === "error" ? "text-destructive" : "text-warning"}>{iss.message}</li>
                                ))}
                              </ul>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {result && (
            <Card>
              <CardContent className="p-6 text-sm">
                <p className="mb-2 font-semibold">Importação finalizada</p>
                <p>
                  <strong className="text-primary">{result.created}</strong> criadas ·{" "}
                  <strong className="text-primary">{result.updated}</strong> atualizadas ·{" "}
                  <strong className="text-muted-foreground">{result.skipped}</strong> puladas ·{" "}
                  <strong className="text-destructive">{result.failed}</strong> falharam
                </p>
                {result.failed > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-destructive">
                    {result.rows.filter((r) => r.status === "error").map((r) => (
                      <li key={r.rowIndex}>Linha {r.rowIndex}: {r.errorMessage}</li>
                    ))}
                  </ul>
                )}
                <Link to="/fazendas"><Button className="mt-4">Ver fazendas</Button></Link>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
