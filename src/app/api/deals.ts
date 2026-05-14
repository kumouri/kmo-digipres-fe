import { api } from "./client";
import type { DealDTO, MoveStageRequest } from "@/types/api";

export function listDeals(): Promise<DealDTO[]> {
  return api<DealDTO[]>("/deals");
}

export function getDeal(id: string): Promise<DealDTO> {
  return api<DealDTO>(`/deals/${id}`);
}

export function createDeal(body: DealDTO): Promise<DealDTO> {
  return api<DealDTO>("/deals", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateDeal(id: string, body: DealDTO): Promise<DealDTO> {
  return api<DealDTO>(`/deals/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteDeal(id: string): Promise<void> {
  return api<void>(`/deals/${id}`, { method: "DELETE" });
}

export function moveDealStage(id: string, body: MoveStageRequest): Promise<DealDTO> {
  return api<DealDTO>(`/deals/${id}/move`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
