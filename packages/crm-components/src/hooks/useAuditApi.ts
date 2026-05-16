import { useMemo } from "react";
import * as auditApi from "../api/audit";
import { useCrmClient } from "../provider/CrmProvider";
import type { AuditListParams, AuditByActorParams } from "../api/audit";

export function useAuditApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      listAuditEvents: (params: AuditListParams) =>
        auditApi.listAuditEvents(client, params),
      listAuditByActor: (userId: string, params?: AuditByActorParams) =>
        auditApi.listAuditByActor(client, userId, params),
    }),
    [client],
  );
}
