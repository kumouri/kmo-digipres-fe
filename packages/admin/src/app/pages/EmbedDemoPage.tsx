import { BookingWidget, PublicContactForm } from "@kmosf/crm-components";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1";

// Mock-mode + dev surface for the public widgets. Reachable unauthenticated
// at /embed-demo so Playwright can exercise the booking flow without a login,
// and so a copy-paste embed can be visually previewed before going on a
// client site.
export function EmbedDemoPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium">Embed demo</h1>
        <p className="text-sm text-muted-foreground">
          Standalone widgets from <code>@kmosf/crm-components</code> — no
          login, no admin shell. These are the same components a client
          website would import.
        </p>
      </header>

      <section className="flex flex-col gap-2" data-testid="booking-section">
        <h2 className="text-lg font-medium">BookingWidget</h2>
        <BookingWidget apiBaseUrl={API_BASE_URL} slug="smoke-intro-call" />
      </section>

      <section
        className="flex flex-col gap-2"
        data-testid="public-contact-form-section"
      >
        <h2 className="text-lg font-medium">PublicContactForm</h2>
        <PublicContactForm
          apiBaseUrl={API_BASE_URL}
          tenantSlug="smoke-tenant"
        />
      </section>
    </main>
  );
}
