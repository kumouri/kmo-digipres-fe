import { useMemo } from "react";
import * as contractTemplatesApi from "../api/contract-templates";
import { useCrmClient } from "../provider/CrmProvider";
import type { ContractTemplate } from "../types/api";

export function useContractTemplatesApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      listContractTemplates: () =>
        contractTemplatesApi.listContractTemplates(client),
      getContractTemplate: (id: string) =>
        contractTemplatesApi.getContractTemplate(client, id),
      createContractTemplate: (body: ContractTemplate) =>
        contractTemplatesApi.createContractTemplate(client, body),
      updateContractTemplate: (id: string, body: ContractTemplate) =>
        contractTemplatesApi.updateContractTemplate(client, id, body),
      deleteContractTemplate: (id: string) =>
        contractTemplatesApi.deleteContractTemplate(client, id),
    }),
    [client],
  );
}
