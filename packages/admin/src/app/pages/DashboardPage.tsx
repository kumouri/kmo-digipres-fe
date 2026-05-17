import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kmosf/crm-components";
import { useAuth } from "@/auth/useAuth";

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <section data-testid="dashboard" className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium">
          Welcome{user ? `, ${user.displayName}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here's an overview of your workspace.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Your account</CardTitle>
            <CardDescription>The details we have on file for you.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <div>
              <span className="text-muted-foreground">Name:</span>{" "}
              {user?.displayName}
            </div>
            <div>
              <span className="text-muted-foreground">Email:</span> {user?.email}
            </div>
            {user?.tenantName ? (
              <div>
                <span className="text-muted-foreground">Business:</span>{" "}
                {user.tenantName}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
