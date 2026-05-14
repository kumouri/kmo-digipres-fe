import { useMemo } from "react";

import * as contactsApi from "../api/contacts";
import { useCrmClient } from "../provider/CrmProvider";
import type { ContactDTO } from "../types/api";

export function useContactsApi() {
  const client = useCrmClient();
  return useMemo(
    () => ({
      listContacts: () => contactsApi.listContacts(client),
      getContact: (id: string) => contactsApi.getContact(client, id),
      createContact: (body: ContactDTO) => contactsApi.createContact(client, body),
      updateContact: (id: string, body: ContactDTO) =>
        contactsApi.updateContact(client, id, body),
      deleteContact: (id: string) => contactsApi.deleteContact(client, id),
      getContactTimeline: (id: string) => contactsApi.getContactTimeline(client, id),
    }),
    [client],
  );
}
