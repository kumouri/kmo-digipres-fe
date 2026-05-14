import { useMemo } from "react";

import * as activitiesApi from "../api/activities";
import { useCrmClient } from "../provider/CrmProvider";
import type { ActivityDTO } from "../types/api";

export function useActivitiesApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      listActivities: () => activitiesApi.listActivities(client),
      getActivity: (id: string) => activitiesApi.getActivity(client, id),
      createActivity: (body: ActivityDTO) => activitiesApi.createActivity(client, body),
      updateActivity: (id: string, body: ActivityDTO) =>
        activitiesApi.updateActivity(client, id, body),
      deleteActivity: (id: string) => activitiesApi.deleteActivity(client, id),
    }),
    [client],
  );
}
