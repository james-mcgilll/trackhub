import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useSidebar } from '../../hooks/useSidebar';
import type { PageId } from '../../App';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate }) => {
  const { collapsed, toggle, mobileOpen, openMobile, closeMobile } = useSidebar();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        collapsed={collapsed}
        onToggle={toggle}
        mobileOpen={mobileOpen}
        onMobileClose={closeMobile}
        currentPage={currentPage}
        onNavigate={onNavigate}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMobileMenuOpen={openMobile} currentPage={currentPage} onNavigate={onNavigate} />
        <main className="flex-1 overflow-y-auto p-3 md:p-4">
          {children}
        </main>
      </div>
    </div>
  );
};
