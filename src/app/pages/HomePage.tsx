import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function HomePage() {
  return (
    <main
      data-testid="home-placeholder"
      className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-6 py-16"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary">
          Phase 1 · scaffold
        </span>
        <h1 className="text-3xl font-medium">KMO Digipres Admin</h1>
        <p className="text-muted-foreground">
          Internal admin UI for the kmo-digipres-be CRM backend. Authentication,
          contacts, companies, deals, activities, and email come online in
          subsequent phases.
        </p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>What works right now</CardTitle>
          <CardDescription>
            Vite + React + TypeScript + Tailwind + shadcn-style primitives,
            wired into React Router and TanStack Query. No backend calls yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="default">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
        </CardContent>
      </Card>
    </main>
  );
}
