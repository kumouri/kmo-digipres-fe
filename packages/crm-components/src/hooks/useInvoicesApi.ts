import { useMemo } from "react";
import * as invoicesApi from "../api/invoices";
import { useCrmClient } from "../provider/CrmProvider";
import type { Invoice, Payment } from "../types/api";

export function useInvoicesApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      listInvoices: () => invoicesApi.listInvoices(client),
      getInvoice: (id: string) => invoicesApi.getInvoice(client, id),
      createInvoice: (body: Invoice) => invoicesApi.createInvoice(client, body),
      createInvoiceFromQuote: (quoteId: string) =>
        invoicesApi.createInvoiceFromQuote(client, quoteId),
      deleteInvoice: (id: string) => invoicesApi.deleteInvoice(client, id),
      changeInvoiceStatus: (id: string, target: string) =>
        invoicesApi.changeInvoiceStatus(client, id, target),
      listPayments: (invoiceId: string) => invoicesApi.listPayments(client, invoiceId),
      recordPayment: (invoiceId: string, body: Payment) =>
        invoicesApi.recordPayment(client, invoiceId, body),
    }),
    [client],
  );
}
