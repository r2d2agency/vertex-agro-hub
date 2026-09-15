import { apiRequest } from "@/lib/api";

export type CompanySettings = {
  companyId: string;
  timezone: string;
  unitWeight: string;
  unitVolume: string;
  currency: string;
  photoRetentionDays: number;
  requireGeolocation: boolean;
  extra?: any;
  updatedAt: string;
};

export const getSettings = (companyId: string) =>
  apiRequest<CompanySettings>(`/settings?companyId=${companyId}`);
export const updateSettings = (companyId: string, dto: Partial<CompanySettings>) =>
  apiRequest<CompanySettings>(`/settings?companyId=${companyId}`, {
    method: "PATCH", body: JSON.stringify(dto),
  });
