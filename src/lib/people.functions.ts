import { apiRequest } from "@/lib/api";

export const COMPANY_ROLES = [
  { value: "admin_empresa", label: "Admin da Empresa" },
  { value: "gestor", label: "Gestor" },
  { value: "supervisor_regional", label: "Supervisor Regional" },
  { value: "monitor", label: "Monitor" },
  { value: "consultor", label: "Consultor" },
  { value: "consulta", label: "Consulta (somente leitura)" },
] as const;

export type CompanyRole = (typeof COMPANY_ROLES)[number]["value"];

export type Person = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  roles: CompanyRole[];
};

export function listPeople(companyId: string) {
  return apiRequest<Person[]>(`/people?companyId=${encodeURIComponent(companyId)}`);
}

export function invitePerson(input: {
  companyId: string;
  email: string;
  fullName: string;
  password?: string;
  role: CompanyRole;
}) {
  return apiRequest<{ id: string; email: string }>(`/people/invite`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updatePersonRole(userId: string, companyId: string, role: CompanyRole) {
  return apiRequest(`/people/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ companyId, role }),
  });
}

export function removePerson(userId: string, companyId: string) {
  return apiRequest(`/people/${userId}?companyId=${encodeURIComponent(companyId)}`, {
    method: "DELETE",
  });
}
