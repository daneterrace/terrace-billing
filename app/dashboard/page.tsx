export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { Building2, Users, FileText, TrendingUp } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [centresRes, tenantsRes] = await Promise.all([
    supabase.from('centres').select('id, name, is_active').eq('is_active', true),
    supabase.from('tenants').select('id, status, centre_id'),
  ])

  const centres = centresRes.data ?? []
  const tenants = tenantsRes.data ?? []
  const activeTenants = tenants.filter((t) => t.status === 'active')

  const stats = [
    {
      label: 'Active centres',
      value: centres.length,
      icon: Building2,
      color: '#1a472a',
      bg: '#e8f5ee',
    },
    {
      label: 'Total tenants',
      value: tenants.length,
      icon: Users,
      color: '#1a5276',
      bg: '#eaf4fd',
    },
    {
      label: 'Active tenants',
      value: activeTenants.length,
      icon: TrendingUp,
      color: '#7d6608',
      bg: '#fef9e7',
    },
    {
      label: 'Invoices this month',
      value: 0,
      icon: FileText,
      color: '#6c3483',
      bg: '#f5eef8',
    },
  ]

  const now = new Date()
  const monthName = now.toLocaleString('default', { month: 'long' })

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-medium" style={{ color: '#1a1a18' }}>Overview</h1>
        <p className="text-sm mt-1" style={{ color: '#888' }}>
          {monthName} {now.getFullYear()} · Utility billing dashboard
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-5"
            style={{ background: '#fff', border: '1px solid #ece9e3' }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
              style={{ background: s.bg }}
            >
              <s.icon size={18} style={{ color: s.color }} strokeWidth={1.75} />
            </div>
            <p className="text-2xl font-semibold" style={{ color: '#1a1a18' }}>{s.value}</p>
            <p className="text-sm mt-0.5" style={{ color: '#888' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Centres grid */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-medium" style={{ color: '#1a1a18' }}>Your centres</h2>
          <a
            href="/dashboard/centres"
            className="text-sm transition-colors"
            style={{ color: 'var(--color-brand-light)' }}
          >
            View all →
          </a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {centres.map((centre) => {
            const centreTenantsCount = tenants.filter((t) => t.centre_id === centre.id).length
            const activeCount = tenants.filter((t) => t.centre_id === centre.id && t.status === 'active').length
            return (
              <a
                key={centre.id}
                href={`/dashboard/centres/${centre.id}`}
                className="block rounded-xl p-4 transition-all"
                style={{
                  background: '#fff',
                  border: '1px solid #ece9e3',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-brand-light)'
                  e.currentTarget.style.boxShadow = '0 2px 12px rgba(26,71,42,0.08)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#ece9e3'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 text-xs font-semibold"
                  style={{ background: 'var(--color-brand-muted)', color: 'var(--color-brand)' }}
                >
                  {centre.name.charAt(0)}
                </div>
                <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>{centre.name}</p>
                <p className="text-xs mt-1" style={{ color: '#888' }}>
                  {activeCount} active · {centreTenantsCount} total
                </p>
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}
