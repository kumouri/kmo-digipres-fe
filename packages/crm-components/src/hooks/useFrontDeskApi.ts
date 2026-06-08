import { useMemo } from "react";

import * as frontDeskApi from "../api/frontdesk";
import { useCrmClient } from "../provider/CrmProvider";
import type { Appointment, PasteInReviewRequest } from "../types/api";

/**
 * TanStack-Query-friendly wrappers over the hand-written FrontDesk IQ client
 * (the FD-5b flagship surfaces — the risk-sorted day view, the recall board, the
 * callback inbox, the HIPAA-safe review inbox, and the appointment console),
 * bound to the configured CrmClient via useCrmClient(). The BE routes are
 * @ConditionalOnProperty-gated, so this is a hand-written client with no
 * generated counterpart (the Real Estate RE-5b / ChairFill CF-5b / Home-Services
 * HS-4 precedent).
 */
export function useFrontDeskApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      // Risk-sorted day view
      listAppointmentsByRisk: (range?: { from?: string; to?: string }) =>
        frontDeskApi.listAppointmentsByRisk(client, range),
      retrainNoShowRisk: () => frontDeskApi.retrainNoShowRisk(client),
      // Appointment console
      listAppointments: () => frontDeskApi.listAppointments(client),
      getAppointment: (id: string) => frontDeskApi.getAppointment(client, id),
      createAppointment: (body: Appointment) =>
        frontDeskApi.createAppointment(client, body),
      updateAppointment: (id: string, body: Appointment) =>
        frontDeskApi.updateAppointment(client, id, body),
      // Recall board + callback inbox
      listRecallDue: () => frontDeskApi.listRecallDue(client),
      listCallbacks: () => frontDeskApi.listCallbacks(client),
      // Review inbox (HIPAA-safe drafts)
      draftFrontDeskReviewReply: (body: PasteInReviewRequest) =>
        frontDeskApi.draftFrontDeskReviewReply(client, body),
      listFrontDeskDraftedReplies: () =>
        frontDeskApi.listFrontDeskDraftedReplies(client),
      approveFrontDeskReply: (id: string) =>
        frontDeskApi.approveFrontDeskReply(client, id),
      skipFrontDeskReply: (id: string) =>
        frontDeskApi.skipFrontDeskReply(client, id),
    }),
    [client],
  );
}
