'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { fetchJobs, queryKeys } from '@/utils/queries';
import { JobStatus } from '@/utils/interfaces';
import JobsTable from './JobsTable';

const STATS = [
  { status: 'processing' as JobStatus, label: 'Active', icon: 'sync' },
  { status: 'completed' as JobStatus, label: 'Completed', icon: 'check_circle' },
  { status: 'failed' as JobStatus, label: 'Failed', icon: 'error' },
  { status: 'pending' as JobStatus, label: 'Pending', icon: 'schedule' },
];

export default function JobsDashboard() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') as JobStatus | null;
  const searchQuery = searchParams.get('q') || '';

  const { data, dataUpdatedAt } = useQuery({
    queryKey: queryKeys.jobs(1, 50),
    queryFn: () => fetchJobs(1, 50),
    refetchInterval: 5_000,
  });

  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1_000);
    return () => clearInterval(id);
  }, []);

  const secondsAgo = dataUpdatedAt ? Math.floor((Date.now() - dataUpdatedAt) / 1_000) : null;

  const jobCounts = STATS.map((s) => ({
    ...s,
    count: data?.jobs?.filter((j) => j.status === s.status).length ?? 0,
  }));

  const total = data?.total ?? 0;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8">

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-on-surface-variant mb-1">Home / Jobs</p>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-on-surface tracking-tight">
              Job Management
            </h1>
            {data?.total != null && (
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                {data.total}
              </span>
            )}
          </div>
          {searchQuery && (
            <p className="text-sm text-on-surface-variant mt-1">
              Results for &ldquo;<span className="font-semibold text-on-surface">{searchQuery}</span>&rdquo;
            </p>
          )}
        </div>

        {secondsAgo !== null && (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
            <span className="text-xs text-on-surface-variant">
              Updated {secondsAgo === 0 ? 'just now' : `${secondsAgo}s ago`}
            </span>
          </div>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div className="bg-white border border-outline-variant rounded-xl p-5">
          <p className="text-sm text-on-surface-variant mb-1">Total Jobs</p>
          <p className="text-3xl font-bold text-on-surface">{total}</p>
        </div>

        {jobCounts.map((stat) => (
          <div key={stat.status} className="bg-white border border-outline-variant rounded-xl p-5">
            <p className="text-sm text-on-surface-variant mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-on-surface">{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Jobs Table */}
      <div>
        <h2 className="text-base font-semibold text-on-surface mb-4">Latest Jobs</h2>
        <JobsTable initialStatus={initialStatus} searchQuery={searchQuery} total={data?.total} />
      </div>

    </div>
  );
}
