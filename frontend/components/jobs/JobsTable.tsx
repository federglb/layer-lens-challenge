'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { fetchJobs, queryKeys } from '@/utils/queries';
import { cancelJob, retryJob } from '@/utils/mutations';
import { Job, JobStatus, JobType, canBeCancelled, canBeRetried } from '@/utils/interfaces';
import { useToast } from '@/components/ui/Toast';
import StatusBadge from './StatusBadge';
import JobTypeBadge from './JobTypeBadge';
import { formatRelativeDate, shortId } from '@/utils/format';

const STATUS_FILTERS: { label: string; value: JobStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Processing', value: 'processing' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
  { label: 'Cancelled', value: 'cancelled' },
];

const TYPE_OPTIONS: { label: string; value: JobType | 'all' }[] = [
  { label: 'All Types', value: 'all' },
  { label: 'Process', value: 'process' },
  { label: 'Analyze', value: 'analyze' },
  { label: 'Export', value: 'export' },
];

const ITEMS_PER_PAGE = 10;

interface JobsTableProps {
  initialStatus?: JobStatus | null;
  searchQuery?: string;
  total?: number;
}

function SkeletonRow() {
  return (
    <tr>
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 bg-surface-container rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export default function JobsTable({ initialStatus, searchQuery = '', total }: JobsTableProps) {
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>(
    initialStatus || 'all'
  );
  const [typeFilter, setTypeFilter] = useState<JobType | 'all'>('all');
  const [page, setPage] = useState(1);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.jobs(1, 50),
    queryFn: () => fetchJobs(1, 50),
    refetchInterval: 5_000,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelJob(id),
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      addToast({
        type: 'success',
        title: 'Job cancellation initiated',
        message: `"${job.name}" is being cancelled.`,
      });
    },
    onError: (err: any) => {
      addToast({
        type: 'error',
        title: 'Cancel failed',
        message: err.response?.data?.error || err.message,
      });
    },
    onSettled: () => setActionLoadingId(null),
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => retryJob(id),
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      addToast({
        type: 'success',
        title: 'Job requeued',
        message: `"${job.name}" has been queued for retry.`,
      });
    },
    onError: (err: any) => {
      addToast({
        type: 'error',
        title: 'Retry failed',
        message: err.response?.data?.error || err.message,
      });
    },
    onSettled: () => setActionLoadingId(null),
  });

  function handleCancel(job: Job) {
    setActionLoadingId(job.id);
    cancelMutation.mutate(job.id);
  }

  function handleRetry(job: Job) {
    setActionLoadingId(job.id);
    retryMutation.mutate(job.id);
  }

  const filteredJobs = useMemo(() => {
    if (!data?.jobs) return [];
    return data.jobs.filter((job) => {
      if (statusFilter !== 'all' && job.status !== statusFilter) return false;
      if (typeFilter !== 'all' && job.jobType !== typeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!job.name.toLowerCase().includes(q) && !job.id.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [data?.jobs, statusFilter, typeFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / ITEMS_PER_PAGE));
  const paginatedJobs = filteredJobs.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  function handleStatusChange(value: JobStatus | 'all') {
    setStatusFilter(value);
    setPage(1);
  }

  function handleTypeChange(value: JobType | 'all') {
    setTypeFilter(value);
    setPage(1);
  }

  return (
    <div className="bg-white border border-outline-variant rounded-xl overflow-hidden">
      {/* Filter Bar */}
      <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant">
        <div className="flex flex-wrap items-center gap-4">
          {/* Status filter pills */}
          <div className="flex gap-1 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => handleStatusChange(f.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  statusFilter === f.value
                    ? 'bg-primary text-white'
                    : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => handleTypeChange(e.target.value as JobType | 'all')}
              className="bg-surface-container-low border border-outline-variant rounded-lg text-xs font-medium text-on-surface py-1 pl-3 pr-7 focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer outline-none"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined text-xs text-outline absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
              expand_more
            </span>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Refresh
        </button>
      </div>

      {/* Mobile card list */}
      <div className="lg:hidden divide-y divide-outline-variant">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 space-y-3">
              <div className="h-4 bg-surface-container rounded animate-pulse w-2/3" />
              <div className="h-3 bg-surface-container rounded animate-pulse w-1/3" />
            </div>
          ))
        ) : isError ? (
          <div className="px-6 py-16 text-center flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-error">cloud_off</span>
            <p className="font-semibold text-on-surface">Failed to load jobs</p>
            <button
              onClick={() => refetch()}
              className="mt-2 px-4 py-2 bg-surface-container-low text-primary text-sm font-medium rounded-lg hover:bg-surface-container-high transition-colors"
            >
              Try again
            </button>
          </div>
        ) : paginatedJobs.length === 0 ? (
          <div className="px-6 py-16 text-center flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-outline">inbox</span>
            <p className="font-semibold text-on-surface-variant">No jobs found</p>
            <p className="text-sm text-on-surface-variant">
              {statusFilter !== 'all' || typeFilter !== 'all' || searchQuery
                ? 'Try adjusting the filters'
                : 'Create your first job to get started'}
            </p>
          </div>
        ) : (
          paginatedJobs.map((job) => {
            const isLoadingAction = actionLoadingId === job.id;
            return (
              <div key={job.id} className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface truncate">{job.name}</p>
                    <p className="text-xs font-mono text-on-surface-variant mt-0.5">
                      {shortId(job.id)}
                    </p>
                    {job.errorMessage && (
                      <p className="text-xs text-error mt-0.5 truncate">{job.errorMessage}</p>
                    )}
                  </div>
                  <StatusBadge status={job.status} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <JobTypeBadge type={job.jobType} />
                    <span className="text-xs text-on-surface-variant">
                      {formatRelativeDate(job.updatedAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="text-primary hover:bg-primary/10 p-1.5 rounded-lg transition-all"
                      title="View Details"
                    >
                      <span className="material-symbols-outlined text-lg">visibility</span>
                    </Link>
                    {canBeCancelled(job) && (
                      <button
                        onClick={() => handleCancel(job)}
                        disabled={isLoadingAction}
                        className="text-error hover:bg-error/10 p-1.5 rounded-lg transition-all disabled:opacity-50"
                        title="Cancel Job"
                      >
                        {isLoadingAction ? (
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor" />
                          </svg>
                        ) : (
                          <span className="material-symbols-outlined text-lg">cancel</span>
                        )}
                      </button>
                    )}
                    {canBeRetried(job) && (
                      <button
                        onClick={() => handleRetry(job)}
                        disabled={isLoadingAction}
                        className="text-primary hover:bg-primary/10 p-1.5 rounded-lg transition-all disabled:opacity-50"
                        title={`Retry (${job.retryCount}/3 attempts)`}
                      >
                        {isLoadingAction ? (
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor" />
                          </svg>
                        ) : (
                          <span className="material-symbols-outlined text-lg">refresh</span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[640px]">
          <thead>
            <tr className="bg-surface-container-low">
              {['Job ID', 'Job Name', 'Type', 'Status', 'Last Updated', 'Actions'].map(
                (col, i) => (
                  <th
                    key={col}
                    className={`px-5 py-3 text-xs font-semibold text-on-surface-variant border-b border-outline-variant ${
                      i === 5 ? 'text-right' : ''
                    }`}
                  >
                    {col}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            ) : isError ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-4xl text-error">cloud_off</span>
                    <p className="font-semibold text-on-surface">Failed to load jobs</p>
                    <p className="text-sm text-on-surface-variant">
                      {(error as any)?.message || 'Could not reach the server'}
                    </p>
                    <button
                      onClick={() => refetch()}
                      className="mt-2 px-4 py-2 bg-surface-container-low text-primary text-sm font-medium rounded-lg hover:bg-surface-container-high transition-colors"
                    >
                      Try again
                    </button>
                  </div>
                </td>
              </tr>
            ) : paginatedJobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-4xl text-outline">inbox</span>
                    <p className="font-semibold text-on-surface-variant">No jobs found</p>
                    <p className="text-sm text-on-surface-variant">
                      {statusFilter !== 'all' || typeFilter !== 'all' || searchQuery
                        ? 'Try adjusting the filters'
                        : 'Create your first job to get started'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedJobs.map((job) => {
                const isLoadingAction = actionLoadingId === job.id;
                return (
                  <tr
                    key={job.id}
                    className="hover:bg-surface-container-low/60 transition-colors"
                  >
                    <td className="px-5 py-4 font-mono text-xs text-primary whitespace-nowrap font-medium">
                      {shortId(job.id)}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-on-surface">{job.name}</p>
                      {job.errorMessage && (
                        <p className="text-xs text-error mt-0.5 truncate max-w-[200px]">
                          {job.errorMessage}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <JobTypeBadge type={job.jobType} />
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-5 py-4 text-xs text-on-surface-variant whitespace-nowrap">
                      {formatRelativeDate(job.updatedAt)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/jobs/${job.id}`}
                          className="text-on-surface-variant hover:text-primary hover:bg-primary/10 p-1.5 rounded-lg transition-all"
                          title="View Details"
                        >
                          <span className="material-symbols-outlined text-lg">visibility</span>
                        </Link>

                        {canBeCancelled(job) && (
                          <button
                            onClick={() => handleCancel(job)}
                            disabled={isLoadingAction}
                            className="text-error hover:bg-error/10 p-1.5 rounded-lg transition-all disabled:opacity-50"
                            title="Cancel Job"
                          >
                            {isLoadingAction ? (
                              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor" />
                              </svg>
                            ) : (
                              <span className="material-symbols-outlined text-lg">cancel</span>
                            )}
                          </button>
                        )}

                        {canBeRetried(job) && (
                          <button
                            onClick={() => handleRetry(job)}
                            disabled={isLoadingAction}
                            className="text-primary hover:bg-primary/10 p-1.5 rounded-lg transition-all disabled:opacity-50"
                            title={`Retry (${job.retryCount}/3 attempts)`}
                          >
                            {isLoadingAction ? (
                              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor" />
                              </svg>
                            ) : (
                              <span className="material-symbols-outlined text-lg">refresh</span>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-5 py-3 bg-surface-container-low border-t border-outline-variant flex items-center justify-between">
        <p className="text-xs text-on-surface-variant">
          {isLoading
            ? 'Loading...'
            : filteredJobs.length === (total ?? data?.total)
            ? `${filteredJobs.length} jobs`
            : `${filteredJobs.length} of ${total ?? data?.total ?? filteredJobs.length} jobs`}
        </p>
        <div className="flex items-center gap-4">
          {!isLoading && totalPages > 1 && (
            <>
              <span className="text-xs text-on-surface-variant">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-7 h-7 rounded border border-outline-variant bg-white text-on-surface-variant hover:bg-surface-container transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-7 h-7 rounded border border-outline-variant bg-white text-on-surface-variant hover:bg-surface-container transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
