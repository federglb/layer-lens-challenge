'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import CreateJobModal from '@/components/jobs/CreateJobModal';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-white">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-on-surface/20 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onCreateJob={() => setIsCreateModalOpen(true)}
      />

      <div className="flex-1 lg:ml-14 flex flex-col min-h-screen">
        <TopBar onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1">{children}</main>
      </div>

      <CreateJobModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
