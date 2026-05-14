import { api } from "./client";
import type { SingleEmailCommunicationDTO } from "@/types/api";

export function sendSingleEmail(body: SingleEmailCommunicationDTO): Promise<boolean> {
  return api<boolean>("/communication/singleEmail", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
