// Lucide icons replaced with SyncFusion e-icons
import { useTheme } from '@/contexts/ThemeContext';
import { SyncButton as Button } from './SyncButton';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="e-rounded-full e-p-8"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <span className="e-icons e-sun" style={{ fontSize: '16px' }}></span>
      ) : (
        <span className="e-icons e-moon" style={{ fontSize: '16px' }}></span>
      )}
    </Button>
  );
}
