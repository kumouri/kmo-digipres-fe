import type { CrmClient } from "./client";
import type { AuditEventDTO } from "../types/api";

export interface AuditListParams {
  entityType: string;
  entityId: string;
  from?: string;
  to?: string;
  limit?: number;
}

export interface AuditByActorParams {
  from?: string;
  to?: string;
  limit?: number;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return q ? `?${q}` : "";
}

export function listAuditEvents(
  client: CrmClient,
  params: AuditListParams,
): Promise<AuditEventDTO[]> {
  const qs = buildQuery({
    entityType: params.entityType,
    entityId: params.entityId,
    from: params.from,
    to: params.to,
    limit: params.limit,
  });
  return client.api<AuditEventDTO[]>(`/audit${qs}`);
}

export function listAuditByActor(
  client: CrmClient,
  userId: string,
  params?: AuditByActorParams,
): Promise<AuditEventDTO[]> {
  const qs = buildQuery({
    from: params?.from,
    to: params?.to,
    limit: params?.limit,
  });
  return client.api<AuditEventDTO[]>(`/audit/by-actor/${userId}${qs}`);
}
