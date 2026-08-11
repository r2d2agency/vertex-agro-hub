import { apiRequest } from "@/lib/api";

const qs = (params: Record<string, string | undefined | boolean>) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && v !== false) p.set(k, String(v));
  });
  return p.toString();
};

// ============ Types ============
export type FuelTank = {
  id: string; companyId: string; farmId: string | null;
  name: string; fuelType: string; capacity: number | null;
  currentLevel: number; minLevel: number | null; location: string | null;
  active: boolean; notes: string | null;
  createdAt: string; updatedAt: string;
};

export type FuelMovement = {
  id: string; companyId: string; tankId: string; kind: "entrada" | "saida" | "ajuste";
  occurredAt: string; liters: number; unitCost: number | null; totalCost: number | null;
  supplier: string | null; invoiceNumber: string | null;
  machineId: string | null; operatorId: string | null; operationLogId: string | null;
  hourmeter: number | null; notes: string | null;
  tank?: { name: string; fuelType: string };
  machine?: { name: string; plate: string | null } | null;
  operator?: { name: string } | null;
};

export type InventoryItem = {
  id: string; companyId: string; farmId: string | null;
  sku: string | null; name: string; category: string; unit: string;
  currentStock: number; minStock: number | null; unitCost: number | null;
  supplier: string | null; supplierCnpj: string | null; supplierPhone: string | null;
  supplierContact: string | null; supplierAddress: string | null;
  location: string | null; active: boolean; notes: string | null;
  createdAt: string; updatedAt: string;
};

export type InventoryMovement = {
  id: string; companyId: string; itemId: string; kind: "entrada" | "saida" | "ajuste";
  occurredAt: string; quantity: number; unitCost: number | null; totalCost: number | null;
  reason: string | null; machineId: string | null; maintenanceOrderId: string | null;
  supplier: string | null; invoiceNumber: string | null; notes: string | null;
  item?: { name: string; unit: string; sku: string | null };
  machine?: { name: string } | null;
};

export type MaintenanceOrderItem = {
  id: string; orderId: string; inventoryItemId: string | null;
  kind: string; description: string; quantity: number;
  unitCost: number | null; totalCost: number | null;
  inventoryItem?: InventoryItem | null;
};

export type MaintenanceOrder = {
  id: string; companyId: string; machineId: string | null; implementId: string | null;
  code: string | null; kind: string; status: string; priority: string;
  openedAt: string; scheduledFor: string | null; startedAt: string | null; finishedAt: string | null;
  hourmeterAtOpen: number | null; hourmeterAtClose: number | null;
  reportedBy: string | null; assignedTo: string | null; supplier: string | null;
  description: string; diagnosis: string | null; solution: string | null;
  laborCost: number | null; partsCost: number | null; totalCost: number | null;
  photoUrl: string | null; notes: string | null;
  machine?: { name: string; plate: string | null } | null;
  implement?: { name: string } | null;
  items?: MaintenanceOrderItem[];
};

export type OperationLog = {
  id: string; companyId: string; farmId: string | null; plotId: string | null;
  machineId: string; implementId: string | null; operatorId: string | null;
  operationTypeId: string | null; startedAt: string; finishedAt: string | null;
  hourmeterStart: number | null; hourmeterEnd: number | null;
  durationHours: number | null; fuelConsumed: number | null;
  areaWorked: number | null; distanceKm: number | null;
  notes: string | null; latitude: number | null; longitude: number | null;
  photoUrl: string | null; status: string;
  machine?: { name: string; plate: string | null };
  operator?: { name: string } | null;
  operationType?: { name: string; unit: string | null } | null;
  implement?: { name: string } | null;
};

export type MachineChecklistItem = { label: string; status: "ok" | "nok" | "na"; notes?: string };
export type MachineChecklist = {
  id: string; companyId: string; machineId: string; operatorId: string | null;
  operationLogId: string | null; kind: string; performedAt: string;
  hourmeter: number | null; overallStatus: string; items: MachineChecklistItem[];
  notes: string | null; photoUrl: string | null;
  machine?: { name: string; plate: string | null };
  operator?: { name: string } | null;
};

export type OpsOverview = {
  dieselTotal: number; tanksCount: number;
  itemsCount: number; lowStockCount: number;
  ordersOpen: number;
  last30d: {
    fuelLiters: number; fuelCost: number;
    operations: number; hours: number; fuelConsumed: number;
  };
};

// ============ Fuel Tanks ============
export const listFuelTanks = (companyId: string, farmId?: string) =>
  apiRequest<FuelTank[]>(`/fuel-tanks?${qs({ companyId, farmId })}`);
export const createFuelTank = (dto: Partial<FuelTank> & { companyId: string; name: string }) =>
  apiRequest<FuelTank>(`/fuel-tanks`, { method: "POST", body: JSON.stringify(dto) });
export const updateFuelTank = (id: string, dto: Partial<FuelTank>) =>
  apiRequest<FuelTank>(`/fuel-tanks/${id}`, { method: "PATCH", body: JSON.stringify(dto) });
export const deleteFuelTank = (id: string) =>
  apiRequest<{ ok: true }>(`/fuel-tanks/${id}`, { method: "DELETE" });

// ============ Fuel Movements ============
export const listFuelMovements = (
  companyId: string,
  opts: { tankId?: string; machineId?: string; kind?: string; from?: string; to?: string } = {}
) => apiRequest<FuelMovement[]>(`/fuel-movements?${qs({ companyId, ...opts })}`);
export const createFuelMovement = (dto: Partial<FuelMovement> & { companyId: string; tankId: string; kind: string; liters: number }) =>
  apiRequest<FuelMovement>(`/fuel-movements`, { method: "POST", body: JSON.stringify(dto) });
export const deleteFuelMovement = (id: string) =>
  apiRequest<{ ok: true }>(`/fuel-movements/${id}`, { method: "DELETE" });

// ============ Inventory ============
export const listInventoryItems = (companyId: string, opts: { category?: string; lowStock?: boolean } = {}) =>
  apiRequest<InventoryItem[]>(`/inventory-items?${qs({ companyId, category: opts.category, lowStock: opts.lowStock ? "true" : undefined })}`);
export const createInventoryItem = (dto: Partial<InventoryItem> & { companyId: string; name: string }) =>
  apiRequest<InventoryItem>(`/inventory-items`, { method: "POST", body: JSON.stringify(dto) });
export const updateInventoryItem = (id: string, dto: Partial<InventoryItem>) =>
  apiRequest<InventoryItem>(`/inventory-items/${id}`, { method: "PATCH", body: JSON.stringify(dto) });
export const deleteInventoryItem = (id: string) =>
  apiRequest<{ ok: true }>(`/inventory-items/${id}`, { method: "DELETE" });

export const listInventoryMovements = (companyId: string, itemId?: string) =>
  apiRequest<InventoryMovement[]>(`/inventory-movements?${qs({ companyId, itemId })}`);
export const createInventoryMovement = (
  dto: Partial<InventoryMovement> & { companyId: string; itemId: string; kind: string; quantity: number }
) => apiRequest<InventoryMovement>(`/inventory-movements`, { method: "POST", body: JSON.stringify(dto) });

// ============ Maintenance ============
export const listMaintenanceOrders = (companyId: string, opts: { status?: string; machineId?: string } = {}) =>
  apiRequest<MaintenanceOrder[]>(`/maintenance-orders?${qs({ companyId, ...opts })}`);
export const getMaintenanceOrder = (id: string) =>
  apiRequest<MaintenanceOrder>(`/maintenance-orders/${id}`);
export const createMaintenanceOrder = (dto: Partial<MaintenanceOrder> & { companyId: string; description: string }) =>
  apiRequest<MaintenanceOrder>(`/maintenance-orders`, { method: "POST", body: JSON.stringify(dto) });
export const updateMaintenanceOrder = (id: string, dto: Partial<MaintenanceOrder>) =>
  apiRequest<MaintenanceOrder>(`/maintenance-orders/${id}`, { method: "PATCH", body: JSON.stringify(dto) });
export const deleteMaintenanceOrder = (id: string) =>
  apiRequest<{ ok: true }>(`/maintenance-orders/${id}`, { method: "DELETE" });
export const addMaintenanceItem = (
  orderId: string,
  dto: { inventoryItemId?: string; kind?: string; description: string; quantity: number; unitCost?: number; totalCost?: number; consumeStock?: boolean }
) => apiRequest<MaintenanceOrderItem>(`/maintenance-orders/${orderId}/items`, { method: "POST", body: JSON.stringify(dto) });
export const removeMaintenanceItem = (orderId: string, itemId: string) =>
  apiRequest<{ ok: true }>(`/maintenance-orders/${orderId}/items/${itemId}`, { method: "DELETE" });

// ============ Operation Logs ============
export const listOperationLogs = (
  companyId: string,
  opts: { machineId?: string; operatorId?: string; farmId?: string; from?: string; to?: string } = {}
) => apiRequest<OperationLog[]>(`/operation-logs?${qs({ companyId, ...opts })}`);
export const createOperationLog = (
  dto: Partial<OperationLog> & { companyId: string; machineId: string; startedAt: string }
) => apiRequest<OperationLog>(`/operation-logs`, { method: "POST", body: JSON.stringify(dto) });
export const updateOperationLog = (id: string, dto: Partial<OperationLog>) =>
  apiRequest<OperationLog>(`/operation-logs/${id}`, { method: "PATCH", body: JSON.stringify(dto) });
export const deleteOperationLog = (id: string) =>
  apiRequest<{ ok: true }>(`/operation-logs/${id}`, { method: "DELETE" });

// ============ Checklists ============
export const listChecklists = (companyId: string, machineId?: string) =>
  apiRequest<MachineChecklist[]>(`/machine-checklists?${qs({ companyId, machineId })}`);
export const createChecklist = (
  dto: { companyId: string; machineId: string; operatorId?: string; kind?: string; performedAt?: string; hourmeter?: number; items: MachineChecklistItem[]; overallStatus?: string; notes?: string; photoUrl?: string }
) => apiRequest<MachineChecklist>(`/machine-checklists`, { method: "POST", body: JSON.stringify(dto) });
export const deleteChecklist = (id: string) =>
  apiRequest<{ ok: true }>(`/machine-checklists/${id}`, { method: "DELETE" });

// ============ Overview ============
export const opsOverview = (companyId: string) =>
  apiRequest<OpsOverview>(`/fleet/ops-overview?${qs({ companyId })}`);
