import type { CrmClient } from "./client";
import type { SavedReport, Dashboard } from "../types/api";

// Saved Reports

export function listSavedReports(client: CrmClient): Promise<SavedReport[]> {
  return client.api<SavedReport[]>("/reports/saved");
}

export function getSavedReport(client: CrmClient, id: string): Promise<SavedReport> {
  return client.api<SavedReport>(`/reports/saved/${id}`);
}

export function createSavedReport(client: CrmClient, body: SavedReport): Promise<SavedReport> {
  return client.api<SavedReport>("/reports/saved", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateSavedReport(
  client: CrmClient,
  id: string,
  body: SavedReport,
): Promise<SavedReport> {
  return client.api<SavedReport>(`/reports/saved/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteSavedReport(client: CrmClient, id: string): Promise<void> {
  return client.api<void>(`/reports/saved/${id}`, { method: "DELETE" });
}

export function runSavedReport(
  client: CrmClient,
  id: string,
): Promise<Record<string, unknown>[]> {
  return client.api<Record<string, unknown>[]>(`/reports/saved/${id}/run`, {
    method: "POST",
  });
}

// Dashboards

export function listDashboards(client: CrmClient): Promise<Dashboard[]> {
  return client.api<Dashboard[]>("/reports/dashboards");
}

export function getDashboard(client: CrmClient, id: string): Promise<Dashboard> {
  return client.api<Dashboard>(`/reports/dashboards/${id}`);
}

export function createDashboard(client: CrmClient, body: Dashboard): Promise<Dashboard> {
  return client.api<Dashboard>("/reports/dashboards", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateDashboard(
  client: CrmClient,
  id: string,
  body: Dashboard,
): Promise<Dashboard> {
  return client.api<Dashboard>(`/reports/dashboards/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteDashboard(client: CrmClient, id: string): Promise<void> {
  return client.api<void>(`/reports/dashboards/${id}`, { method: "DELETE" });
}
