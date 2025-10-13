import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { SyncButton as Button } from './SyncButton';
import { CSSProperties } from 'react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const iconStyle: CSSProperties = {
    height: '20px',
    width: '20px',
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="e-rounded-full e-p-8"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun style={iconStyle} />
      ) : (
        <Moon style={iconStyle} />
      )}
    </Button>
  );
}
