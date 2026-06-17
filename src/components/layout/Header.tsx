import React from 'react';
import { Menu, Bell, Settings, ChevronDown } from 'lucide-react';
import { NAV_ITEMS } from '../../utils/navigation';
import { GlobalSearch } from './GlobalSearch';
import type { PageId } from '../../App';

interface HeaderProps {
  onMobileMenuOpen: () => void;
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
}

export const Header: React.FC<HeaderProps> = ({ onMobileMenuOpen, currentPage, onNavigate }) => {
  const currentNav = NAV_ITEMS.find(item => item.id === currentPage);

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center px-4 md:px-6 gap-4 flex-shrink-0"
      style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>

      <button onClick={onMobileMenuOpen} className="md:hidden p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
        <Menu size={20} />
      </button>

      <div className="hidden md:block">
        <h1 className="text-base font-semibold text-slate-800 leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {currentNav?.label ?? 'TrackHub'}
        </h1>
        {currentNav?.description && <p className="text-xs text-slate-400 mt-0.5">{currentNav.description}</p>}
      </div>
      <div className="md:hidden">
        <h1 className="text-sm font-semibold text-slate-800">{currentNav?.label ?? 'TrackHub'}</h1>
      </div>

      <div className="flex-1" />

      {/* Global Search */}
      <GlobalSearch onNavigate={onNavigate} />

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button className="relative p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-600 rounded-full" />
        </button>
        <button className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
          <Settings size={18} />
        </button>
        <div className="flex items-center gap-2 ml-1 pl-3 border-l border-slate-100 cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-semibold">JD</span>
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-slate-700 leading-tight">John Doe</p>
            <p className="text-xs text-slate-400">Admin</p>
          </div>
          <ChevronDown size={14} className="hidden md:block text-slate-400" />
        </div>
      </div>
    </header>
  );
};
