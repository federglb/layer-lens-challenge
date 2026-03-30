import { JobType } from '@/utils/interfaces';

interface JobTypeBadgeProps {
  type: JobType;
}

const iconMap: Record<JobType, string> = {
  process: 'manufacturing',
  analyze: 'analytics',
  export: 'download',
};

export default function JobTypeBadge({ type }: JobTypeBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 bg-surface-container border border-outline-variant rounded-full text-on-surface-variant capitalize">
      <span className="material-symbols-outlined text-[12px]">{iconMap[type]}</span>
      {type}
    </span>
  );
}
