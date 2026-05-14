import { useMemo } from "react";

import * as communicationApi from "../api/communication";
import { useCrmClient } from "../provider/CrmProvider";
import type { SingleEmailCommunicationDTO } from "../types/api";

export function useCommunicationApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      sendSingleEmail: (body: SingleEmailCommunicationDTO) =>
        communicationApi.sendSingleEmail(client, body),
    }),
    [client],
  );
}
