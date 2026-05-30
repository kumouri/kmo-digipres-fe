import { useMemo } from "react";
import * as contractsApi from "../api/contracts";
import { useCrmClient } from "../provider/CrmProvider";
import type { Contract } from "../types/api";

export function useContractsApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      listContracts: () => contractsApi.listContracts(client),
      getContract: (id: string) => contractsApi.getContract(client, id),
      createContract: (body: Contract) => contractsApi.createContract(client, body),
      updateContract: (id: string, body: Contract) =>
        contractsApi.updateContract(client, id, body),
      deleteContract: (id: string) => contractsApi.deleteContract(client, id),
      setContractStatus: (id: string, target: string) =>
        contractsApi.setContractStatus(client, id, target),
      sendContract: (id: string) => contractsApi.sendContract(client, id),
      getContractPdfUrl: (id: string) => contractsApi.getContractPdfUrl(client, id),
      spawnContractFromQuote: (quoteId: string) =>
        contractsApi.spawnContractFromQuote(client, quoteId),
    }),
    [client],
  );
}
