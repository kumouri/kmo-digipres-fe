import type { FieldDefinition } from "../types/api";
import type { CrmClient } from "./client";

export function listFieldDefinitions(
  client: CrmClient,
): Promise<FieldDefinition[]> {
  return client.api<FieldDefinition[]>("/admin/field-definitions");
}

export function getFieldDefinition(
  client: CrmClient,
  id: string,
): Promise<FieldDefinition> {
  return client.api<FieldDefinition>(`/admin/field-definitions/${id}`);
}

export function createFieldDefinition(
  client: CrmClient,
  body: FieldDefinition,
): Promise<FieldDefinition> {
  return client.api<FieldDefinition>("/admin/field-definitions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateFieldDefinition(
  client: CrmClient,
  id: string,
  body: FieldDefinition,
): Promise<FieldDefinition> {
  return client.api<FieldDefinition>(`/admin/field-definitions/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteFieldDefinition(
  client: CrmClient,
  id: string,
): Promise<void> {
  return client.api<void>(`/admin/field-definitions/${id}`, {
    method: "DELETE",
  });
}
