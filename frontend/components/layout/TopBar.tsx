'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface TopBarProps {
  onMenuClick: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const [search, setSearch] = useState('');
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/?q=${encodeURIComponent(search.trim())}`);
    } else {
      router.push('/');
    }
  }

  return (
    <header className="sticky top-0 z-40 flex items-center px-4 lg:px-6 h-14 w-full bg-white border-b border-outline-variant">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors flex-shrink-0 mr-3"
      >
        <span className="material-symbols-outlined">menu</span>
      </button>

      <form onSubmit={handleSearch} className="relative w-full max-w-sm">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
          search
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 placeholder:text-outline transition-all"
          placeholder="Search jobs..."
        />
      </form>
    </header>
  );
}
