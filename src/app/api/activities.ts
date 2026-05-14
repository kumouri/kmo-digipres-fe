import { api } from "./client";
import type { ActivityDTO } from "@/types/api";

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
