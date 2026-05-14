import { api } from "./client";
import type { CompanyDTO } from "@/types/api";

export function listCompanies(): Promise<CompanyDTO[]> {
  return api<CompanyDTO[]>("/companies");
}

export function getCompany(id: string): Promise<CompanyDTO> {
  return api<CompanyDTO>(`/companies/${id}`);
}

export function createCompany(body: CompanyDTO): Promise<CompanyDTO> {
  return api<CompanyDTO>("/companies", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateCompany(id: string, body: CompanyDTO): Promise<CompanyDTO> {
  return api<CompanyDTO>(`/companies/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteCompany(id: string): Promise<void> {
  return api<void>(`/companies/${id}`, { method: "DELETE" });
}
