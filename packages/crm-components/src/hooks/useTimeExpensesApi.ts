import { useMemo } from "react";
import * as timeExpensesApi from "../api/time-and-expenses";
import { useCrmClient } from "../provider/CrmProvider";
import type { TimeEntry, Expense } from "../types/api";
import type { components } from "../types/openapi";

type InvoiceFromTimeRequest = components["schemas"]["InvoiceFromTimeRequest"];
type InvoiceFromExpensesRequest = components["schemas"]["InvoiceFromExpensesRequest"];
type Attachment = components["schemas"]["Attachment"];
type PresignRequest = components["schemas"]["PresignRequest"];

export function useTimeExpensesApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      // Time entries
      listTimeEntries: () => timeExpensesApi.listTimeEntries(client),
      listTimeEntriesByUser: (userId: string) =>
        timeExpensesApi.listTimeEntriesByUser(client, userId),
      listWeeklyTimeEntries: (userId: string, from: string, to: string) =>
        timeExpensesApi.listWeeklyTimeEntries(client, userId, from, to),
      getTimeEntry: (id: string) => timeExpensesApi.getTimeEntry(client, id),
      createTimeEntry: (body: TimeEntry) =>
        timeExpensesApi.createTimeEntry(client, body),
      updateTimeEntry: (id: string, body: TimeEntry) =>
        timeExpensesApi.updateTimeEntry(client, id, body),
      deleteTimeEntry: (id: string) =>
        timeExpensesApi.deleteTimeEntry(client, id),
      // Timer
      startTimer: (body: TimeEntry) =>
        timeExpensesApi.startTimer(client, body),
      stopTimer: (userId: string, endedAt?: string, zoneId?: string) =>
        timeExpensesApi.stopTimer(client, userId, endedAt, zoneId),
      getRunningTimer: (userId: string) =>
        timeExpensesApi.getRunningTimer(client, userId),
      // Invoice from time
      createInvoiceFromTime: (req: InvoiceFromTimeRequest) =>
        timeExpensesApi.createInvoiceFromTime(client, req),
      // Expenses
      listExpenses: () => timeExpensesApi.listExpenses(client),
      getExpense: (id: string) => timeExpensesApi.getExpense(client, id),
      createExpense: (body: Expense) =>
        timeExpensesApi.createExpense(client, body),
      updateExpense: (id: string, body: Expense) =>
        timeExpensesApi.updateExpense(client, id, body),
      deleteExpense: (id: string) => timeExpensesApi.deleteExpense(client, id),
      approveExpense: (id: string) =>
        timeExpensesApi.approveExpense(client, id),
      rejectExpense: (id: string, reason: string) =>
        timeExpensesApi.rejectExpense(client, id, reason),
      // Invoice from expenses
      createInvoiceFromExpenses: (req: InvoiceFromExpensesRequest) =>
        timeExpensesApi.createInvoiceFromExpenses(client, req),
      // Receipt attachment (reuses /attachments endpoints)
      presignReceipt: (req: PresignRequest) =>
        timeExpensesApi.presignReceipt(client, req),
      registerReceipt: (attachment: Attachment) =>
        timeExpensesApi.registerReceipt(client, attachment),
      listReceipts: (expenseId: string) =>
        timeExpensesApi.listReceipts(client, expenseId),
    }),
    [client],
  );
}
