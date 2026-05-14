import type { SingleEmailCommunicationDTO } from "../types/api";
import type { CrmClient } from "./client";

export function sendSingleEmail(
  client: CrmClient,
  body: SingleEmailCommunicationDTO,
): Promise<boolean> {
  return client.api<boolean>("/communication/singleEmail", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
