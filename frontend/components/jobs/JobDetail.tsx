'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { fetchJob, queryKeys } from '@/utils/queries';
import { cancelJob, retryJob } from '@/utils/mutations';
import { canBeCancelled, canBeRetried, JobStatus } from '@/utils/interfaces';
import { useToast } from '@/components/ui/Toast';
import StatusBadge from './StatusBadge';
import JobTypeBadge from './JobTypeBadge';
import { formatDate, formatRelativeDate, shortId } from '@/utils/format';

const STATUS_STEPS: JobStatus[] = ['pending', 'processing', 'completed'];
const CANCEL_STEPS: JobStatus[] = ['pending', 'processing', 'cancelled'];
const FAILED_STEPS: JobStatus[] = ['pending', 'processing', 'failed'];

function getStepState(step: JobStatus, currentStatus: JobStatus) {
  const order = ['pending', 'processing', 'completed', 'failed', 'cancelling', 'cancelled'];
  const currentIdx = order.indexOf(currentStatus);
  const stepIdx = order.indexOf(step);

  if (currentStatus === 'cancelled' || currentStatus === 'cancelling') {
    if (step === 'pending') return 'done';
    if (step === 'processing') return 'done';
    if (step === 'cancelled') return 'active';
    return 'upcoming';
  }

  if (currentStatus === 'failed') {
    if (step === 'pending') return 'done';
    if (step === 'processing') return 'done';
    if (step === 'failed') return 'active';
    return 'upcoming';
  }

  if (stepIdx < currentIdx) return 'done';
  if (stepIdx === currentIdx) return 'active';
  return 'upcoming';
}

function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function JobDetail({ id }: { id: string }) {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: job,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.job(id),
    queryFn: () => fetchJob(id),
    refetchInterval: 5_000,
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.job(id) });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      addToast({ type: 'success', title: 'Cancellation initiated' });
    },
    onError: (err: any) => {
      addToast({
        type: 'error',
        title: 'Cancel failed',
        message: err.response?.data?.error || err.message,
      });
    },
  });

  const retryMutation = useMutation({
    mutationFn: () => retryJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.job(id) });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      addToast({ type: 'success', title: 'Job requeued' });
    },
    onError: (err: any) => {
      addToast({
        type: 'error',
        title: 'Retry failed',
        message: err.response?.data?.error || err.message,
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-10">
        {/* Skeleton hero */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="h-3 w-32 bg-surface-container-low rounded animate-pulse" />
            <div className="h-10 w-64 bg-surface-container-low rounded animate-pulse" />
          </div>
          <div className="flex gap-3">
            <div className="h-12 w-32 bg-surface-container-low rounded-lg animate-pulse" />
            <div className="h-12 w-40 bg-surface-container-low rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="h-40 bg-surface-container-low rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="h-64 bg-surface-container-low rounded-xl animate-pulse" />
          <div className="lg:col-span-2 h-64 bg-surface-container-low rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <span className="material-symbols-outlined text-5xl text-error">cloud_off</span>
        <h2 className="font-headline text-2xl font-bold text-on-surface">Job not found</h2>
        <p className="text-on-surface-variant text-sm">
          {(error as any)?.message || 'Could not load job details'}
        </p>
        <Link
          href="/"
          className="mt-4 px-6 py-3 bg-surface-container-high text-primary font-bold rounded-lg hover:bg-surface-variant transition-colors"
        >
          Back to Jobs
        </Link>
      </div>
    );
  }

  const configJson = job.config
    ? JSON.stringify(job.config, null, 2)
    : null;

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center flex-wrap gap-3">
            <h1 className="text-3xl lg:text-4xl font-headline font-extrabold tracking-tight text-on-surface">
              {job.name}
            </h1>
            <StatusBadge status={job.status} />
          </div>
          <p className="text-on-surface-variant font-label text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">schedule</span>
            Created {formatRelativeDate(job.createdAt)} &middot; {shortId(job.id)}
            {job.retryCount > 0 && (
              <span className="ml-2 text-[10px] bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-full font-bold uppercase">
                Retry {job.retryCount}/3
              </span>
            )}
          </p>
          {job.errorMessage && (
            <p className="text-sm text-error flex items-center gap-1.5 mt-1">
              <span className="material-symbols-outlined text-sm">error</span>
              {job.errorMessage}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {canBeCancelled(job) && (
            <button
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="px-6 py-3 bg-surface-container-highest text-primary font-bold rounded-lg hover:bg-surface-variant transition-colors flex items-center gap-2 active:scale-95 duration-200 disabled:opacity-60"
            >
              {cancelMutation.isPending ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <span className="material-symbols-outlined">block</span>
              )}
              Cancel Job
            </button>
          )}
          {canBeRetried(job) && (
            <button
              onClick={() => retryMutation.mutate()}
              disabled={retryMutation.isPending}
              className="px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 flex items-center gap-2 active:scale-95 duration-200 disabled:opacity-60 transition-colors"
            >
              {retryMutation.isPending ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <span className="material-symbols-outlined">refresh</span>
              )}
              Retry Job
            </button>
          )}
          <Link
            href="/"
            className="px-6 py-3 bg-surface-container-high text-on-surface-variant font-bold rounded-lg hover:bg-surface-variant transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            All Jobs
          </Link>
        </div>
      </section>

      {/* Status Timeline */}
      <section className="bg-white border border-outline-variant p-6 lg:p-8 rounded-xl relative overflow-hidden">
        <h3 className="font-headline text-on-surface-variant text-xs font-bold uppercase tracking-[0.2em] mb-10">
          Lifecycle Progression
        </h3>

        <div className="relative flex justify-between items-start max-w-2xl">
          {/* Background progress line */}
          <div className="absolute top-5 left-0 w-full h-1 bg-outline-variant opacity-20 z-0" />
          {/* Active progress line */}
          <div
            className={`absolute top-5 left-0 h-1 bg-primary z-0 transition-all duration-500 ${
              job.status === 'pending'
                ? 'w-0'
                : job.status === 'processing' || job.status === 'cancelling'
                ? 'w-1/2'
                : 'w-full'
            }`}
          />

          {(job.status === 'cancelled' || job.status === 'cancelling'
            ? CANCEL_STEPS
            : job.status === 'failed'
            ? FAILED_STEPS
            : STATUS_STEPS
          ).map((step) => {
            const state = getStepState(step, job.status);
            const iconMap: Record<string, string> = {
              pending: 'schedule',
              processing: 'sync',
              completed: 'flag',
              cancelled: 'block',
              failed: 'error',
            };

            return (
              <div key={step} className="relative z-10 flex flex-col items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ring-4 ring-surface-container-low transition-colors ${
                    state === 'done' || state === 'active'
                      ? 'bg-primary text-white'
                      : 'bg-surface-container-highest text-outline'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-xl ${
                      state === 'active' && step === 'processing' ? 'animate-spin' : ''
                    }`}
                  >
                    {state === 'done' ? 'check' : iconMap[step]}
                  </span>
                </div>
                <div className="text-center">
                  <p
                    className={`font-bold text-sm capitalize ${
                      state === 'upcoming' ? 'text-outline' : 'text-on-surface'
                    }`}
                  >
                    {step}
                  </p>
                  <p className="text-[10px] text-on-surface-variant">
                    {step === 'pending'
                      ? formatDate(job.createdAt).split(',')[0]
                      : step === 'processing' && job.status !== 'pending'
                      ? formatDate(job.updatedAt).split(',')[0]
                      : step === 'completed' && job.status === 'completed'
                      ? formatDate(job.updatedAt).split(',')[0]
                      : step === 'cancelled' && job.status === 'cancelled'
                      ? formatDate(job.updatedAt).split(',')[0]
                      : step === 'failed' && job.status === 'failed'
                      ? formatDate(job.updatedAt).split(',')[0]
                      : '—'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Cancelled/Failed state note */}
        {(job.status === 'cancelled' ||
          job.status === 'cancelling' ||
          job.status === 'failed') && (
          <div className="mt-8 flex items-center gap-3 text-sm text-on-surface-variant">
            <StatusBadge status={job.status} />
            <span>
              {job.status === 'failed' && job.errorMessage
                ? job.errorMessage
                : `Job transitioned to ${job.status} state.`}
            </span>
          </div>
        )}
      </section>

      {/* Info Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Metadata */}
        <div className="lg:col-span-1 bg-white border border-outline-variant p-8 rounded-xl flex flex-col gap-6">
          <h3 className="font-headline text-primary font-extrabold text-xl">
            Governance Details
          </h3>
          <div className="space-y-5">
            {[
              { label: 'Job Type', value: <JobTypeBadge type={job.jobType} /> },
              { label: 'Job ID', value: <span className="font-mono text-xs">{job.id}</span> },
              {
                label: 'Created At',
                value: formatDate(job.createdAt),
              },
              {
                label: 'Last Updated',
                value: formatDate(job.updatedAt),
              },
              {
                label: 'Retry Count',
                value:
                  job.retryCount > 0 ? (
                    <span className="px-2 py-0.5 bg-error-container text-on-error-container text-[10px] font-black rounded uppercase">
                      {job.retryCount} / 3
                    </span>
                  ) : (
                    '0 / 3'
                  ),
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex justify-between items-center py-2 border-b border-outline-variant/10 last:border-0"
              >
                <span className="text-on-surface-variant text-sm font-medium">{label}</span>
                <span className="font-bold text-sm text-on-surface text-right max-w-[60%]">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Config JSON */}
        <div className="lg:col-span-2 bg-[#0d1117] rounded-xl overflow-hidden shadow-2xl">
          <div className="bg-slate-800/50 px-6 py-3 flex items-center justify-between border-b border-slate-700">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="ml-4 text-slate-400 font-mono text-xs">
                configuration_manifest.json
              </span>
            </div>
          </div>
          <div className="p-8 font-mono text-sm leading-relaxed text-indigo-100 overflow-x-auto min-h-[200px]">
            {configJson ? (
              <pre className="text-indigo-100 whitespace-pre-wrap break-all">{configJson}</pre>
            ) : (
              <p className="text-slate-500 italic">No configuration provided.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
