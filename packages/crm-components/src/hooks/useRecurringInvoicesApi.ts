import { useMemo } from "react";
import * as recurringInvoicesApi from "../api/recurring-invoices";
import { useCrmClient } from "../provider/CrmProvider";
import type { RecurringInvoice } from "../types/api";

export function useRecurringInvoicesApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      listRecurringInvoices: () => recurringInvoicesApi.listRecurringInvoices(client),
      getRecurringInvoice: (id: string) =>
        recurringInvoicesApi.getRecurringInvoice(client, id),
      createRecurringInvoice: (body: RecurringInvoice) =>
        recurringInvoicesApi.createRecurringInvoice(client, body),
      updateRecurringInvoice: (id: string, body: RecurringInvoice) =>
        recurringInvoicesApi.updateRecurringInvoice(client, id, body),
      deleteRecurringInvoice: (id: string) =>
        recurringInvoicesApi.deleteRecurringInvoice(client, id),
      setRecurringInvoiceStatus: (id: string, status: string) =>
        recurringInvoicesApi.setRecurringInvoiceStatus(client, id, status),
      spawnNow: (id: string) => recurringInvoicesApi.spawnNow(client, id),
    }),
    [client],
  );
}
