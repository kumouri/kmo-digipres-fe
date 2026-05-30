import type { ContractTemplate } from "../types/api";
import type { CrmClient } from "./client";

export function listContractTemplates(client: CrmClient): Promise<ContractTemplate[]> {
  return client.api<ContractTemplate[]>("/contract-templates");
}

export function getContractTemplate(
  client: CrmClient,
  id: string,
): Promise<ContractTemplate> {
  return client.api<ContractTemplate>(`/contract-templates/${id}`);
}

export function createContractTemplate(
  client: CrmClient,
  body: ContractTemplate,
): Promise<ContractTemplate> {
  return client.api<ContractTemplate>("/contract-templates", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateContractTemplate(
  client: CrmClient,
  id: string,
  body: ContractTemplate,
): Promise<ContractTemplate> {
  return client.api<ContractTemplate>(`/contract-templates/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteContractTemplate(client: CrmClient, id: string): Promise<void> {
  return client.api<void>(`/contract-templates/${id}`, { method: "DELETE" });
}
