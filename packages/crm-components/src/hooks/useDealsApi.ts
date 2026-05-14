import { useMemo } from "react";

import * as dealsApi from "../api/deals";
import { useCrmClient } from "../provider/CrmProvider";
import type { DealDTO, MoveStageRequest } from "../types/api";

export function useDealsApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      listDeals: () => dealsApi.listDeals(client),
      getDeal: (id: string) => dealsApi.getDeal(client, id),
      createDeal: (body: DealDTO) => dealsApi.createDeal(client, body),
      updateDeal: (id: string, body: DealDTO) => dealsApi.updateDeal(client, id, body),
      deleteDeal: (id: string) => dealsApi.deleteDeal(client, id),
      moveDealStage: (id: string, body: MoveStageRequest) =>
        dealsApi.moveDealStage(client, id, body),
    }),
    [client],
  );
}
