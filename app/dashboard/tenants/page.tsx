import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Wifi, Zap, Flame } from 'lucide-react'
import TenantStatusBadge from '@/components/TenantStatusBadge'

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ centre?: string; status?: string }>
}) {
  const { centre, status } = await searchParams
  const supabase = await createClient()

  const [tenantsRes, centresRes] = await Promise.all([
    supabase
      .from('tenants')
      .select('*, centre:centres(id, name)')
      .order('company_name'),
    supabase.from('centres').select('id, name').eq('is_active', true).order('name'),
  ])

  let tenants = tenantsRes.data ?? []
  if (centre) tenants = tenants.filter((t) => t.centre_id === centre)
  if (status) tenants = tenants.filter((t) => t.status === status)

  const centres = centresRes.data ?? []

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-medium" style={{ color: '#1a1a18' }}>Tenants</h1>
          <p className="text-sm mt-1" style={{ color: '#888' }}>
            {tenants.length} tenant{tenants.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/dashboard/tenants/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: 'var(--color-brand)' }}
        >
          <Plus size={15} />
          Add tenant
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link
          href="/dashboard/tenants"
          className="text-xs px-3 py-1.5 rounded-full transition-all"
          style={
            !centre && !status
              ? { background: 'var(--color-brand)', color: '#fff' }
              : { background: '#fff', color: '#666', border: '1px solid #ece9e3' }
          }
        >
          All
        </Link>
        {(['active', 'pending', 'inactive'] as const).map((s) => (
          <Link
            key={s}
            href={`/dashboard/tenants?status=${s}`}
            className="text-xs px-3 py-1.5 rounded-full capitalize transition-all"
            style={
              status === s
                ? { background: 'var(--color-brand)', color: '#fff' }
                : { background: '#fff', color: '#666', border: '1px solid #ece9e3' }
            }
          >
            {s}
          </Link>
        ))}
        <div className="w-px h-4" style={{ background: '#ece9e3' }} />
        {centres.map((c) => (
          <Link
            key={c.id}
            href={`/dashboard/tenants?centre=${c.id}`}
            className="text-xs px-3 py-1.5 rounded-full transition-all"
            style={
              centre === c.id
                ? { background: 'var(--color-brand)', color: '#fff' }
                : { background: '#fff', color: '#666', border: '1px solid #ece9e3' }
            }
          >
            {c.name}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #ece9e3', background: '#fff' }}>
        <div
          className="grid px-5 py-2.5 text-xs font-medium"
          style={{
            gridTemplateColumns: '1fr 160px 130px 90px 80px',
            color: '#888',
            background: '#fafaf8',
            borderBottom: '1px solid #f0ede7',
          }}
        >
          <span>Company</span>
          <span>Centre</span>
          <span>Contact</span>
          <span>Utilities</span>
          <span>Status</span>
        </div>

        {tenants.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm" style={{ color: '#aaa' }}>No tenants found.</p>
          </div>
        ) : (
          tenants.map((tenant, i) => (
            <Link
              key={tenant.id}
              href={`/dashboard/tenants/${tenant.id}`}
              className="grid px-5 py-3.5 items-center transition-colors"
              style={{
                gridTemplateColumns: '1fr 160px 130px 90px 80px',
                borderTop: i > 0 ? '1px solid #f0ede7' : 'none',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#fafaf8')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>{tenant.company_name}</p>
                <p className="text-xs mt-0.5" style={{ color: '#aaa' }}>Unit {tenant.unit_number ?? '—'}</p>
              </div>
              <p className="text-sm" style={{ color: '#555' }}>
                {(tenant.centre as { name: string } | null)?.name ?? '—'}
              </p>
              <p className="text-sm" style={{ color: '#555' }}>{tenant.contact_name ?? '—'}</p>
              <div className="flex items-center gap-1.5">
                {tenant.has_internet && <Wifi size={13} style={{ color: '#2980b9' }} />}
                {tenant.has_generator && <Zap size={13} style={{ color: '#f39c12' }} />}
                {tenant.has_gas && <Flame size={13} style={{ color: '#e74c3c' }} />}
              </div>
              <TenantStatusBadge status={tenant.status} />
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
