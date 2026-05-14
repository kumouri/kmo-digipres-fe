import { api } from "./client";
import type { ActivityDTO } from "@kmosf/crm-components";

export function listActivities(): Promise<ActivityDTO[]> {
  return api<ActivityDTO[]>("/activities");
}

export function getActivity(id: string): Promise<ActivityDTO> {
  return api<ActivityDTO>(`/activities/${id}`);
}

export function createActivity(body: ActivityDTO): Promise<ActivityDTO> {
  return api<ActivityDTO>("/activities", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateActivity(id: string, body: ActivityDTO): Promise<ActivityDTO> {
  return api<ActivityDTO>(`/activities/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteActivity(id: string): Promise<void> {
  return api<void>(`/activities/${id}`, { method: "DELETE" });
}
