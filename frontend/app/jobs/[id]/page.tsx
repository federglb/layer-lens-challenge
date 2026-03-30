import { Suspense } from 'react';
import JobDetail from '@/components/jobs/JobDetail';

interface PageProps {
  params: { id: string };
}

function JobDetailSkeleton() {
  return (
    <div className="space-y-10 animate-pulse">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="h-3 w-40 bg-surface-container-low rounded" />
          <div className="h-10 w-72 bg-surface-container-low rounded" />
          <div className="h-4 w-48 bg-surface-container-low rounded" />
        </div>
        <div className="flex gap-3">
          <div className="h-12 w-32 bg-surface-container-low rounded-lg" />
          <div className="h-12 w-40 bg-surface-container-low rounded-lg" />
        </div>
      </div>
      <div className="h-44 bg-surface-container-low rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="h-72 bg-surface-container-low rounded-xl" />
        <div className="lg:col-span-2 h-72 bg-surface-container-low rounded-xl" />
      </div>
    </div>
  );
}

export default function JobDetailPage({ params }: PageProps) {
  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-8">
        <a href="/" className="hover:text-primary transition-colors">
          Home
        </a>
        <span className="material-symbols-outlined text-[10px]">chevron_right</span>
        <a href="/" className="hover:text-primary transition-colors">
          Jobs
        </a>
        <span className="material-symbols-outlined text-[10px]">chevron_right</span>
        <span className="text-primary font-mono">#{params.id.slice(-8).toUpperCase()}</span>
      </nav>

      <Suspense fallback={<JobDetailSkeleton />}>
        <JobDetail id={params.id} />
      </Suspense>
    </div>
  );
}
