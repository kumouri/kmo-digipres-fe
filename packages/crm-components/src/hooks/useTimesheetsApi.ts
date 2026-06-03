import { useMemo } from "react";

import * as timesheetsApi from "../api/timesheets";
import { useCrmClient } from "../provider/CrmProvider";
import type { TimesheetStatus } from "../types/api";

// TanStack-friendly wrappers over the admin /timesheets fetchers, bound to the
// configured CrmClient. Used by the admin Timesheets approvals page.
export function useTimesheetsApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      listByStatus: (status?: TimesheetStatus) =>
        timesheetsApi.listTimesheetsByStatus(client, status),
      get: (id: string) => timesheetsApi.getTimesheet(client, id),
      approve: (id: string) => timesheetsApi.approveTimesheet(client, id),
      reject: (id: string, reason: string) =>
        timesheetsApi.rejectTimesheet(client, id, reason),
    }),
    [client],
  );
}
