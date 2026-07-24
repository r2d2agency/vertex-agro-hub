import { apiRequest } from "@/lib/api";

export type Machine = {
  id: string;
  companyId: string;
  regionalId: string | null;
  farmId: string | null;
  code: string | null;
  patrimony: string | null;
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  serial: string | null;
  plate: string | null;
  tankCapacity: number | null;
  fuelType: string | null;
  hourmeter: number | null;
  hourmeterUnit: string | null;
  defaultOperatorId: string | null;
  monitorUserId: string | null;
  acquisitionDate: string | null;
  supplier: string | null;
  photoUrl: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MachineDetail = Machine & {
  documents: Array<{ id: string; kind: string; name: string; fileUrl: string | null; createdAt: string }>;
  statusLogs: Array<{ id: string; kind: string; fromValue: string | null; toValue: string | null; createdAt: string }>;
  implements: Implement[];
};

export type Implement = {
  id: string; companyId: string; farmId: string | null; machineId: string | null;
  code: string | null; patrimony: string | null; name: string; category: string;
  brand: string | null; model: string | null; year: number | null; serial: string | null;
  responsibleUserId: string | null; photoUrl: string | null; status: string; notes: string | null;
};

export type Operator = {
  id: string; companyId: string; farmId: string | null; name: string;
  cpf: string | null; phone: string | null; email: string | null;
  monitorUserId: string | null; cnhCategory: string | null; cnhExpiresAt: string | null;
  admissionDate: string | null; photoUrl: string | null; status: string;
  authorizedCategories: string[] | null; notes: string | null;
};

export type OperationType = {
  id: string; companyId: string; code: string | null; name: string;
  category: string | null; description: string | null; unit: string | null;
  requiresHourmeter: boolean; requiresOperator: boolean; requiresPhoto: boolean;
  requiresLocation: boolean; consumesFuel: boolean; active: boolean;
};

export type FleetOverview = {
  byStatus: Record<string, number>;
  totals: { machines: number; implements: number; operators: number; operations: number };
};

export const MACHINE_CATEGORIES = [
  { value: "trator", label: "Trator" },
  { value: "caminhao", label: "Caminhão" },
  { value: "carreta_motorizada", label: "Carreta motorizada" },
  { value: "rocadeira", label: "Roçadeira" },
  { value: "gerador", label: "Gerador" },
  { value: "pulverizador", label: "Pulverizador" },
  { value: "maquina_agricola", label: "Máquina agrícola" },
  { value: "veiculo_apoio", label: "Veículo de apoio" },
  { value: "outro", label: "Outro" },
] as const;

export const MACHINE_STATUSES = [
  { value: "disponivel", label: "Disponível" },
  { value: "em_operacao", label: "Em operação" },
  { value: "em_manutencao", label: "Em manutenção" },
  { value: "parada", label: "Parada" },
  { value: "indisponivel", label: "Indisponível" },
  { value: "inativa", label: "Inativa" },
] as const;

export const IMPLEMENT_CATEGORIES = [
  { value: "carreta", label: "Carreta" },
  { value: "grade", label: "Grade" },
  { value: "rocadeira_acoplada", label: "Roçadeira acoplada" },
  { value: "tanque", label: "Tanque" },
  { value: "pulverizador", label: "Pulverizador" },
  { value: "reboque", label: "Reboque" },
  { value: "acoplavel", label: "Equipamento acoplável" },
  { value: "outro", label: "Outro" },
] as const;

export const IMPLEMENT_STATUSES = [
  { value: "disponivel", label: "Disponível" },
  { value: "em_uso", label: "Em uso" },
  { value: "em_manutencao", label: "Em manutenção" },
  { value: "inativo", label: "Inativo" },
] as const;

export const OPERATOR_STATUSES = [
  { value: "ativo", label: "Ativo" },
  { value: "inativo", label: "Inativo" },
  { value: "ferias", label: "Férias" },
  { value: "afastado", label: "Afastado" },
] as const;

export const FUEL_TYPES = ["Diesel S10", "Diesel S500", "Gasolina", "Etanol", "GNV"];

const qs = (params: Record<string, string | undefined>) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v && p.set(k, v));
  return p.toString();
};

// ----- Machines -----
export const listMachines = (companyId: string, opts: { farmId?: string; status?: string } = {}) =>
  apiRequest<Machine[]>(`/machines?${qs({ companyId, ...opts })}`);
export const getMachine = (id: string) => apiRequest<MachineDetail>(`/machines/${id}`);
export const createMachine = (dto: Partial<Machine> & { companyId: string; name: string }) =>
  apiRequest<Machine>(`/machines`, { method: "POST", body: JSON.stringify(dto) });
export const updateMachine = (id: string, dto: Partial<Machine> & { companyId: string }) =>
  apiRequest<Machine>(`/machines/${id}`, { method: "PATCH", body: JSON.stringify(dto) });
export const deleteMachine = (id: string) =>
  apiRequest<{ ok: true }>(`/machines/${id}`, { method: "DELETE" });

// ----- Implements -----
export const listImplements = (companyId: string, farmId?: string) =>
  apiRequest<Implement[]>(`/implements?${qs({ companyId, farmId })}`);
export const createImplement = (dto: Partial<Implement> & { companyId: string; name: string }) =>
  apiRequest<Implement>(`/implements`, { method: "POST", body: JSON.stringify(dto) });
export const updateImplement = (id: string, dto: Partial<Implement>) =>
  apiRequest<Implement>(`/implements/${id}`, { method: "PATCH", body: JSON.stringify(dto) });
export const deleteImplement = (id: string) =>
  apiRequest<{ ok: true }>(`/implements/${id}`, { method: "DELETE" });

// ----- Operators -----
export const listOperators = (companyId: string, farmId?: string) =>
  apiRequest<Operator[]>(`/operators?${qs({ companyId, farmId })}`);
export const createOperator = (dto: Partial<Operator> & { companyId: string; name: string }) =>
  apiRequest<Operator>(`/operators`, { method: "POST", body: JSON.stringify(dto) });
export const updateOperator = (id: string, dto: Partial<Operator>) =>
  apiRequest<Operator>(`/operators/${id}`, { method: "PATCH", body: JSON.stringify(dto) });
export const deleteOperator = (id: string) =>
  apiRequest<{ ok: true }>(`/operators/${id}`, { method: "DELETE" });

// ----- Operation types -----
export const listOperationTypes = (companyId: string) =>
  apiRequest<OperationType[]>(`/operation-types?${qs({ companyId })}`);
export const createOperationType = (dto: Partial<OperationType> & { companyId: string; name: string }) =>
  apiRequest<OperationType>(`/operation-types`, { method: "POST", body: JSON.stringify(dto) });
export const updateOperationType = (id: string, dto: Partial<OperationType>) =>
  apiRequest<OperationType>(`/operation-types/${id}`, { method: "PATCH", body: JSON.stringify(dto) });
export const deleteOperationType = (id: string) =>
  apiRequest<{ ok: true }>(`/operation-types/${id}`, { method: "DELETE" });

// ----- Overview -----
export const fleetOverview = (companyId: string) =>
  apiRequest<FleetOverview>(`/fleet/overview?${qs({ companyId })}`);
