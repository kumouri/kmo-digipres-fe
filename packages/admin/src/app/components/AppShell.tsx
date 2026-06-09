import { useState } from "react";
import { NavLink, Outlet } from "react-router";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart2,
  BellRing,
  BookOpen,
  Building2,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Contact,
  FileSignature,
  FileText,
  FolderKanban,
  Home,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  ListChecks,
  Megaphone,
  Menu,
  MessageSquare,
  MessagesSquare,
  PhoneIncoming,
  PhoneMissed,
  Receipt,
  ReceiptText,
  RefreshCw,
  ScrollText,
  Settings2,
  ShieldAlert,
  ShieldPlus,
  Sparkles,
  Target,
  TicketIcon,
  TrendingDown,
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
import { isAdmin, isContractor } from "../auth/roles";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  /** Hide this item entirely from a scoped-down contractor. */
  hideForContractor?: boolean;
  /** Label shown to a contractor when the generic label would be wrong. */
  contractorLabel?: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/contacts", label: "Contacts", icon: Users, hideForContractor: true },
  { to: "/companies", label: "Companies", icon: Building2, hideForContractor: true },
  { to: "/deals", label: "Deals", icon: Target, hideForContractor: true },
  { to: "/activities", label: "Activities", icon: Activity, hideForContractor: true },
  { to: "/quotes", label: "Quotes", icon: FileText, hideForContractor: true },
  { to: "/invoices", label: "Invoices", icon: Receipt, hideForContractor: true },
  { to: "/ar-aging", label: "AR aging", icon: TrendingDown, hideForContractor: true },
  { to: "/proposals", label: "Proposals", icon: ScrollText, hideForContractor: true },
  { to: "/tickets", label: "Tickets", icon: TicketIcon, hideForContractor: true },
  { to: "/knowledge-base", label: "Knowledge Base", icon: BookOpen, hideForContractor: true },
  { to: "/inbox", label: "Inbox", icon: Inbox, hideForContractor: true },
  { to: "/missed-calls", label: "Missed Calls", icon: PhoneMissed, hideForContractor: true },
  { to: "/no-show-risk", label: "No-show risk", icon: ShieldAlert, hideForContractor: true },
  { to: "/waitlist", label: "Waitlist", icon: ListChecks, hideForContractor: true },
  { to: "/salon-reviews", label: "Salon reviews", icon: MessagesSquare, hideForContractor: true },
  { to: "/listings", label: "Listings", icon: Home, hideForContractor: true },
  { to: "/concierge", label: "Concierge", icon: Sparkles, hideForContractor: true },
  { to: "/marketing-review", label: "Marketing review", icon: Megaphone, hideForContractor: true },
  { to: "/appointments", label: "Appointments", icon: CalendarRange, hideForContractor: true },
  { to: "/risk-day", label: "Tomorrow's risk", icon: ShieldAlert, hideForContractor: true },
  { to: "/recall", label: "Recall board", icon: BellRing, hideForContractor: true },
  { to: "/callbacks", label: "Callback inbox", icon: PhoneIncoming, hideForContractor: true },
  { to: "/review-inbox", label: "Review inbox", icon: ShieldPlus, hideForContractor: true },
  { to: "/review-replies", label: "Review replies", icon: MessageSquare, adminOnly: true },
  { to: "/team", label: "Team", icon: Contact, adminOnly: true },
  { to: "/field-definitions", label: "Field Definitions", icon: Settings2, adminOnly: true },
  { to: "/audit", label: "Audit Log", icon: ClipboardList, adminOnly: true },
  { to: "/reports", label: "Reports", icon: BarChart2, hideForContractor: true },
  { to: "/dashboards", label: "Dashboards", icon: LayoutGrid, hideForContractor: true },
  { to: "/projects", label: "Projects", icon: FolderKanban, contractorLabel: "My Projects" },
  { to: "/timesheet", label: "Timesheet", icon: Clock, contractorLabel: "My Timesheet" },
  { to: "/expenses", label: "Expenses", icon: ReceiptText, contractorLabel: "My Expenses" },
  { to: "/timesheets", label: "Timesheets", icon: ClipboardCheck, adminOnly: true },
  { to: "/contracts", label: "Contracts", icon: FileSignature, hideForContractor: true },
  { to: "/contract-templates", label: "Contract Templates", icon: FileText, adminOnly: true },
  { to: "/recurring-invoices", label: "Recurring Invoices", icon: RefreshCw, hideForContractor: true },
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
  contractor,
}: {
  items: NavItem[];
  onNavigate?: () => void;
  contractor?: boolean;
}) {
  return (
    <>
      {items.map(({ to, label, contractorLabel, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          onClick={onNavigate}
          className={navLinkClass}
        >
          <Icon className="size-4" />{" "}
          {contractor && contractorLabel ? contractorLabel : label}
        </NavLink>
      ))}
    </>
  );
}

export function AppShell() {
  const { user, roles, tenantName } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const contractor = isContractor(roles);
  const navItems = NAV_ITEMS.filter((item) => {
    // A scoped-down contractor sees only their own working surfaces.
    if (contractor && item.hideForContractor) return false;
    // Admin-only items stay admin-only (a contractor is never admin).
    if (item.adminOnly && !isAdmin(roles)) return false;
    return true;
  });
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
          <NavList items={navItems} contractor={contractor} />
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
                    contractor={contractor}
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
            {user?.id && (
              <TimerWidget userId={user.id} isContractor={contractor} />
            )}
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
