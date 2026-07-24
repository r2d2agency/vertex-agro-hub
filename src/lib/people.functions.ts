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

export type PersonalData = {
  fullName?: string | null;
  cpf?: string | null;
  rg?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  maritalStatus?: string | null;
  nationality?: string | null;
  avatarUrl?: string | null;
  notes?: string | null;
  phone?: string | null;
  phoneAlt?: string | null;
  addressCep?: string | null;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  addressDistrict?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
};

export type Employment = {
  id?: string;
  companyId: string;
  position?: string | null;
  employeeCode?: string | null;
  admissionDate?: string | null;
  terminationDate?: string | null;
  contractType?: string | null;
  salary?: number | string | null;
  pisNumber?: string | null;
  ctpsNumber?: string | null;
  bankName?: string | null;
  bankAgency?: string | null;
  bankAccount?: string | null;
  bankPixKey?: string | null;
  notes?: string | null;
};

export type PersonDocument = {
  id: string;
  userId: string;
  companyId: string | null;
  kind: string;
  name: string;
  number: string | null;
  fileUrl: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  notes: string | null;
  createdAt: string;
};

export type Person = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  cpf?: string | null;
  phone?: string | null;
  roles: CompanyRole[];
};

export type PersonDetail = Person & PersonalData & {
  employment: Employment | null;
};

export function listPeople(companyId: string) {
  return apiRequest<Person[]>(`/people?companyId=${encodeURIComponent(companyId)}`);
}

export function getPerson(userId: string, companyId: string) {
  return apiRequest<PersonDetail>(`/people/${userId}?companyId=${encodeURIComponent(companyId)}`);
}

export function invitePerson(input: PersonalData & {
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

export function updatePersonPersonal(userId: string, companyId: string, data: PersonalData) {
  return apiRequest(`/people/${userId}/personal?companyId=${encodeURIComponent(companyId)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function upsertPersonEmployment(userId: string, data: Employment) {
  return apiRequest(`/people/${userId}/employment`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function listPersonDocuments(userId: string, companyId: string) {
  return apiRequest<PersonDocument[]>(
    `/people/${userId}/documents?companyId=${encodeURIComponent(companyId)}`,
  );
}

export function createPersonDocument(userId: string, data: Omit<PersonDocument, "id" | "userId" | "createdAt">) {
  return apiRequest<PersonDocument>(`/people/${userId}/documents`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deletePersonDocument(userId: string, docId: string, companyId: string) {
  return apiRequest(`/people/${userId}/documents/${docId}?companyId=${encodeURIComponent(companyId)}`, {
    method: "DELETE",
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

export const CONTRACT_TYPES = [
  "CLT", "PJ", "Autônomo", "Estagiário", "Temporário", "Terceirizado", "Sócio",
] as const;

export const GENDERS = ["Masculino", "Feminino", "Outro", "Prefiro não informar"] as const;

export const MARITAL_STATUSES = [
  "Solteiro(a)", "Casado(a)", "União estável", "Divorciado(a)", "Viúvo(a)",
] as const;

export const DOCUMENT_KINDS = [
  "RG", "CPF", "CNH", "CTPS", "PIS/PASEP", "Título de eleitor",
  "Certificado de reservista", "Comprovante de residência", "Diploma",
  "Certificado NR", "Contrato", "Outro",
] as const;

// ===== Vínculos e Avaliações =====
export const ASSIGNMENT_ROLES = [
  { value: "consultor", label: "Consultor" },
  { value: "monitor", label: "Monitor" },
  { value: "sangrador", label: "Sangrador" },
] as const;
export type AssignmentRole = (typeof ASSIGNMENT_ROLES)[number]["value"];

export type FarmAssignment = {
  id: string;
  userId: string;
  farmId: string;
  companyId: string;
  role: AssignmentRole;
  consultorUserId: string | null;
  startAt: string;
  endAt: string | null;
  endReason: string | null;
  notes: string | null;
  farm: { id: string; name: string; code: string | null } | null;
  consultor: { id: string; fullName: string | null; email: string } | null;
  user?: { id: string; fullName: string | null; email: string; avatarUrl: string | null; active: boolean };
};

export type PersonEvaluation = {
  id: string;
  userId: string;
  companyId: string;
  evaluatorUserId: string | null;
  ratedAt: string;
  rating: number;
  category: string | null;
  title: string | null;
  notes: string | null;
  createdAt: string;
  evaluator: { id: string; fullName: string | null; email: string } | null;
};

export function setPersonActive(userId: string, companyId: string, active: boolean, reason?: string) {
  return apiRequest(`/people/${userId}/active?companyId=${encodeURIComponent(companyId)}`, {
    method: "PATCH",
    body: JSON.stringify({ active, reason }),
  });
}

export function listPersonAssignments(userId: string, companyId: string) {
  return apiRequest<FarmAssignment[]>(
    `/people/${userId}/assignments?companyId=${encodeURIComponent(companyId)}`,
  );
}

export function createPersonAssignment(userId: string, input: {
  companyId: string;
  farmId: string;
  role: AssignmentRole;
  consultorUserId?: string;
  startAt: string;
  notes?: string;
}) {
  return apiRequest<FarmAssignment>(`/people/${userId}/assignments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function endPersonAssignment(userId: string, assignmentId: string, companyId: string, endAt?: string, endReason?: string) {
  return apiRequest(`/people/${userId}/assignments/${assignmentId}/end`, {
    method: "PATCH",
    body: JSON.stringify({ companyId, endAt, endReason }),
  });
}

export function deletePersonAssignment(userId: string, assignmentId: string, companyId: string) {
  return apiRequest(`/people/${userId}/assignments/${assignmentId}?companyId=${encodeURIComponent(companyId)}`, {
    method: "DELETE",
  });
}

export function listFarmTeam(farmId: string, companyId: string, history = false) {
  const q = new URLSearchParams({ companyId, ...(history ? { history: "true" } : {}) });
  return apiRequest<FarmAssignment[]>(`/people/farm/${farmId}/team?${q.toString()}`);
}

export function listPersonEvaluations(userId: string, companyId: string) {
  return apiRequest<PersonEvaluation[]>(
    `/people/${userId}/evaluations?companyId=${encodeURIComponent(companyId)}`,
  );
}

export function createPersonEvaluation(userId: string, input: {
  companyId: string;
  ratedAt: string;
  rating: number;
  category?: string;
  title?: string;
  notes?: string;
}) {
  return apiRequest<PersonEvaluation>(`/people/${userId}/evaluations`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deletePersonEvaluation(userId: string, evaluationId: string, companyId: string) {
  return apiRequest(`/people/${userId}/evaluations/${evaluationId}?companyId=${encodeURIComponent(companyId)}`, {
    method: "DELETE",
  });
}

