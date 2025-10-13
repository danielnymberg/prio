import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { DropDownButtonComponent, ItemModel } from '@syncfusion/ej2-react-splitbuttons';
import { TaskForm } from '@/components/tasks/TaskForm';
import { DailyCheckInModal } from '@/components/focus/DailyCheckInModal';
import { useTasks } from '@/hooks/useTasks';
import { CreateTaskInput, DailyCheckIn } from '@/lib/types';
import { isMicrosoftLoggedIn } from '@/services/microsoft-graph';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, signOut } = useAuth();
  const { createTask } = useTasks();
  const navigate = useNavigate();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isMicrosoftConnected, setIsMicrosoftConnected] = useState(false);
  const [needsCheckIn, setNeedsCheckIn] = useState(false);

  useEffect(() => {
    const checkMicrosoftStatus = async () => {
      const connected = await isMicrosoftLoggedIn();
      setIsMicrosoftConnected(connected);
    };
    checkMicrosoftStatus();

    const interval = setInterval(checkMicrosoftStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Check if daily check-in is needed
    const checkInData = localStorage.getItem('prio-daily-checkin');
    if (checkInData) {
      const lastCheckIn = JSON.parse(checkInData);
      const lastCheckInDate = new Date(lastCheckIn.date || lastCheckIn.timestamp);
      const today = new Date();
      const isToday = lastCheckInDate.toDateString() === today.toDateString();
      setNeedsCheckIn(!isToday);
    } else {
      setNeedsCheckIn(true);
    }
  }, []);

  const handleCheckInComplete = (checkIn: DailyCheckIn) => {
    localStorage.setItem('prio-daily-checkin', JSON.stringify(checkIn));
    window.location.reload();
  };

  // User menu items for DropDownButton
  const userMenuItems: ItemModel[] = [
    {
      text: user?.email || '',
      iconCss: 'e-icons e-user',
      disabled: true
    },
    {
      separator: true
    },
    {
      text: 'Inställningar',
      iconCss: 'e-icons e-settings',
      id: 'settings'
    },
    {
      text: 'Logga ut',
      iconCss: 'e-icons e-logout',
      id: 'logout'
    }
  ];

  const handleUserMenuSelect = (args: any) => {
    if (args.item.id === 'logout') {
      signOut();
    } else if (args.item.id === 'settings') {
      navigate('/settings');
    }
  };

  return (
    <header style={{
      backgroundColor: 'var(--e-surface)',
      borderBottom: '1px solid var(--e-border)',
      padding: '1rem 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Mobile menu button */}
        <ButtonComponent
          cssClass="e-flat mobile-menu-btn"
          iconCss="e-icons e-menu"
          onClick={onMenuClick}
          style={{ display: 'none' }}
        />

        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: 'var(--copper-500)',
          margin: 0
        }}>
          Prio
        </h1>
        <span style={{
          fontSize: '0.875rem',
          color: 'var(--e-text-secondary)'
        }}>
          Håll fokus på det som är viktigt
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Microsoft status */}
        <div
          onClick={() => navigate('/settings')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            borderRadius: '4px',
            backgroundColor: 'var(--e-surface-secondary)',
            cursor: 'pointer'
          }}
          title={isMicrosoftConnected ? 'Microsoft Calendar ansluten' : 'Ej ansluten'}
        >
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isMicrosoftConnected ? '#10b981' : '#ef4444'
          }} />
          <span style={{ fontSize: '0.75rem' }}>MSFT</span>
        </div>

        <ButtonComponent
          cssClass="e-flat"
          iconCss="e-icons e-settings"
          onClick={() => navigate('/settings')}
          content=""
        />

        <div style={{ position: 'relative', display: 'inline-block' }}>
          <ButtonComponent
            cssClass="e-outline"
            iconCss="e-icons e-refresh"
            onClick={() => setIsCheckInOpen(true)}
            content="Avstämning"
          />
          {needsCheckIn && (
            <span className="e-badge e-badge-danger e-badge-notification e-badge-overlap">!</span>
          )}
        </div>

        <ButtonComponent
          cssClass="e-primary"
          iconCss="e-icons e-plus"
          onClick={() => setIsQuickAddOpen(true)}
          content="Ny uppgift"
        />

        <ThemeToggle />

        {user && (
          <DropDownButtonComponent
            items={userMenuItems}
            select={handleUserMenuSelect}
            iconCss="e-icons e-user"
            cssClass="e-caret-hide"
          />
        )}
      </div>

      <TaskForm
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSubmit={async (input) => {
          await createTask(input as CreateTaskInput);
        }}
      />

      <DailyCheckInModal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        onComplete={handleCheckInComplete}
      />
    </header>
  );
}
