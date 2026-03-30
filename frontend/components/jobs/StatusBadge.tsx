import { JobStatus } from '@/utils/interfaces';

interface StatusBadgeProps {
  status: JobStatus;
}

const statusConfig: Record<
  JobStatus,
  { bg: string; text: string; dot: string; spin?: boolean; pulse?: boolean }
> = {
  completed: {
    bg: 'bg-secondary-container',
    text: 'text-on-secondary-fixed',
    dot: 'bg-secondary',
  },
  processing: {
    bg: 'bg-primary-container',
    text: 'text-on-primary-container',
    dot: 'bg-primary',
    spin: true,
  },
  failed: {
    bg: 'bg-error-container',
    text: 'text-on-error-container',
    dot: 'bg-error',
  },
  pending: {
    bg: 'bg-surface-container',
    text: 'text-on-surface-variant',
    dot: 'bg-outline',
  },
  cancelling: {
    bg: 'bg-error-container',
    text: 'text-on-error-container',
    dot: 'bg-error',
    pulse: true,
  },
  cancelled: {
    bg: 'bg-surface-container-high',
    text: 'text-on-surface-variant',
    dot: 'bg-outline',
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dot} ${config.spin ? 'animate-pulse' : ''} ${config.pulse ? 'animate-pulse' : ''}`}
      />
      <span className="capitalize">{status}</span>
    </span>
  );
}
