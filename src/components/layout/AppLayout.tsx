import { ReactNode, useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="e-flex e-flex-column e-h-screen">
      <Header onMenuClick={() => setIsSidebarOpen(true)} />

      <div className="e-flex e-flex-1 e-overflow-hidden">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Backdrop overlay för mobil */}
        {isSidebarOpen && (
          <div
            className="e-fixed e-z-30"
            style={{
              inset: 0,
              backgroundColor: 'rgba(28, 25, 23, 0.6)',
            }}
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <main className="e-flex-1 e-overflow-y-auto e-p-32">
          {children}
        </main>
      </div>
    </div>
  );
}
