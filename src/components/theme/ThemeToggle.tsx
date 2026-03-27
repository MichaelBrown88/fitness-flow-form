import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useThemeMode } from '@/contexts/ThemeModeContext';

type ThemeToggleProps = {
  /** Extra classes for the icon button */
  className?: string;
};

/**
 * Toggles Tailwind `dark` class on `document.documentElement` (class strategy).
 * Pair with `.dark` semantic tokens in `index.css`.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useThemeMode();
  const isDark = theme === 'dark';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-foreground" aria-hidden />
      ) : (
        <Moon className="h-4 w-4 text-foreground" aria-hidden />
      )}
    </Button>
  );
}
