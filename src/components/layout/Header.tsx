import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { AppBarComponent } from '@syncfusion/ej2-react-navigations';
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
    <>
      <AppBarComponent colorMode="Light">
        {/* Left: Menu + Logo */}
        <button
          className="e-btn e-inherit"
          onClick={onMenuClick}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex !important',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '40px',
            minHeight: '40px'
          }}
        >
          <span className="e-icons e-menu" style={{ fontSize: '20px', color: 'var(--e-text)' }}></span>
        </button>

        <div className="e-appbar-separator"></div>

        <span style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: 'var(--e-text)',
          marginRight: '0.5rem'
        }}>
          Prio
        </span>

        <span style={{
          fontSize: '0.875rem',
          color: 'var(--e-text-secondary)'
        }}>
          Håll fokus på det som är viktigt
        </span>

        <div className="e-appbar-spacer"></div>

        {/* Right: Status + Actions */}
        <div
          onClick={() => navigate('/settings')}
          className="e-flex e-align-center e-gap-8 e-px-12 e-py-8 e-rounded e-cursor-pointer"
          style={{ backgroundColor: 'var(--e-surface-secondary)' }}
          title={isMicrosoftConnected ? 'Microsoft Calendar ansluten' : 'Ej ansluten'}
        >
          <div className="e-rounded-full" style={{
            width: '8px',
            height: '8px',
            backgroundColor: isMicrosoftConnected ? 'var(--success-500)' : 'var(--error-500)'
          }} />
          <span className="e-text-xs">MSFT</span>
        </div>

        <ButtonComponent
          cssClass="e-inherit"
          iconCss="e-icons e-settings"
          onClick={() => navigate('/settings')}
        />

        <div className="e-relative e-inline-block">
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
      </AppBarComponent>

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
    </>
  );
}
