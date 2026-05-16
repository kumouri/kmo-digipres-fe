import type { Ticket, TicketComment, SlaPolicy } from "../types/api";
import type { CrmClient } from "./client";

export function listTickets(client: CrmClient): Promise<Ticket[]> {
  return client.api<Ticket[]>("/tickets");
}

export function getTicket(client: CrmClient, id: string): Promise<Ticket> {
  return client.api<Ticket>(`/tickets/${id}`);
}

export function createTicket(client: CrmClient, body: Ticket): Promise<Ticket> {
  return client.api<Ticket>("/tickets", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateTicket(
  client: CrmClient,
  id: string,
  body: Ticket,
): Promise<Ticket> {
  return client.api<Ticket>(`/tickets/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteTicket(client: CrmClient, id: string): Promise<void> {
  return client.api<void>(`/tickets/${id}`, { method: "DELETE" });
}

export function transitionTicket(
  client: CrmClient,
  id: string,
  target: string,
): Promise<Ticket> {
  return client.api<Ticket>(`/tickets/${id}/transition?target=${encodeURIComponent(target)}`, {
    method: "POST",
  });
}

export function listComments(
  client: CrmClient,
  ticketId: string,
): Promise<TicketComment[]> {
  return client.api<TicketComment[]>(`/tickets/${ticketId}/comments`);
}

export function addComment(
  client: CrmClient,
  ticketId: string,
  body: string,
): Promise<TicketComment> {
  return client.api<TicketComment>(`/tickets/${ticketId}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export type { SlaPolicy };
