import type { CompanyDTO } from "../types/api";
import type { CrmClient } from "./client";

export function listCompanies(client: CrmClient): Promise<CompanyDTO[]> {
  return client.api<CompanyDTO[]>("/companies");
}

export function getCompany(client: CrmClient, id: string): Promise<CompanyDTO> {
  return client.api<CompanyDTO>(`/companies/${id}`);
}

export function createCompany(client: CrmClient, body: CompanyDTO): Promise<CompanyDTO> {
  return client.api<CompanyDTO>("/companies", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateCompany(
  client: CrmClient,
  id: string,
  body: CompanyDTO,
): Promise<CompanyDTO> {
  return client.api<CompanyDTO>(`/companies/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteCompany(client: CrmClient, id: string): Promise<void> {
  return client.api<void>(`/companies/${id}`, { method: "DELETE" });
}
