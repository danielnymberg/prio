import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMicrosoftGraph } from '@/contexts/MicrosoftGraphContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { AppBarComponent } from '@syncfusion/ej2-react-navigations';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { DropDownButtonComponent, ItemModel } from '@syncfusion/ej2-react-splitbuttons';
import { DailyCheckIn } from '@/lib/types';
import { DagligCheckIn } from '@/components/focus/DagligCheckIn';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, signOut } = useAuth();
  const { isConnected, login } = useMicrosoftGraph();
  const navigate = useNavigate();
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);


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

        <Link
          to="/home"
          style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: 'var(--e-text)',
            textDecoration: 'none',
            marginLeft: '12px'
          }}
        >
          MinPrio
        </Link>

        <div className="e-appbar-spacer"></div>

        {/* Right: Actions - Responsiv layout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Microsoft status - FÖRBÄTTRAD */}
          <div
            onClick={async () => {
              if (!isConnected) {
                // Inte inloggad → Logga in direkt
                await login();
              } else {
                // Redan inloggad → Gå till Settings
                navigate('/settings');
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: isConnected
                ? 'rgba(16, 124, 16, 0.1)'
                : 'rgba(196, 43, 28, 0.1)',
              cursor: 'pointer',
              border: `1px solid ${isConnected ? '#107c10' : '#c42b1c'}`,
              transition: 'all 0.2s ease',
            }}
            title={isConnected
              ? 'Microsoft Calendar & Mail ansluten - Klicka för inställningar'
              : 'Klicka för att logga in på Microsoft'}
          >
            <span className="e-icons e-contact" style={{ fontSize: '16px', color: isConnected ? '#107c10' : '#c42b1c' }}></span>
            <span style={{ fontSize: '13px', fontWeight: '600', color: isConnected ? '#107c10' : '#c42b1c' }}>
              {isConnected ? 'MSFT ✓' : 'MSFT ×'}
            </span>
          </div>

          {/* Avstämning - Endast ikon på mobil */}
          <ButtonComponent
            cssClass="e-outline"
            iconCss="e-icons e-refresh"
            onClick={() => setIsCheckInOpen(true)}
            content={window.innerWidth < 768 ? '' : 'Avstämning'}
          />

          {/* ThemeToggle - Dold på små skärmar */}
          <div style={{ display: window.innerWidth < 640 ? 'none' : 'block' }}>
            <ThemeToggle />
          </div>
        </div>

        {user && (
          <DropDownButtonComponent
            items={userMenuItems}
            select={handleUserMenuSelect}
            iconCss="e-icons e-user"
            cssClass="e-caret-hide"
          />
        )}
      </AppBarComponent>

      {/* Daglig avstämning */}
      <DagligCheckIn
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        onComplete={handleCheckInComplete}
      />
    </>
  );
}
