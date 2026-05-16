import { useMemo } from "react";
import * as reportsApi from "../api/reports";
import { useCrmClient } from "../provider/CrmProvider";
import type { SavedReport, Dashboard } from "../types/api";

export function useReportsApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      // Saved Reports
      listSavedReports: () => reportsApi.listSavedReports(client),
      getSavedReport: (id: string) => reportsApi.getSavedReport(client, id),
      createSavedReport: (body: SavedReport) => reportsApi.createSavedReport(client, body),
      updateSavedReport: (id: string, body: SavedReport) =>
        reportsApi.updateSavedReport(client, id, body),
      deleteSavedReport: (id: string) => reportsApi.deleteSavedReport(client, id),
      runSavedReport: (id: string) => reportsApi.runSavedReport(client, id),
      // Dashboards
      listDashboards: () => reportsApi.listDashboards(client),
      getDashboard: (id: string) => reportsApi.getDashboard(client, id),
      createDashboard: (body: Dashboard) => reportsApi.createDashboard(client, body),
      updateDashboard: (id: string, body: Dashboard) =>
        reportsApi.updateDashboard(client, id, body),
      deleteDashboard: (id: string) => reportsApi.deleteDashboard(client, id),
    }),
    [client],
  );
}
