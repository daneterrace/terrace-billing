import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Wifi, Zap, Flame, Droplets } from 'lucide-react'
import TenantStatusBadge from '@/components/TenantStatusBadge'

export default async function CentrePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [centreRes, tenantsRes] = await Promise.all([
    supabase.from('centres').select('*').eq('id', id).single(),
    supabase.from('tenants').select('*').eq('centre_id', id).order('company_name'),
  ])

  if (centreRes.error || !centreRes.data) notFound()

  const centre = centreRes.data
  const tenants = tenantsRes.data ?? []
  const active = tenants.filter((t) => t.status === 'active')

  return (
    <div className="p-8 max-w-5xl">
      {/* Back */}
      <Link
        href="/dashboard/centres"
        className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors"
        style={{ color: '#888', textDecoration: 'none' }}
      >
        <ArrowLeft size={14} />
        All centres
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-medium" style={{ color: '#1a1a18' }}>{centre.name}</h1>
          <p className="text-sm mt-1" style={{ color: '#888' }}>
            {centre.city ?? ''}{centre.address ? ` · ${centre.address}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/centres/${id}/edit`}
            className="px-4 py-2 rounded-lg text-sm transition-all"
            style={{ background: '#fff', border: '1px solid #ece9e3', color: '#444' }}
          >
            Edit centre
          </Link>
          <Link
            href={`/dashboard/tenants/new?centre=${id}`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'var(--color-brand)' }}
          >
            <Plus size={15} />
            Add tenant
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total tenants', value: tenants.length },
          { label: 'Active', value: active.length },
          { label: 'Pending / inactive', value: tenants.length - active.length },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-5" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
            <p className="text-2xl font-semibold" style={{ color: '#1a1a18' }}>{s.value}</p>
            <p className="text-sm mt-0.5" style={{ color: '#888' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tenants table */}
      <div>
        <h2 className="text-base font-medium mb-4" style={{ color: '#1a1a18' }}>Tenants</h2>

        {tenants.length === 0 ? (
          <div
            className="rounded-xl p-12 text-center"
            style={{ background: '#fff', border: '1px solid #ece9e3' }}
          >
            <p className="text-sm" style={{ color: '#888' }}>No tenants yet.</p>
            <Link
              href={`/dashboard/tenants/new?centre=${id}`}
              className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium"
              style={{ color: 'var(--color-brand-light)' }}
            >
              <Plus size={14} /> Add the first tenant
            </Link>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #ece9e3', background: '#fff' }}>
            {/* Table header */}
            <div
              className="grid px-5 py-2.5 text-xs font-medium"
              style={{
                gridTemplateColumns: '1fr 140px 120px 100px 80px',
                color: '#888',
                background: '#fafaf8',
                borderBottom: '1px solid #f0ede7',
              }}
            >
              <span>Company</span>
              <span>Unit</span>
              <span>Contact</span>
              <span>Utilities</span>
              <span>Status</span>
            </div>

            {tenants.map((tenant, i) => (
              <Link
                key={tenant.id}
                href={`/dashboard/tenants/${tenant.id}`}
                className="grid px-5 py-3.5 items-center transition-colors"
                style={{
                  gridTemplateColumns: '1fr 140px 120px 100px 80px',
                  borderTop: i > 0 ? '1px solid #f0ede7' : 'none',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#fafaf8')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>{tenant.company_name}</p>
                  {tenant.email && (
                    <p className="text-xs mt-0.5" style={{ color: '#aaa' }}>{tenant.email}</p>
                  )}
                </div>
                <p className="text-sm" style={{ color: '#555' }}>{tenant.unit_number ?? '—'}</p>
                <p className="text-sm" style={{ color: '#555' }}>{tenant.contact_name ?? '—'}</p>
                <div className="flex items-center gap-1.5">
                  {tenant.has_internet && <Wifi size={13} style={{ color: '#2980b9' }} />}
                  {tenant.has_generator && <Zap size={13} style={{ color: '#f39c12' }} />}
                  {tenant.has_gas && <Flame size={13} style={{ color: '#e74c3c' }} />}
                  {tenant.has_water && <Droplets size={13} style={{ color: '#27ae60' }} />}
                </div>
                <TenantStatusBadge status={tenant.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
