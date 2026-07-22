import { apiRequest } from "@/lib/api";

export type TeamMember = {
  id: string;
  userId: string;
  roleLabel: string | null;
  user: { id: string; email: string; fullName: string | null };
};

export type Team = {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  active: boolean;
  members: TeamMember[];
};

export function listTeams(companyId: string) {
  return apiRequest<Team[]>(`/teams?companyId=${encodeURIComponent(companyId)}`);
}

export function createTeam(input: { companyId: string; name: string; description?: string }) {
  return apiRequest<Team>(`/teams`, { method: "POST", body: JSON.stringify(input) });
}

export function updateTeam(id: string, input: { name?: string; description?: string; active?: boolean }) {
  return apiRequest<Team>(`/teams/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteTeam(id: string) {
  return apiRequest(`/teams/${id}`, { method: "DELETE" });
}

export function addTeamMember(teamId: string, userId: string, roleLabel?: string) {
  return apiRequest(`/teams/${teamId}/members`, {
    method: "POST",
    body: JSON.stringify({ userId, roleLabel }),
  });
}

export function removeTeamMember(teamId: string, userId: string) {
  return apiRequest(`/teams/${teamId}/members/${userId}`, { method: "DELETE" });
}
