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
  Receipt,
  ReceiptText,
  Settings2,
  Target,
  TicketIcon,
  Users,
} from "lucide-react";

import { UserMenu } from "./UserMenu";
import { ThemeToggle } from "./ThemeToggle";
import { cn, AskAiDialog, TimerWidget } from "@kmosf/crm-components";
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

export function AppShell() {
  const { user, roles } = useAuth();
  const navItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || isAdmin(roles),
  );
  return (
    <div className="flex min-h-screen bg-muted/40">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            K
          </span>
          <span className="text-sm font-medium">KMO Solutions Foundry</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2 py-4" data-testid="sidebar-nav">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
                )
              }
            >
              <Icon className="size-4" /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-4 border-b bg-background px-4 md:px-6">
          <div />
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
