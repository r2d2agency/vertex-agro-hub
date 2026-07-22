import { z } from "zod";
import { apiRequest } from "@/lib/api";

type BackendCompany = {
  id: string;
  name: string;
  legalName?: string | null;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
  active: boolean;
};

export type Company = {
  id: string;
  razao_social: string;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
  responsavel?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  observacoes?: string | null;
  status: "ativa" | "inativa" | "bloqueada";
};

const companyInput = z.object({
  razao_social: z.string().trim().min(2).max(200),
  nome_fantasia: z.string().trim().max(200).optional().nullable(),
  cnpj: z.string().trim().max(20).optional().nullable(),
  email: z.string().trim().email().max(255).optional().nullable().or(z.literal("")),
  telefone: z.string().trim().max(30).optional().nullable(),
  responsavel: z.string().trim().max(120).optional().nullable(),
  endereco: z.string().trim().max(300).optional().nullable(),
  cidade: z.string().trim().max(120).optional().nullable(),
  estado: z.string().trim().max(2).optional().nullable(),
  logo_url: z.string().trim().max(500).optional().nullable(),
  observacoes: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(["ativa", "inativa", "bloqueada"]).default("ativa"),
});

function toCompany(row: BackendCompany): Company {
  return {
    id: row.id,
    razao_social: row.legalName || row.name,
    nome_fantasia: row.name,
    cnpj: row.taxId,
    email: row.email,
    telefone: row.phone,
    status: row.active ? "ativa" : "inativa",
  };
}

function toBackendPayload(input: z.infer<typeof companyInput>) {
  return {
    name: input.nome_fantasia?.trim() || input.razao_social,
    legalName: input.razao_social,
    taxId: input.cnpj || undefined,
    email: input.email || undefined,
    phone: input.telefone || undefined,
    active: input.status === "ativa",
  };
}

export async function listCompanies() {
  const rows = await apiRequest<BackendCompany[]>("/companies");
  return rows.map(toCompany);
}

export async function getCompany(input: { id: string }) {
  const data = z.object({ id: z.string().uuid() }).parse(input);
  const row = await apiRequest<BackendCompany>(`/companies/${data.id}`);
  return toCompany(row);
}

export async function createCompany(input: z.infer<typeof companyInput>) {
  const data = companyInput.parse(input);
  const row = await apiRequest<BackendCompany>("/companies", {
    method: "POST",
    body: JSON.stringify(toBackendPayload(data)),
  });
  return toCompany(row);
}

export async function updateCompany(input: { id: string; values: z.infer<typeof companyInput> }) {
  const data = z.object({ id: z.string().uuid(), values: companyInput }).parse(input);
  const row = await apiRequest<BackendCompany>(`/companies/${data.id}`, {
    method: "PATCH",
    body: JSON.stringify(toBackendPayload(data.values)),
  });
  return toCompany(row);
}

export async function deleteCompany(input: { id: string }) {
  const data = z.object({ id: z.string().uuid() }).parse(input);
  return apiRequest<{ ok: true }>(`/companies/${data.id}`, { method: "DELETE" });
}
