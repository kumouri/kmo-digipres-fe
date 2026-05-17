import { Moon, Sun } from "lucide-react";

import { Button } from "@kmosf/crm-components";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextLabel = theme === "light" ? "Switch to dark mode" : "Switch to light mode";

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="size-8 p-0"
      aria-label={nextLabel}
      title={nextLabel}
      data-testid="theme-toggle"
    >
      {theme === "light" ? (
        <Moon className="size-4" />
      ) : (
        <Sun className="size-4" />
      )}
    </Button>
  );
}
