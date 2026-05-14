import type { ActivityDTO, ContactDTO } from "../types/api";
import type { CrmClient } from "./client";

export function listContacts(client: CrmClient): Promise<ContactDTO[]> {
  return client.api<ContactDTO[]>("/contacts");
}

export function getContact(client: CrmClient, id: string): Promise<ContactDTO> {
  return client.api<ContactDTO>(`/contacts/${id}`);
}

export function createContact(client: CrmClient, body: ContactDTO): Promise<ContactDTO> {
  return client.api<ContactDTO>("/contacts", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateContact(
  client: CrmClient,
  id: string,
  body: ContactDTO,
): Promise<ContactDTO> {
  return client.api<ContactDTO>(`/contacts/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteContact(client: CrmClient, id: string): Promise<void> {
  return client.api<void>(`/contacts/${id}`, { method: "DELETE" });
}

export function getContactTimeline(client: CrmClient, id: string): Promise<ActivityDTO[]> {
  return client.api<ActivityDTO[]>(`/contacts/${id}/timeline`);
}
