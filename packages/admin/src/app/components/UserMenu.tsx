import { useNavigate } from "react-router";
import { ChevronDown, LogOut } from "lucide-react";

import { useAuth } from "@/auth/useAuth";
import { Button } from "@kmosf/crm-components";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@kmosf/crm-components";

export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const initials = user.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          data-testid="user-menu-trigger"
          aria-label={`Account menu for ${user.displayName}`}
        >
          <span
            aria-hidden
            className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground"
          >
            {initials || "?"}
          </span>
          <span className="hidden text-sm font-medium sm:inline">{user.displayName}</span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate">{user.displayName}</span>
          <span className="text-xs font-normal text-muted-foreground truncate">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={handleLogout}
          data-testid="user-menu-logout"
        >
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
