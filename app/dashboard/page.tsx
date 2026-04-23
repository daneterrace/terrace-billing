'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  Wrench, Clock, CheckCircle, AlertCircle, ChevronRight,
  Wifi, Zap, Car, FileText, TrendingUp, TrendingDown
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts'

// ─── Types ───────────────────────────────────────────────────
type MaintenanceJob = {
  id: string
  title: string
  status: string
  category: string
  created_at: string
  centre: any
  assigned_to_profile: any
}

type Tenant = {
  id: string
  company_name: string
  lease_end: string | null
  unit_number: string | null
  centre: any
}

type InternetStat = {
  centre_name: string
  tenant_count: number
  monthly_revenue: number
  monthly_cost: number
}

type GeneratorStat = {
  centre_name: string
  total_kwh: number
  period: string
}

// ─── Status config ────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: any }> = {
  logged:           { label: 'Logged',           bg: '#f5f5f5', color: '#888',    icon: Clock },
  quotes_requested: { label: 'Quotes requested', bg: '#fef3dc', color: '#7d5a00', icon: Clock },
  quotes_uploaded:  { label: 'Quotes uploaded',  bg: '#eaf4fd', color: '#1a5276', icon: AlertCircle },
  approved:         { label: 'Approved',         bg: '#e8f5ee', color: '#1a472a', icon: CheckCircle },
  in_progress:      { label: 'In progress',      bg: '#f0eeff', color: '#4a3ab5', icon: Wrench },
  completed:        { label: 'Completed',        bg: '#e8f5ee', color: '#1a472a', icon: CheckCircle },
  rejected:         { label: 'Rejected',         bg: '#fff0f0', color: '#c0392b', icon: AlertCircle },
}

const ACTIVE_STATUSES = ['logged', 'quotes_requested', 'quotes_uploaded', 'approved', 'in_progress']

// ─── Helpers ──────────────────────────────────────────────────
function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Generate 30 days of placeholder traffic data (replace with real camera data later)
function generateTrafficPlaceholder() {
  const days = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push({
      date: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      cars: 0,
    })
  }
  return days
}

// ─── Custom tooltip ───────────────────────────────────────────
function ChartTooltip({ active, payload, label, unit = '' }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-3 py-2 text-xs shadow-lg"
      style={{ background: '#1a1a18', color: '#fff', border: 'none' }}>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>{label}</p>
      <p className="font-medium">{payload[0].value}{unit}</p>
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────
function SectionHeader({ title, href, count }: { title: string; href?: string; count?: number }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <h2 className="text-base font-medium" style={{ color: '#1a1a18' }}>{title}</h2>
        {count !== undefined && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: '#f5f5f5', color: '#888' }}>{count}</span>
        )}
      </div>
      {href && (
        <Link href={href} className="text-xs flex items-center gap-1"
          style={{ color: 'var(--color-brand-light)', textDecoration: 'none' }}>
          View all <ChevronRight size={12} />
        </Link>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
export default function OverviewPage() {
  const [activeJobs, setActiveJobs] = useState<MaintenanceJob[]>([])
  const [contractsDue, setContractsDue] = useState<Tenant[]>([])
  const [internetStats, setInternetStats] = useState<InternetStat[]>([])
  const [generatorStats, setGeneratorStats] = useState<GeneratorStat[]>([])
  const [trafficData] = useState(generateTrafficPlaceholder())
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const supabase = createClient()

    // 1. Active maintenance jobs
    const { data: jobs } = await supabase
      .from('maintenance_jobs')
      .select(`
        id, title, status, category, created_at,
        centre:centres(name),
        assigned_to_profile:profiles!maintenance_jobs_assigned_to_fkey(full_name)
      `)
      .in('status', ACTIVE_STATUSES)
      .order('created_at', { ascending: false })

    // 2. Tenants with lease ending in next 60 days
    const now = new Date()
    const in60 = new Date(); in60.setDate(in60.getDate() + 60)
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, company_name, lease_end, unit_number, centre:centres(name)')
      .eq('status', 'active')
      .gte('lease_end', now.toISOString().split('T')[0])
      .lte('lease_end', in60.toISOString().split('T')[0])
      .order('lease_end', { ascending: true })

    // 3. Internet revenue per centre
    const { data: internetTenants } = await supabase
      .from('tenant_internet')
      .select(`
        custom_sell_price,
        package:internet_packages(cost_price, sell_price),
        tenant:tenants(centre:centres(name))
      `)

    // Aggregate by centre
    const centreMap: Record<string, InternetStat> = {}
    ;(internetTenants ?? []).forEach((row: any) => {
      const centreName = row.tenant?.centre?.name
      if (!centreName) return
      const revenue = row.custom_sell_price ?? row.package?.sell_price ?? 0
      const cost = row.package?.cost_price ?? 0
      if (!centreMap[centreName]) {
        centreMap[centreName] = { centre_name: centreName, tenant_count: 0, monthly_revenue: 0, monthly_cost: 0 }
      }
      centreMap[centreName].tenant_count++
      centreMap[centreName].monthly_revenue += revenue
      centreMap[centreName].monthly_cost += cost
    })

    // 4. Generator kWh — latest month per centre from billing_line_items
    const { data: genItems } = await supabase
      .from('billing_line_items')
      .select(`
        units_used,
        billing_period:billing_periods(period_month, period_year, centre:centres(name))
      `)
      .eq('utility_type', 'generator')
      .not('units_used', 'is', null)

    const genMap: Record<string, GeneratorStat> = {}
    ;(genItems ?? []).forEach((row: any) => {
      const centreName = row.billing_period?.centre?.name
      if (!centreName) return
      const period = `${row.billing_period?.period_month}/${row.billing_period?.period_year}`
      if (!genMap[centreName]) {
        genMap[centreName] = { centre_name: centreName, total_kwh: 0, period }
      }
      genMap[centreName].total_kwh += row.units_used ?? 0
    })

    setActiveJobs(jobs ?? [])
    setContractsDue(tenants ?? [])
    setInternetStats(Object.values(centreMap).sort((a, b) => b.monthly_revenue - a.monthly_revenue))
    setGeneratorStats(Object.values(genMap).sort((a, b) => b.total_kwh - a.total_kwh))
    setLoading(false)
  }

  const totalInternetRevenue = internetStats.reduce((s, c) => s + c.monthly_revenue, 0)
  const totalInternetCost = internetStats.reduce((s, c) => s + c.monthly_cost, 0)
  const totalInternetMargin = totalInternetRevenue - totalInternetCost
  const totalKwh = generatorStats.reduce((s, c) => s + c.total_kwh, 0)

  if (loading) return (
    <div className="p-8 flex items-center gap-2" style={{ color: '#888' }}>
      <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      <span className="text-sm">Loading...</span>
    </div>
  )

  return (
    <div className="p-8 max-w-6xl space-y-10">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl font-medium" style={{ color: '#1a1a18' }}>Overview</h1>
        <p className="text-sm mt-1" style={{ color: '#888' }}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* ══════════════════════════════════════════
          1. ACTIVE MAINTENANCE JOBS
      ══════════════════════════════════════════ */}
      <section>
        <SectionHeader title="Active Maintenance" href="/dashboard/maintenance" count={activeJobs.length} />
        {activeJobs.length === 0 ? (
          <div className="rounded-xl p-8 text-center" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
            <CheckCircle size={20} style={{ color: '#ccc', margin: '0 auto 8px' }} />
            <p className="text-sm" style={{ color: '#aaa' }}>No active maintenance jobs — all clear.</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #ece9e3', background: '#fff' }}>
            {activeJobs.map((job, i) => {
              const config = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.logged
              const Icon = config.icon
              return (
                <Link key={job.id} href={`/dashboard/maintenance/${job.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors"
                  style={{ borderTop: i > 0 ? '1px solid #f0ede7' : 'none', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fafaf8')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  {/* Status icon */}
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: config.bg }}>
                    <Icon size={14} style={{ color: config.color }} />
                  </div>
                  {/* Title + meta */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#1a1a18' }}>{job.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs" style={{ color: '#aaa' }}>
                        {(job.centre as any)?.name ?? '—'}
                      </span>
                      <span className="text-xs capitalize" style={{ color: '#bbb' }}>· {job.category}</span>
                    </div>
                  </div>
                  {/* Status badge */}
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0 hidden sm:inline-block"
                    style={{ background: config.bg, color: config.color }}>
                    {config.label}
                  </span>
                  {/* Assigned */}
                  {(job.assigned_to_profile as any)?.full_name && (
                    <span className="text-xs shrink-0 hidden md:block" style={{ color: '#aaa' }}>
                      {(job.assigned_to_profile as any).full_name}
                    </span>
                  )}
                  <ChevronRight size={14} style={{ color: '#ddd', shrink: 0 }} />
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════
          2. VEHICLE TRAFFIC (camera placeholder)
      ══════════════════════════════════════════ */}
      <section>
        <SectionHeader title="Vehicle Traffic — Last 30 Days" />
        <div className="rounded-xl p-6" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: '#f5f5f5' }}>
              <Car size={15} style={{ color: '#aaa' }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>Camera integration not yet connected</p>
              <p className="text-xs" style={{ color: '#aaa' }}>Vehicle counts will appear here once cameras are set up</p>
            </div>
            <span className="ml-auto text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: '#fef3dc', color: '#7d5a00' }}>Coming soon</span>
          </div>
          {/* Graph frame — shows flat zero line until real data arrives */}
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={trafficData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ede7" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#bbb' }}
                tickLine={false} axisLine={false}
                interval={4} />
              <YAxis tick={{ fontSize: 10, fill: '#bbb' }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip unit=" cars" />} />
              <Line type="monotone" dataKey="cars" stroke="#ece9e3"
                strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          3. CONTRACTS DUE IN 60 DAYS
      ══════════════════════════════════════════ */}
      <section>
        <SectionHeader title="Contracts Due for Review" href="/dashboard/tenants" count={contractsDue.length} />
        {contractsDue.length === 0 ? (
          <div className="rounded-xl p-8 text-center" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
            <FileText size={20} style={{ color: '#ccc', margin: '0 auto 8px' }} />
            <p className="text-sm" style={{ color: '#aaa' }}>No contracts expiring in the next 60 days.</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #ece9e3', background: '#fff' }}>
            {contractsDue.map((tenant, i) => {
              const days = daysUntil(tenant.lease_end!)
              const urgent = days <= 14
              return (
                <Link key={tenant.id} href={`/dashboard/tenants/${tenant.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors"
                  style={{ borderTop: i > 0 ? '1px solid #f0ede7' : 'none', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fafaf8')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-semibold"
                    style={{
                      background: urgent ? '#fff0f0' : '#fef3dc',
                      color: urgent ? '#c0392b' : '#7d5a00',
                    }}>
                    {days}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>{tenant.company_name}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#aaa' }}>
                      Unit {tenant.unit_number ?? '—'} · {(tenant.centre as any)?.name ?? '—'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium" style={{ color: urgent ? '#c0392b' : '#7d5a00' }}>
                      {days} day{days !== 1 ? 's' : ''} left
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#aaa' }}>{formatDate(tenant.lease_end!)}</p>
                  </div>
                  <ChevronRight size={14} style={{ color: '#ddd' }} />
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════
          4. INTERNET + GENERATOR side by side
      ══════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-5">

        {/* ── Internet ── */}
        <section>
          <SectionHeader title="Internet Revenue" href="/dashboard/internet" />
          <div className="rounded-xl p-5 space-y-4" style={{ background: '#fff', border: '1px solid #ece9e3' }}>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Monthly revenue', value: `$${totalInternetRevenue.toFixed(0)}`, icon: TrendingUp, color: '#1a5276', bg: '#eaf4fd' },
                { label: 'Monthly cost',    value: `$${totalInternetCost.toFixed(0)}`,    icon: TrendingDown, color: '#888', bg: '#f5f5f5' },
                { label: 'Margin',          value: `$${totalInternetMargin.toFixed(0)}`,  icon: Wifi, color: '#1a472a', bg: '#e8f5ee' },
              ].map(s => {
                const Icon = s.icon
                return (
                  <div key={s.label} className="rounded-lg p-3" style={{ background: s.bg }}>
                    <Icon size={13} style={{ color: s.color, marginBottom: 6 }} />
                    <p className="text-base font-semibold leading-none" style={{ color: '#1a1a18' }}>{s.value}</p>
                    <p className="text-xs mt-1" style={{ color: '#888' }}>{s.label}</p>
                  </div>
                )
              })}
            </div>

            {/* Bar chart per centre */}
            {internetStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={internetStats.map(s => ({
                  name: s.centre_name.replace('Terrace ', '').replace('Centre ', 'C'),
                  Revenue: parseFloat(s.monthly_revenue.toFixed(0)),
                  Cost: parseFloat(s.monthly_cost.toFixed(0)),
                }))} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ede7" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#bbb' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#bbb' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="Revenue" fill="#2980b9" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Cost" fill="#bde0f5" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-32 rounded-lg"
                style={{ background: '#fafaf8', border: '1px dashed #e2e0da' }}>
                <p className="text-xs" style={{ color: '#bbb' }}>No internet billing data yet</p>
              </div>
            )}

            {/* Per-centre breakdown */}
            {internetStats.length > 0 && (
              <div className="space-y-1.5 pt-1" style={{ borderTop: '1px solid #f0ede7' }}>
                {internetStats.map(s => (
                  <div key={s.centre_name} className="flex items-center justify-between text-xs">
                    <span style={{ color: '#555' }}>{s.centre_name}</span>
                    <div className="flex items-center gap-3">
                      <span style={{ color: '#aaa' }}>{s.tenant_count} tenant{s.tenant_count !== 1 ? 's' : ''}</span>
                      <span className="font-medium" style={{ color: '#1a1a18' }}>${s.monthly_revenue.toFixed(0)}/mo</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Generator ── */}
        <section>
          <SectionHeader title="Generator Usage" href="/dashboard/generator" />
          <div className="rounded-xl p-5 space-y-4" style={{ background: '#fff', border: '1px solid #ece9e3' }}>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total kWh used', value: `${totalKwh.toFixed(0)} kWh`, icon: Zap, color: '#7d5a00', bg: '#fef3dc' },
                { label: 'Active centres', value: `${generatorStats.length}`, icon: Zap, color: '#4a3ab5', bg: '#f0eeff' },
              ].map(s => {
                const Icon = s.icon
                return (
                  <div key={s.label} className="rounded-lg p-3" style={{ background: s.bg }}>
                    <Icon size={13} style={{ color: s.color, marginBottom: 6 }} />
                    <p className="text-base font-semibold leading-none" style={{ color: '#1a1a18' }}>{s.value}</p>
                    <p className="text-xs mt-1" style={{ color: '#888' }}>{s.label}</p>
                  </div>
                )
              })}
            </div>

            {/* Bar chart per centre */}
            {generatorStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={generatorStats.map(s => ({
                  name: s.centre_name.replace('Terrace ', '').replace('Centre ', 'C'),
                  kWh: parseFloat(s.total_kwh.toFixed(1)),
                }))} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ede7" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#bbb' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#bbb' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip unit=" kWh" />} />
                  <Bar dataKey="kWh" fill="#f39c12" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-32 rounded-lg"
                style={{ background: '#fafaf8', border: '1px dashed #e2e0da' }}>
                <p className="text-xs" style={{ color: '#bbb' }}>No generator billing data yet</p>
              </div>
            )}

            {/* Per-centre breakdown */}
            {generatorStats.length > 0 && (
              <div className="space-y-1.5 pt-1" style={{ borderTop: '1px solid #f0ede7' }}>
                {generatorStats.map(s => (
                  <div key={s.centre_name} className="flex items-center justify-between text-xs">
                    <span style={{ color: '#555' }}>{s.centre_name}</span>
                    <span className="font-medium" style={{ color: '#1a1a18' }}>{s.total_kwh.toFixed(1)} kWh</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

    </div>
  )
}