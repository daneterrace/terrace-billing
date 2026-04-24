'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Wifi, Zap, Clock, AlertCircle, CheckCircle, Wrench } from 'lucide-react'
import Link from 'next/link'

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: any }> = {
  logged:           { label: 'Logged',            bg: '#f5f5f5', color: '#888',    icon: Clock },
  quotes_requested: { label: 'Quotes requested',  bg: '#fef3dc', color: '#7d5a00', icon: Clock },
  quotes_uploaded:  { label: 'Awaiting approval', bg: '#eaf4fd', color: '#1a5276', icon: AlertCircle },
  approved:         { label: 'Approved',          bg: '#e8f5ee', color: '#1a472a', icon: CheckCircle },
  in_progress:      { label: 'In progress',       bg: '#f0eeff', color: '#4a3ab5', icon: Wrench },
  rejected:         { label: 'Rejected',          bg: '#fff0f0', color: '#c0392b', icon: AlertCircle },
}

function LineChart({ data, color = '#1a472a' }: { data: number[]; color?: string }) {
  if (!data.length) return null
  const max = Math.max(...data, 1)
  const w = 600; const h = 80
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 80 }}>
      <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" points={points} />
      <polyline fill={color + '18'} stroke="none" points={`0,${h} ${points} ${w},${h}`} />
    </svg>
  )
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [centres, setCentres] = useState<any[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [activeJobs, setActiveJobs] = useState<any[]>([])
  const [expiringTenants, setExpiringTenants] = useState<any[]>([])
  const [internetStats, setInternetStats] = useState<any[]>([])
  const [generatorStats, setGeneratorStats] = useState<any[]>([])
  const [leaseDays, setLeaseDays] = useState(60)
  const [sectionOrder, setSectionOrder] = useState([
    'maintenance', 'foot_traffic', 'lease_renewals', 'internet', 'generator', 'centres'
  ])
  const [footTrafficData] = useState<number[]>(
    Array.from({ length: 30 }, () => Math.floor(Math.random() * 400 + 200))
  )

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const supabase = createClient()

    const [settingsRes, centresRes, tenantsRes, jobsRes, internetRes, genRes] = await Promise.all([
      supabase.from('dashboard_settings').select('key, value').in('key', ['lease_renewal_days', 'overview_section_order']),
      supabase.from('centres').select('id, name').eq('is_active', true).order('name'),
      supabase.from('tenants').select('id, company_name, lease_end, centre_id, centre:centres(name)').eq('status', 'active'),
      supabase.from('maintenance_jobs').select('id, title, status, created_at, centre:centres(name)')
        .not('status', 'in', '("completed","rejected")').order('created_at', { ascending: false }).limit(6),
      supabase.from('billing_line_items').select('tenant_id, sell_price, cost_price, tenants(centre_id, centres(name))').eq('utility_type', 'internet'),
      supabase.from('generator_monthly').select('centre_id, total_kwh_generated, fuel_cost, opex_cost, centres(name)').eq('period_month', currentMonth).eq('period_year', currentYear),
    ])

    // Apply settings
    settingsRes.data?.forEach((row: any) => {
      if (row.key === 'lease_renewal_days') setLeaseDays(Number(row.value) || 60)
      if (row.key === 'overview_section_order') {
        try { setSectionOrder(JSON.parse(row.value)) } catch {}
      }
    })

    setCentres(centresRes.data ?? [])
    const allTenants = tenantsRes.data ?? []
    setTenants(allTenants)
    setActiveJobs(jobsRes.data as any ?? [])

    // Expiring leases
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + leaseDays)
    setExpiringTenants(
      allTenants.filter((t: any) => {
        if (!t.lease_end) return false
        const end = new Date(t.lease_end)
        return end >= now && end <= cutoff
      }).sort((a: any, b: any) => new Date(a.lease_end).getTime() - new Date(b.lease_end).getTime())
    )

    // Internet stats
    const centreMap = new Map<string, any>()
    ;(internetRes.data ?? []).forEach((item: any) => {
      const name = item.tenants?.centres?.name
      if (!name) return
      const s = centreMap.get(name) ?? { centre_name: name, revenue: 0, cost: 0, tenant_count: 0 }
      s.revenue += item.sell_price ?? 0
      s.cost += item.cost_price ?? 0
      s.tenant_count++
      centreMap.set(name, s)
    })
    setInternetStats(Array.from(centreMap.values()))

    setGeneratorStats((genRes.data ?? []).map((g: any) => ({
      centre_name: g.centres?.name ?? 'Unknown',
      total_kwh: g.total_kwh_generated ?? 0,
      total_cost: (g.fuel_cost ?? 0) + (g.opex_cost ?? 0),
    })))

    setLoading(false)
  }

  const totalRevenue = internetStats.reduce((s, i) => s + i.revenue, 0)
  const totalCost = internetStats.reduce((s, i) => s + i.cost, 0)
  const totalKwh = generatorStats.reduce((s, g) => s + g.total_kwh, 0)
  const urgentJobs = activeJobs.filter(j => j.status === 'quotes_uploaded')

  const SECTIONS: Record<string, React.ReactNode> = {
    maintenance: (
      <section key="maintenance" className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-medium" style={{ color: '#1a1a18' }}>Maintenance</h2>
            {urgentJobs.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#eaf4fd', color: '#1a5276' }}>
                {urgentJobs.length} awaiting approval
              </span>
            )}
          </div>
          <Link href="/dashboard/maintenance" className="text-sm" style={{ color: 'var(--color-brand-light)', textDecoration: 'none' }}>View all →</Link>
        </div>
        {activeJobs.length === 0 ? (
          <div className="rounded-xl p-6 text-center" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
            <p className="text-sm" style={{ color: '#aaa' }}>No active maintenance jobs.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeJobs.map((job: any) => {
              const config = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.logged
              const Icon = config.icon
              return (
                <Link key={job.id} href={`/dashboard/maintenance/${job.id}`}
                  className="rounded-xl p-4 block transition-all"
                  style={{ background: '#fff', border: `1px solid ${job.status === 'quotes_uploaded' ? '#bde0f5' : '#ece9e3'}`, textDecoration: 'none' }}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: config.bg }}>
                      <Icon size={13} style={{ color: config.color }} />
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: config.bg, color: config.color }}>{config.label}</span>
                  </div>
                  <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>{job.title}</p>
                  <p className="text-xs mt-1" style={{ color: '#aaa' }}>{(job.centre as any)?.name} · {new Date(job.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    ),

    foot_traffic: (
      <section key="foot_traffic" className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-medium" style={{ color: '#1a1a18' }}>Foot traffic</h2>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#fef3dc', color: '#7d5a00' }}>Camera API not connected</span>
          </div>
          <p className="text-xs" style={{ color: '#aaa' }}>Last 30 days · Sample data</p>
        </div>
        <div className="rounded-xl p-5" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-2xl font-semibold" style={{ color: '#1a1a18' }}>{footTrafficData.reduce((a, b) => a + b, 0).toLocaleString()}</p>
              <p className="text-xs mt-0.5" style={{ color: '#888' }}>Total vehicles this month (sample)</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>~{Math.round(footTrafficData.reduce((a, b) => a + b, 0) / 30).toLocaleString()} /day</p>
              <p className="text-xs" style={{ color: '#888' }}>daily average</p>
            </div>
          </div>
          <LineChart data={footTrafficData} />
          <div className="flex justify-between mt-1">
            <p className="text-xs" style={{ color: '#aaa' }}>30 days ago</p>
            <p className="text-xs" style={{ color: '#aaa' }}>Today</p>
          </div>
        </div>
      </section>
    ),

    lease_renewals: (
      <section key="lease_renewals" className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-medium" style={{ color: '#1a1a18' }}>Lease renewals</h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: expiringTenants.length > 0 ? '#fff0f0' : '#f5f5f5', color: expiringTenants.length > 0 ? '#c0392b' : '#888' }}>
              {expiringTenants.length} expiring in {leaseDays} days
            </span>
          </div>
          <Link href="/dashboard/tenants" className="text-sm" style={{ color: 'var(--color-brand-light)', textDecoration: 'none' }}>View all →</Link>
        </div>
        {expiringTenants.length === 0 ? (
          <div className="rounded-xl p-6 text-center" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
            <p className="text-sm" style={{ color: '#aaa' }}>No leases expiring in the next {leaseDays} days.</p>
            <p className="text-xs mt-1" style={{ color: '#aaa' }}>Add lease end dates to tenants to track renewals.</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #ece9e3', background: '#fff' }}>
            {expiringTenants.map((tenant: any, i: number) => {
              const daysLeft = Math.ceil((new Date(tenant.lease_end).getTime() - now.getTime()) / 86400000)
              return (
                <Link key={tenant.id} href={`/dashboard/tenants/${tenant.id}`}
                  className="flex items-center justify-between px-5 py-3.5 transition-colors"
                  style={{ borderTop: i > 0 ? '1px solid #f0ede7' : 'none', textDecoration: 'none' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#fafaf8')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>{tenant.company_name}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#aaa' }}>
                      {(tenant.centre as any)?.name} · Expires {new Date(tenant.lease_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{ background: daysLeft <= 14 ? '#fff0f0' : daysLeft <= 30 ? '#fef3dc' : '#f5f5f5', color: daysLeft <= 14 ? '#c0392b' : daysLeft <= 30 ? '#7d5a00' : '#888' }}>
                    {daysLeft} days
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    ),

    internet: (
      <section key="internet" className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wifi size={15} style={{ color: '#2980b9' }} />
            <h2 className="text-base font-medium" style={{ color: '#1a1a18' }}>Internet revenue</h2>
          </div>
          <Link href="/dashboard/internet" className="text-sm" style={{ color: 'var(--color-brand-light)', textDecoration: 'none' }}>Manage →</Link>
        </div>
        <div className="rounded-xl p-5" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[{ label: 'Revenue', value: `$${totalRevenue.toFixed(0)}` }, { label: 'Cost', value: `$${totalCost.toFixed(0)}` }, { label: 'Profit', value: `$${(totalRevenue - totalCost).toFixed(0)}` }].map(s => (
              <div key={s.label} className="rounded-lg p-3" style={{ background: '#f7f6f3' }}>
                <p className="text-xs" style={{ color: '#888' }}>{s.label}</p>
                <p className="text-base font-semibold mt-0.5" style={{ color: '#1a1a18' }}>{s.value}</p>
              </div>
            ))}
          </div>
          {internetStats.length === 0 ? (
            <p className="text-xs text-center py-2" style={{ color: '#aaa' }}>No internet billing data yet.</p>
          ) : internetStats.map((s, i) => (
            <div key={s.centre_name} className="flex items-center justify-between py-2" style={{ borderTop: i > 0 ? '1px solid #f0ede7' : 'none' }}>
              <div>
                <p className="text-sm" style={{ color: '#1a1a18' }}>{s.centre_name}</p>
                <p className="text-xs" style={{ color: '#aaa' }}>{s.tenant_count} tenants</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>${s.revenue.toFixed(0)}</p>
                <p className="text-xs" style={{ color: '#1a6b3a' }}>+${(s.revenue - s.cost).toFixed(0)} profit</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    ),

    generator: (
      <section key="generator" className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap size={15} style={{ color: '#f39c12' }} />
            <h2 className="text-base font-medium" style={{ color: '#1a1a18' }}>Generator usage</h2>
          </div>
          <Link href="/dashboard/generator" className="text-sm" style={{ color: 'var(--color-brand-light)', textDecoration: 'none' }}>Manage →</Link>
        </div>
        <div className="rounded-xl p-5" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[{ label: 'Total kWh', value: totalKwh.toFixed(0) }, { label: 'Total cost', value: `$${generatorStats.reduce((s, g) => s + g.total_cost, 0).toFixed(0)}` }].map(s => (
              <div key={s.label} className="rounded-lg p-3" style={{ background: '#f7f6f3' }}>
                <p className="text-xs" style={{ color: '#888' }}>{s.label}</p>
                <p className="text-base font-semibold mt-0.5" style={{ color: '#1a1a18' }}>{s.value}</p>
              </div>
            ))}
          </div>
          {generatorStats.length === 0 ? (
            <p className="text-xs text-center py-2" style={{ color: '#aaa' }}>No generator data for this month yet.</p>
          ) : generatorStats.map((s, i) => (
            <div key={s.centre_name} className="flex items-center justify-between py-2" style={{ borderTop: i > 0 ? '1px solid #f0ede7' : 'none' }}>
              <p className="text-sm" style={{ color: '#1a1a18' }}>{s.centre_name}</p>
              <div className="text-right">
                <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>{s.total_kwh.toFixed(0)} kWh</p>
                <p className="text-xs" style={{ color: '#aaa' }}>${s.total_cost.toFixed(0)} cost</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    ),

    centres: (
      <section key="centres" className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-medium" style={{ color: '#1a1a18' }}>Centres</h2>
          <Link href="/dashboard/centres" className="text-sm" style={{ color: 'var(--color-brand-light)', textDecoration: 'none' }}>View all →</Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {centres.map((centre: any) => {
            const count = tenants.filter((t: any) => t.centre_id === centre.id).length
            return (
              <Link key={centre.id} href={`/dashboard/centres/${centre.id}`}
                className="rounded-xl p-4 block transition-all"
                style={{ background: '#fff', border: '1px solid #ece9e3', textDecoration: 'none' }}
                onMouseEnter={(ev) => (ev.currentTarget.style.borderColor = 'var(--color-brand-light)')}
                onMouseLeave={(ev) => (ev.currentTarget.style.borderColor = '#ece9e3')}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold mb-3"
                  style={{ background: 'var(--color-brand-muted)', color: 'var(--color-brand)' }}>
                  {centre.name.charAt(0)}
                </div>
                <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>{centre.name}</p>
                <p className="text-xs mt-1" style={{ color: '#888' }}>{count} active tenants</p>
              </Link>
            )
          })}
        </div>
      </section>
    ),
  }

  if (loading) return <div className="p-8"><p style={{ color: '#888' }}>Loading...</p></div>

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-medium" style={{ color: '#1a1a18' }}>Overview</h1>
        <p className="text-sm mt-1" style={{ color: '#888' }}>
          {now.toLocaleString('default', { month: 'long' })} {currentYear} · {centres.length} centres · {tenants.length} active tenants
        </p>
      </div>
      {sectionOrder.map(key => SECTIONS[key]).filter(Boolean)}
    </div>
  )
}