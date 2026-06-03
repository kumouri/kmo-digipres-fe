import { useMemo } from "react";

import * as teamApi from "../api/team";
import { useCrmClient } from "../provider/CrmProvider";
import type { TeamMemberRequest } from "../types/api";

export function useTeamApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      listTeam: () => teamApi.listTeam(client),
      // No GET /team/{id} on the backend — resolve a single member from the
      // list so detail pages stay simple.
      getTeamMember: async (id: string) =>
        (await teamApi.listTeam(client)).find((m) => m.id === id),
      createTeamMember: (body: TeamMemberRequest) =>
        teamApi.createTeamMember(client, body),
      updateTeamMember: (id: string, body: TeamMemberRequest) =>
        teamApi.updateTeamMember(client, id, body),
      disableTeamMember: (id: string) => teamApi.disableTeamMember(client, id),
    }),
    [client],
  );
}
