import { createContext, useContext, type ReactNode } from "react";

import type { CrmClient } from "../api/client";

const CrmClientContext = createContext<CrmClient | null>(null);

export interface CrmProviderProps {
  client: CrmClient;
  children: ReactNode;
}

export function CrmProvider({ client, children }: CrmProviderProps) {
  return <CrmClientContext.Provider value={client}>{children}</CrmClientContext.Provider>;
}

export function useCrmClient(): CrmClient {
  const client = useContext(CrmClientContext);
  if (!client) {
    throw new Error("useCrmClient must be used inside a <CrmProvider>");
  }
  return client;
}
