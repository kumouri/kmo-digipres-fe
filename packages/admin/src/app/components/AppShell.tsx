import { useState } from "react";
import { NavLink, Outlet } from "react-router";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart2,
  BookOpen,
  Building2,
  ClipboardList,
  Clock,
  FileText,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  Menu,
  Receipt,
  ReceiptText,
  Settings2,
  Target,
  TicketIcon,
  Users,
} from "lucide-react";

import { UserMenu } from "./UserMenu";
import { ThemeToggle } from "./ThemeToggle";
import {
  cn,
  AskAiDialog,
  TimerWidget,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@kmosf/crm-components";
import { useAuth } from "../auth/useAuth";
import { isAdmin } from "../auth/roles";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/companies", label: "Companies", icon: Building2 },
  { to: "/deals", label: "Deals", icon: Target },
  { to: "/activities", label: "Activities", icon: Activity },
  { to: "/quotes", label: "Quotes", icon: FileText },
  { to: "/invoices", label: "Invoices", icon: Receipt },
  { to: "/tickets", label: "Tickets", icon: TicketIcon },
  { to: "/knowledge-base", label: "Knowledge Base", icon: BookOpen },
  { to: "/inbox", label: "Inbox", icon: Inbox },
  { to: "/field-definitions", label: "Field Definitions", icon: Settings2, adminOnly: true },
  { to: "/audit", label: "Audit Log", icon: ClipboardList, adminOnly: true },
  { to: "/reports", label: "Reports", icon: BarChart2 },
  { to: "/dashboards", label: "Dashboards", icon: LayoutGrid },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/timesheet", label: "Timesheet", icon: Clock },
  { to: "/expenses", label: "Expenses", icon: ReceiptText },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
    isActive
      ? "bg-sidebar-accent text-sidebar-accent-foreground"
      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
  );

function NavList({
  items,
  onNavigate,
}: {
  items: NavItem[];
  onNavigate?: () => void;
}) {
  return (
    <>
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          onClick={onNavigate}
          className={navLinkClass}
        >
          <Icon className="size-4" /> {label}
        </NavLink>
      ))}
    </>
  );
}

export function AppShell() {
  const { user, roles, tenantName } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || isAdmin(roles),
  );
  return (
    <div className="flex min-h-screen bg-muted/40">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            K
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium leading-tight">
              KMO Solutions Foundry
            </span>
            {tenantName ? (
              <span className="truncate text-xs leading-tight text-sidebar-foreground/70">
                {tenantName}
              </span>
            ) : null}
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2 py-4" data-testid="sidebar-nav">
          <NavList items={navItems} />
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-4 border-b bg-background px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  aria-label="Open navigation menu"
                  data-testid="mobile-nav-trigger"
                  className="inline-flex size-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
                >
                  <Menu className="size-5" />
                </button>
              </DialogTrigger>
              <DialogContent
                aria-describedby={undefined}
                className="left-0 top-0 flex h-dvh w-72 max-w-[85vw] translate-x-0 translate-y-0 flex-col gap-1 rounded-none p-4 sm:rounded-none"
              >
                <DialogTitle className="flex items-center gap-2 border-b pb-3 text-sm font-medium">
                  <span className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                    K
                  </span>
                  KMO Solutions Foundry
                </DialogTitle>
                <nav
                  className="mt-2 flex flex-col gap-1 overflow-y-auto"
                  data-testid="mobile-nav"
                >
                  <NavList
                    items={navItems}
                    onNavigate={() => setMobileOpen(false)}
                  />
                </nav>
              </DialogContent>
            </Dialog>
            {tenantName ? (
              <span className="block truncate text-sm text-muted-foreground">
                {tenantName}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user?.id && <TimerWidget userId={user.id} />}
            <AskAiDialog />
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
