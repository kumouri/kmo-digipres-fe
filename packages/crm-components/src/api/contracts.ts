import type { Contract } from "../types/api";
import type { CrmClient } from "./client";

export function listContracts(client: CrmClient): Promise<Contract[]> {
  return client.api<Contract[]>("/contracts");
}

export function getContract(client: CrmClient, id: string): Promise<Contract> {
  return client.api<Contract>(`/contracts/${id}`);
}

export function createContract(client: CrmClient, body: Contract): Promise<Contract> {
  return client.api<Contract>("/contracts", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateContract(
  client: CrmClient,
  id: string,
  body: Contract,
): Promise<Contract> {
  return client.api<Contract>(`/contracts/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteContract(client: CrmClient, id: string): Promise<void> {
  return client.api<void>(`/contracts/${id}`, { method: "DELETE" });
}

export function setContractStatus(
  client: CrmClient,
  id: string,
  target: string,
): Promise<Contract> {
  return client.api<Contract>(
    `/contracts/${id}/status?target=${encodeURIComponent(target)}`,
    { method: "POST" },
  );
}

export function sendContract(client: CrmClient, id: string): Promise<Contract> {
  return client.api<Contract>(`/contracts/${id}/send`, { method: "POST" });
}

/** Returns the URL for the contract PDF (opened in a new tab by the caller). */
export function getContractPdfUrl(_client: CrmClient, id: string): string {
  return `/api/v1/contracts/${id}/pdf`;
}

export function spawnContractFromQuote(
  client: CrmClient,
  quoteId: string,
): Promise<Contract> {
  return client.api<Contract>(`/contracts/quotes/${quoteId}/spawn-contract`, {
    method: "POST",
  });
}
