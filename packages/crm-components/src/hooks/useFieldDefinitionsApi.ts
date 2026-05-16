import { useMemo } from "react";
import * as fdApi from "../api/field-definitions";
import { useCrmClient } from "../provider/CrmProvider";
import type { FieldDefinition } from "../types/api";

export function useFieldDefinitionsApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      listFieldDefinitions: () => fdApi.listFieldDefinitions(client),
      getFieldDefinition: (id: string) => fdApi.getFieldDefinition(client, id),
      createFieldDefinition: (body: FieldDefinition) =>
        fdApi.createFieldDefinition(client, body),
      updateFieldDefinition: (id: string, body: FieldDefinition) =>
        fdApi.updateFieldDefinition(client, id, body),
      deleteFieldDefinition: (id: string) => fdApi.deleteFieldDefinition(client, id),
    }),
    [client],
  );
}
