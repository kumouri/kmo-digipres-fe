import { api } from "./client";
import type { SingleEmailCommunicationDTO } from "@kmosf/crm-components";

export function sendSingleEmail(body: SingleEmailCommunicationDTO): Promise<boolean> {
  return api<boolean>("/communication/singleEmail", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
