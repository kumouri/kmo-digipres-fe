import type { DealDTO, MoveStageRequest } from "../types/api";
import type { CrmClient } from "./client";

export function listDeals(client: CrmClient): Promise<DealDTO[]> {
  return client.api<DealDTO[]>("/deals");
}

export function getDeal(client: CrmClient, id: string): Promise<DealDTO> {
  return client.api<DealDTO>(`/deals/${id}`);
}

export function createDeal(client: CrmClient, body: DealDTO): Promise<DealDTO> {
  return client.api<DealDTO>("/deals", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateDeal(
  client: CrmClient,
  id: string,
  body: DealDTO,
): Promise<DealDTO> {
  return client.api<DealDTO>(`/deals/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteDeal(client: CrmClient, id: string): Promise<void> {
  return client.api<void>(`/deals/${id}`, { method: "DELETE" });
}

export function moveDealStage(
  client: CrmClient,
  id: string,
  body: MoveStageRequest,
): Promise<DealDTO> {
  return client.api<DealDTO>(`/deals/${id}/move`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
