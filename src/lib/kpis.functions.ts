import { apiRequest } from "@/lib/api";

export type Kpis = {
  totals: {
    totalDryKg: number;
    totalDeliveries: number;
    totalTappingDays: number;
    drcAvgPercent: number;
    totalAreaHa: number;
    productivityKgHa: number;
  };
  monthly: { mes: string; kgSecos: number; entregas: number }[];
  sangradores: {
    name: string;
    liters: number;
    days: number;
    adherenceAvg: number | null;
  }[];
};

export function getKpis(companyId: string) {
  return apiRequest<Kpis>(`/kpis?companyId=${encodeURIComponent(companyId)}`);
}
