import { useMemo } from "react";
import * as ticketsApi from "../api/tickets";
import { useCrmClient } from "../provider/CrmProvider";
import type { Ticket } from "../types/api";

export function useTicketsApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      listTickets: () => ticketsApi.listTickets(client),
      getTicket: (id: string) => ticketsApi.getTicket(client, id),
      createTicket: (body: Ticket) => ticketsApi.createTicket(client, body),
      updateTicket: (id: string, body: Ticket) => ticketsApi.updateTicket(client, id, body),
      deleteTicket: (id: string) => ticketsApi.deleteTicket(client, id),
      transitionTicket: (id: string, target: string) =>
        ticketsApi.transitionTicket(client, id, target),
      listComments: (ticketId: string) => ticketsApi.listComments(client, ticketId),
      addComment: (ticketId: string, body: string) =>
        ticketsApi.addComment(client, ticketId, body),
    }),
    [client],
  );
}
