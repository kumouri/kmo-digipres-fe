import type { TeamMember, TeamMemberRequest } from "../types/api";
import type { CrmClient } from "./client";

// Team directory. All endpoints are ADMIN-gated server-side; the FE also gates
// the surfaces. There is no GET /team/{id} on the backend — TeamDetail reads a
// single member out of the list (see useTeamApi.getTeamMember).

export function listTeam(client: CrmClient): Promise<TeamMember[]> {
  return client.api<TeamMember[]>("/team");
}

export function createTeamMember(
  client: CrmClient,
  body: TeamMemberRequest,
): Promise<TeamMember> {
  return client.api<TeamMember>("/team", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateTeamMember(
  client: CrmClient,
  id: string,
  body: TeamMemberRequest,
): Promise<TeamMember> {
  return client.api<TeamMember>(`/team/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function disableTeamMember(
  client: CrmClient,
  id: string,
): Promise<TeamMember> {
  return client.api<TeamMember>(`/team/${id}/disable`, { method: "POST" });
}
