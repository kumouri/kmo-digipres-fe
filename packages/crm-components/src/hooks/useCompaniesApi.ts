import { useMemo } from "react";

import * as companiesApi from "../api/companies";
import { useCrmClient } from "../provider/CrmProvider";
import type { CompanyDTO } from "../types/api";

export function useCompaniesApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      listCompanies: () => companiesApi.listCompanies(client),
      getCompany: (id: string) => companiesApi.getCompany(client, id),
      createCompany: (body: CompanyDTO) => companiesApi.createCompany(client, body),
      updateCompany: (id: string, body: CompanyDTO) =>
        companiesApi.updateCompany(client, id, body),
      deleteCompany: (id: string) => companiesApi.deleteCompany(client, id),
    }),
    [client],
  );
}
