import { useMemo } from "react";

import * as contractorApi from "../api/contractor";
import { useCrmClient } from "../provider/CrmProvider";
import type { TimeEntry, Expense } from "../types/api";

// TanStack-friendly wrappers over the `/me/contractor/**` fetchers, bound to
// the configured CrmClient. Used by the shared My Projects / My Timesheet /
// My Expenses surfaces when the signed-in user is a scoped-down contractor.
export function useContractorApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      // Projects (scoped to the contractor's assignments)
      listProjects: () => contractorApi.listContractorProjects(client),
      getProject: (id: string) => contractorApi.getContractorProject(client, id),
      listProjectTasks: (id: string) =>
        contractorApi.listContractorProjectTasks(client, id),
      getProjectClient: (id: string) =>
        contractorApi.getContractorProjectClient(client, id),
      // Time (own entries)
      listTime: () => contractorApi.listContractorTime(client),
      listWeeklyTime: (from: string, to: string) =>
        contractorApi.listContractorWeeklyTime(client, from, to),
      // The contractor surface has no dedicated timer/running poll — derive the
      // running entry (open = has startedAt, no endedAt) from the own-time list.
      // Coerce to null because TanStack Query forbids `undefined` query data.
      getRunningTime: () =>
        contractorApi
          .listContractorTime(client)
          .then((entries) => entries.find((e) => e.startedAt && !e.endedAt) ?? null)
          .catch(() => null),
      logTime: (body: TimeEntry) =>
        contractorApi.logContractorTime(client, body),
      updateTime: (id: string, body: TimeEntry) =>
        contractorApi.updateContractorTime(client, id, body),
      startTimer: (body: TimeEntry) =>
        contractorApi.startContractorTimer(client, body),
      stopTimer: (endedAt?: string, zoneId?: string) =>
        contractorApi.stopContractorTimer(client, endedAt, zoneId),
      // Expenses (own submissions)
      listExpenses: () => contractorApi.listContractorExpenses(client),
      submitExpense: (body: Expense) =>
        contractorApi.submitContractorExpense(client, body),
    }),
    [client],
  );
}
