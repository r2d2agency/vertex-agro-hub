import { apiRequest } from "@/lib/api";

export type ImportFarmRow = {
  rowIndex: number;
  supplierCode?: string;
  ownerLegalName?: string;
  ownerCode?: string;
  farmName?: string;
  regimeRaw?: string;
  ownerAlternateCode?: string;
  cpf?: string;
  stateRegistration?: string;
  cnpjCpf?: string;
  coordinates?: string;
  city?: string;
  state?: string;
  buyer1Code?: string;
  buyer1Name?: string;
  buyer2Code?: string;
  buyer2Name?: string;
  monitor1Name?: string;
  monitor2Name?: string;
};

export type RowIssue = { field: string; message: string; severity: "error" | "warning" };

export type OwnerResolution = {
  status: "none" | "matched" | "create";
  keyType?: "alt" | "code";
  keyValue?: string;
  name?: string;
  ownerId?: string;
};

export type BuyerResolution = {
  slot: 1 | 2;
  status: "skipped" | "matched" | "create";
  code?: string;
  name?: string;
  buyerId?: string;
};

export type MonitorCandidate = { id: string; fullName: string | null; email: string | null };

export type MonitorResolution = {
  slot: 1 | 2;
  status: "none" | "matched" | "create" | "ambiguous";
  name?: string;
  userId?: string;
  candidates?: MonitorCandidate[];
};

export type RowPlan = {
  rowIndex: number;
  farmName?: string;
  supplierCode?: string;
  regime?: "propria" | "arrendada" | null;
  city?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  owner: OwnerResolution;
  buyers: BuyerResolution[];
  monitors: MonitorResolution[];
  issues: RowIssue[];
  status: "ok" | "warning" | "error" | "needs_review";
};

export type MonitorResolutionInput = {
  rowIndex: number;
  slot: 1 | 2;
  action: "use" | "create" | "skip";
  userId?: string;
};

export type ImportCommitResult = {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  rows: Array<{ rowIndex: number; status: "created" | "updated" | "skipped" | "error"; farmId?: string; errorMessage?: string }>;
};

export function previewFarmImport(companyId: string, rows: ImportFarmRow[]) {
  return apiRequest<RowPlan[]>("/farms/import/preview", {
    method: "POST",
    body: JSON.stringify({ companyId, rows }),
  });
}

export function commitFarmImport(
  companyId: string,
  rows: ImportFarmRow[],
  resolutions: MonitorResolutionInput[],
  skipRowIndexes: number[],
) {
  return apiRequest<ImportCommitResult>("/farms/import/commit", {
    method: "POST",
    body: JSON.stringify({ companyId, rows, resolutions, skipRowIndexes }),
  });
}
