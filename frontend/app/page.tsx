import { Suspense } from 'react';
import JobsDashboard from '@/components/jobs/JobsDashboard';

function DashboardSkeleton() {
  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto w-full space-y-10 animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-24 bg-surface-container-low rounded" />
        <div className="h-10 w-48 bg-surface-container-low rounded" />
      </div>
      <div className="bg-surface-container-lowest rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-outline-variant/20">
          <div className="h-8 w-64 bg-surface-container-low rounded" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-6 py-5 flex gap-6 border-b border-outline-variant/10">
            {['w-20', 'w-48', 'w-24', 'w-32', 'w-20', 'w-16'].map((w, j) => (
              <div key={j} className={`h-4 bg-surface-container-low rounded ${w}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <JobsDashboard />
    </Suspense>
  );
}
