import { AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react'
import type { DocumentResponse } from '../lib/types'

type Status = DocumentResponse['status']

interface StatusConfig {
  label: string
  className: string
  icon: React.ReactNode
}

const STATUS_CONFIG: Record<Status, StatusConfig> = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-100/90 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700/60',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  processed: {
    label: 'Processed',
    className: 'bg-sky-100/90 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-700/60',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  failed: {
    label: 'Failed',
    className: 'bg-rose-100/90 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700/60',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  approved: {
    label: 'Approved',
    className: 'bg-emerald-100/90 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700/60',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-slate-200/90 text-slate-700 border-slate-300 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
}

interface StatusBadgeProps {
  status: Status
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    icon: <Clock className="w-3.5 h-3.5" />,
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.className}`}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  )
}
