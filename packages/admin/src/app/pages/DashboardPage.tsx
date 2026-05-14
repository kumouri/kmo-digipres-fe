import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kmosf/crm-components";
import { useAuth } from "@/auth/useAuth";

export function DashboardPage() {
  const { user, roles } = useAuth();

  return (
    <section data-testid="dashboard" className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium">
          Welcome{user ? `, ${user.displayName}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          Phase 2 · auth shell · Contacts, Companies, Deals, and Activities
          come online in subsequent phases.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Signed in as</CardTitle>
            <CardDescription>From <code>GET /auth/me</code></CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <div>
              <span className="text-muted-foreground">Email:</span> {user?.email}
            </div>
            <div>
              <span className="text-muted-foreground">Roles:</span>{" "}
              {roles.length ? roles.join(", ") : "—"}
            </div>
            <div className="truncate">
              <span className="text-muted-foreground">Tenant:</span>{" "}
              <code className="text-xs">{user?.tenantId}</code>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
