'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateJob: () => void;
}

export default function Sidebar({ isOpen, onClose, onCreateJob }: SidebarProps) {
  const pathname = usePathname();
  const active = pathname === '/';

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen w-14 z-50
        bg-white border-r border-outline-variant flex flex-col items-center py-4 gap-1
        transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {/* Logo */}
      <div className="mb-6 flex items-center justify-center">
        <svg width="30" height="22" viewBox="0 0 30 22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 22 L29 15 L15 8 L1 15 Z" fill="#2563EB" fillOpacity="0.55" />
          <path d="M15 14 L29 7 L15 0 L1 7 Z" fill="#2563EB" />
        </svg>
      </div>

      {/* Nav — dashboard only */}
      <nav className="flex-1 flex flex-col items-center gap-1 w-full px-2">
        <Link
          href="/"
          onClick={onClose}
          title="Dashboard"
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-150 ${
            active
              ? 'bg-primary/10 text-primary'
              : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-xl">monitoring</span>
        </Link>
      </nav>

      {/* Bottom: create job */}
      <div className="flex flex-col items-center w-full px-2">
        <button
          onClick={() => { onClose(); onCreateJob(); }}
          title="Create Job"
          className="w-10 h-10 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-all duration-150"
        >
          <span className="material-symbols-outlined text-xl">add_circle</span>
        </button>
      </div>
    </aside>
  );
}
