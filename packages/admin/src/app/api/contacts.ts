import { api } from "./client";
import type { ActivityDTO, ContactDTO } from "@kmosf/crm-components";

export function listContacts(): Promise<ContactDTO[]> {
  return api<ContactDTO[]>("/contacts");
}

export function getContact(id: string): Promise<ContactDTO> {
  return api<ContactDTO>(`/contacts/${id}`);
}

export function createContact(body: ContactDTO): Promise<ContactDTO> {
  return api<ContactDTO>("/contacts", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateContact(id: string, body: ContactDTO): Promise<ContactDTO> {
  return api<ContactDTO>(`/contacts/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteContact(id: string): Promise<void> {
  return api<void>(`/contacts/${id}`, { method: "DELETE" });
}

export function getContactTimeline(id: string): Promise<ActivityDTO[]> {
  return api<ActivityDTO[]>(`/contacts/${id}/timeline`);
}
