import type { ActivityDTO } from "../types/api";
import type { CrmClient } from "./client";

export function listActivities(client: CrmClient): Promise<ActivityDTO[]> {
  return client.api<ActivityDTO[]>("/activities");
}

export function getActivity(client: CrmClient, id: string): Promise<ActivityDTO> {
  return client.api<ActivityDTO>(`/activities/${id}`);
}

export function createActivity(
  client: CrmClient,
  body: ActivityDTO,
): Promise<ActivityDTO> {
  return client.api<ActivityDTO>("/activities", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateActivity(
  client: CrmClient,
  id: string,
  body: ActivityDTO,
): Promise<ActivityDTO> {
  return client.api<ActivityDTO>(`/activities/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteActivity(client: CrmClient, id: string): Promise<void> {
  return client.api<void>(`/activities/${id}`, { method: "DELETE" });
}
