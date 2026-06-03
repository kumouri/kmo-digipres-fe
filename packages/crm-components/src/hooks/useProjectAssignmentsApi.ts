import { useMemo } from "react";

import * as assignmentsApi from "../api/project-assignments";
import type { AssignmentInput } from "../api/project-assignments";
import { useCrmClient } from "../provider/CrmProvider";

export function useProjectAssignmentsApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      listAssignments: (projectId: string) =>
        assignmentsApi.listAssignments(client, projectId),
      createAssignment: (projectId: string, body: AssignmentInput) =>
        assignmentsApi.createAssignment(client, projectId, body),
      updateAssignment: (projectId: string, id: string, body: AssignmentInput) =>
        assignmentsApi.updateAssignment(client, projectId, id, body),
      deleteAssignment: (projectId: string, id: string) =>
        assignmentsApi.deleteAssignment(client, projectId, id),
    }),
    [client],
  );
}
