import type { TenantStatus } from '@/lib/types'

const styles: Record<TenantStatus, { bg: string; color: string; label: string }> = {
  active: { bg: '#e8f5ee', color: '#1a472a', label: 'Active' },
  inactive: { bg: '#f5f5f5', color: '#888', label: 'Inactive' },
  pending: { bg: '#fef3dc', color: '#7d5a00', label: 'Pending' },
}

export default function TenantStatusBadge({ status }: { status: TenantStatus }) {
  const s = styles[status] ?? styles.inactive
  return (
    <span
      className="inline-block text-xs font-medium px-2.5 py-1 rounded-full"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  )
}
