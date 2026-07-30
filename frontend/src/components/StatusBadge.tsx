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
    className: 'bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-100 border-amber-400 dark:border-amber-700 font-bold',
    icon: <Clock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />,
  },
  processed: {
    label: 'Processed',
    className: 'bg-sky-100 dark:bg-sky-950 text-sky-950 dark:text-sky-100 border-sky-400 dark:border-sky-700 font-bold',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-sky-700 dark:text-sky-400" />,
  },
  failed: {
    label: 'Failed',
    className: 'bg-rose-100 dark:bg-rose-950 text-rose-950 dark:text-rose-100 border-rose-400 dark:border-rose-700 font-bold',
    icon: <XCircle className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" />,
  },
  approved: {
    label: 'Approved',
    className: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-950 dark:text-emerald-100 border-emerald-400 dark:border-emerald-700 font-bold',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />,
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-rose-100 dark:bg-rose-950 text-rose-950 dark:text-rose-100 border-rose-400 dark:border-rose-700 font-bold',
    icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" />,
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
