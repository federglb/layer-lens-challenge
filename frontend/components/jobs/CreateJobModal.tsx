'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createJob } from '@/utils/mutations';
import { useToast } from '@/components/ui/Toast';

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const JOB_TYPES = ['process', 'analyze', 'export'] as const;

export default function CreateJobModal({ isOpen, onClose }: CreateJobModalProps) {
  const [name, setName] = useState('');
  const [jobType, setJobType] = useState<'process' | 'analyze' | 'export'>('process');
  const [configText, setConfigText] = useState('');
  const [forceFailure, setForceFailure] = useState(false);
  const [nameError, setNameError] = useState('');
  const [configError, setConfigError] = useState('');
  const [succeeded, setSucceeded] = useState(false);
  const [createdJobName, setCreatedJobName] = useState('');

  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createJob,
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setCreatedJobName(job.name);
      setSucceeded(true);
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to create job';
      addToast({ type: 'error', title: 'Creation failed', message: msg });
    },
  });

  // Auto-close 1.5s after success
  useEffect(() => {
    if (!succeeded) return;
    const timer = setTimeout(() => {
      onClose();
    }, 1500);
    return () => clearTimeout(timer);
  }, [succeeded, onClose]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setJobType('process');
      setConfigText('');
      setForceFailure(false);
      setNameError('');
      setConfigError('');
      setSucceeded(false);
      setCreatedJobName('');
    }
  }, [isOpen]);

  function handleClose() {
    if (mutation.isPending) return;
    onClose();
  }

  function validateConfig(text: string): Record<string, unknown> | null {
    if (!text.trim()) return undefined as any;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let hasError = false;

    if (!name.trim()) {
      setNameError('Job name is required');
      hasError = true;
    } else {
      setNameError('');
    }

    const parsedConfig = validateConfig(configText);
    if (configText.trim() && parsedConfig === null) {
      setConfigError('Invalid JSON format');
      hasError = true;
    } else {
      setConfigError('');
    }

    if (hasError) return;

    mutation.mutate({
      name: name.trim(),
      job_type: jobType,
      config: configText.trim() ? parsedConfig! : undefined,
      force_failure: forceFailure || undefined,
    });
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-on-surface/30 backdrop-blur-[8px] animate-fade-in">
      <div
        className="w-full max-w-2xl bg-white rounded-xl border border-outline-variant shadow-xl overflow-hidden flex flex-col animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {succeeded ? (
          /* ── Success state ── */
          <div className="px-8 py-16 flex flex-col items-center gap-6 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-on-secondary-fixed">
                check
              </span>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold font-headline tracking-tight text-on-surface">
                Job Created
              </h2>
              <p className="text-on-surface-variant text-sm">
                <span className="font-bold text-on-surface">&ldquo;{createdJobName}&rdquo;</span>{' '}
                has been queued for processing.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-on-surface-variant/60 font-medium">
              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor" />
              </svg>
              Closing…
            </div>
          </div>
        ) : (
          <>
            {/* ── Header ── */}
            <div className="px-8 pt-8 pb-6 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-extrabold font-headline tracking-tight text-on-surface">
                  Create Job
                </h2>
                <p className="text-on-surface-variant text-sm mt-1">
                  Configure a new workflow for the ledger.
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={mutation.isPending}
                className="p-2 hover:bg-surface-container-high rounded-full transition-colors group"
              >
                <span className="material-symbols-outlined text-outline group-hover:text-primary">
                  close
                </span>
              </button>
            </div>

            {/* ── Form ── */}
            <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-8">
              {/* Job Name */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label
                    htmlFor="job-name"
                    className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant"
                  >
                    Job Name
                  </label>
                  {nameError && (
                    <span className="text-[10px] text-error font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">error</span>
                      {nameError}
                    </span>
                  )}
                </div>
                <input
                  id="job-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (e.target.value.trim()) setNameError('');
                  }}
                  placeholder="e.g. Q4 Regional Ledger Audit"
                  className={`w-full bg-surface-container-low border-0 border-b-2 ${
                    nameError ? 'border-error/50' : 'border-primary/20'
                  } focus:border-primary focus:ring-0 px-0 py-3 text-on-surface placeholder:text-outline/50 transition-all font-medium outline-none`}
                />
              </div>

              {/* Job Type */}
              <div className="space-y-2">
                <label
                  htmlFor="job-type"
                  className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant"
                >
                  Job Type
                </label>
                <div className="relative">
                  <select
                    id="job-type"
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value as typeof jobType)}
                    className="w-full appearance-none bg-surface-container-low border-0 border-b-2 border-primary/20 focus:border-primary focus:ring-0 px-0 py-3 text-on-surface transition-all font-medium cursor-pointer outline-none"
                  >
                    {JOB_TYPES.map((t) => (
                      <option key={t} value={t} className="capitalize">
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">
                    <span className="material-symbols-outlined text-outline">unfold_more</span>
                  </div>
                </div>
              </div>

              {/* Config JSON */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label
                    htmlFor="config"
                    className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant"
                  >
                    Configuration (JSON)
                  </label>
                  {configError && (
                    <span className="text-[10px] text-error font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">error</span>
                      {configError}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <textarea
                    id="config"
                    value={configText}
                    onChange={(e) => {
                      setConfigText(e.target.value);
                      if (configError) setConfigError('');
                    }}
                    placeholder={'{ "parameters": { "depth": "full" } }'}
                    rows={6}
                    className={`w-full bg-surface-container-low border-0 border-b-2 ${
                      configError ? 'border-error/50' : 'border-primary/20'
                    } focus:border-primary focus:ring-0 px-4 py-4 text-on-surface placeholder:text-outline/40 transition-all font-mono text-sm leading-relaxed rounded-t-lg outline-none resize-none`}
                  />
                  {configText.trim() && !configError && (
                    <div className="absolute bottom-4 right-4 text-[10px] text-secondary font-mono pointer-events-none">
                      VALID JSON
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  Optional. Define custom execution parameters in valid JSON format.
                </p>
              </div>

              {/* Force failure */}
              <label className="flex items-center gap-3 cursor-pointer group w-fit">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={forceFailure}
                    onChange={(e) => setForceFailure(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    forceFailure
                      ? 'bg-error border-error'
                      : 'border-outline/40 group-hover:border-error/60'
                  }`}>
                    {forceFailure && (
                      <span className="material-symbols-outlined text-white text-sm leading-none">check</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className={`text-sm font-bold transition-colors ${forceFailure ? 'text-error' : 'text-on-surface-variant group-hover:text-on-surface'}`}>
                    Make this job fail
                  </p>
                  <p className="text-[11px] text-on-surface-variant/60">
                    Job will transition: Pending → Processing → Failed
                  </p>
                </div>
              </label>

              {/* Footer actions */}
              <div className="pt-6 flex flex-col sm:flex-row items-center justify-end gap-4 border-t border-outline-variant/10">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={mutation.isPending}
                  className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold text-primary hover:bg-surface-container-high rounded-full transition-colors disabled:opacity-50 order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="w-full sm:w-auto relative px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-2 order-1 sm:order-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {mutation.isPending ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor" />
                      </svg>
                      <span>Creating…</span>
                    </>
                  ) : (
                    <span>Create Job</span>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
