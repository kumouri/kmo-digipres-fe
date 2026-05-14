import { ContactDetail as ContactDetailView } from "@kmosf/crm-components";

import { useAuth } from "@/auth/useAuth";

// Thin admin wrapper that injects the current staff user's email as the
// default "from" address on the email composer inside the library view.
export function ContactDetail() {
  const { user } = useAuth();
  return <ContactDetailView senderEmail={user?.email} />;
}
