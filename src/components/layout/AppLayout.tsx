import { ReactNode, useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  // Sidebar stängd som default
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="e-flex e-flex-column e-h-screen">
      <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="e-flex e-flex-1 e-overflow-hidden">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <main className="e-flex-1 e-overflow-y-auto e-p-16">
          {children}
        </main>
      </div>
    </div>
  );
}
