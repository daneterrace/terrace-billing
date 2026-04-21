'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Wrench, Clock, CheckCircle, XCircle, AlertCircle, ChevronRight } from 'lucide-react'
import Link from 'next/link'

type Job = {
  id: string
  title: string
  description: string | null
  category: string
  status: string
  location_in_centre: string | null
  created_at: string
  centre: { name: string } | null
  logged_by_profile: { full_name: string } | null
  assigned_to_profile: { full_name: string } | null
  quote_count?: number
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: any }> = {
  logged:           { label: 'Logged',           bg: '#f5f5f5', color: '#888',    icon: Clock },
  quotes_requested: { label: 'Quotes requested', bg: '#fef3dc', color: '#7d5a00', icon: Clock },
  quotes_uploaded:  { label: 'Quotes uploaded',  bg: '#eaf4fd', color: '#1a5276', icon: AlertCircle },
  approved:         { label: 'Approved',         bg: '#e8f5ee', color: '#1a472a', icon: CheckCircle },
  in_progress:      { label: 'In progress',      bg: '#f0eeff', color: '#4a3ab5', icon: Wrench },
  completed:        { label: 'Completed',        bg: '#e8f5ee', color: '#1a472a', icon: CheckCircle },
  rejected:         { label: 'Rejected',         bg: '#fff0f0', color: '#c0392b', icon: XCircle },
}

const CATEGORIES = ['all', 'electrical', 'plumbing', 'structural', 'cleaning', 'security', 'equipment', 'general']

export default function MaintenancePage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [centres, setCentres] = useState<{ id: string; name: string }[]>([])
  const [filterCentre, setFilterCentre] = useState('all')

  useEffect(() => {
    loadJobs()
    loadCentres()
  }, [])

  async function loadCentres() {
    const supabase = createClient()
    const { data } = await supabase.from('centres').select('id, name').eq('is_active', true).order('name')
    setCentres(data ?? [])
  }

  async function loadJobs() {
    const supabase = createClient()
    const { data } = await supabase
      .from('maintenance_jobs')
      .select(`
        id, title, description, category, status, location_in_centre, created_at,
        centre:centres(name),
        logged_by_profile:profiles!maintenance_jobs_logged_by_fkey(full_name),
        assigned_to_profile:profiles!maintenance_jobs_assigned_to_fkey(full_name)
      `)
      .order('created_at', { ascending: false })

    // Get quote counts
    const { data: quotes } = await supabase
      .from('maintenance_quotes')
      .select('job_id')

    const quoteCounts = new Map<string, number>()
    ;(quotes ?? []).forEach((q: any) => {
      quoteCounts.set(q.job_id, (quoteCounts.get(q.job_id) ?? 0) + 1)
    })

    setJobs((data ?? []).map((j: any) => ({
      ...j,
      quote_count: quoteCounts.get(j.id) ?? 0,
    })))
    setLoading(false)
  }

  const filtered = jobs
    .filter(j => filterStatus === 'all' || j.status === filterStatus)
    .filter(j => filterCategory === 'all' || j.category === filterCategory)
    .filter(j => filterCentre === 'all' || (j.centre as any)?.name === centres.find(c => c.id === filterCentre)?.name)

  const statusCounts = Object.keys(STATUS_CONFIG).reduce((acc, s) => {
    acc[s] = jobs.filter(j => j.status === s).length
    return acc
  }, {} as Record<string, number>)

  if (loading) return <div className="p-8"><p style={{ color: '#888' }}>Loading...</p></div>

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-medium" style={{ color: '#1a1a18' }}>Maintenance</h1>
          <p className="text-sm mt-1" style={{ color: '#888' }}>
            {jobs.length} jobs · {statusCounts['quotes_uploaded'] ?? 0} awaiting approval
          </p>
        </div>
        <Link
          href="/dashboard/maintenance/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white"
          style={{ background: 'var(--color-brand)' }}
        >
          <Plus size={15} />
          Log new job
        </Link>
      </div>

      {/* Status summary cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { key: 'logged', label: 'Logged' },
          { key: 'quotes_uploaded', label: 'Awaiting approval' },
          { key: 'approved', label: 'Approved' },
          { key: 'completed', label: 'Completed' },
        ].map(s => {
          const config = STATUS_CONFIG[s.key]
          const Icon = config.icon
          return (
            <button key={s.key}
              onClick={() => setFilterStatus(filterStatus === s.key ? 'all' : s.key)}
              className="rounded-xl p-4 text-left transition-all"
              style={{
                background: filterStatus === s.key ? config.bg : '#fff',
                border: `1px solid ${filterStatus === s.key ? config.color + '40' : '#ece9e3'}`,
              }}>
              <div className="flex items-center justify-between mb-2">
                <Icon size={16} style={{ color: config.color }} />
                <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ background: config.bg, color: config.color }}>
                  {statusCounts[s.key] ?? 0}
                </span>
              </div>
              <p className="text-xs" style={{ color: '#888' }}>{s.label}</p>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <select value={filterCentre} onChange={(e) => setFilterCentre(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{ border: '1px solid #e2e0da', background: '#fff', color: '#1a1a18' }}>
          <option value="all">All centres</option>
          {centres.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none capitalize"
          style={{ border: '1px solid #e2e0da', background: '#fff', color: '#1a1a18' }}>
          {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c === 'all' ? 'All categories' : c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        {filterStatus !== 'all' && (
          <button onClick={() => setFilterStatus('all')}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ background: '#f5f5f5', color: '#888' }}>
            Clear filter ×
          </button>
        )}
      </div>

      {/* Jobs list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
          <Wrench size={24} style={{ color: '#ccc', margin: '0 auto 12px' }} />
          <p className="text-sm font-medium" style={{ color: '#888' }}>No maintenance jobs found.</p>
          <Link href="/dashboard/maintenance/new"
            className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium"
            style={{ color: 'var(--color-brand-light)' }}>
            <Plus size={14} /> Log the first job
          </Link>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #ece9e3', background: '#fff' }}>
          {filtered.map((job, i) => {
            const config = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.logged
            const Icon = config.icon
            return (
              <Link key={job.id} href={`/dashboard/maintenance/${job.id}`}
                className="flex items-center justify-between px-5 py-4 transition-colors"
                style={{ borderTop: i > 0 ? '1px solid #f0ede7' : 'none', textDecoration: 'none' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#fafaf8')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: config.bg }}>
                    <Icon size={16} style={{ color: config.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>{job.title}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: config.bg, color: config.color }}>
                        {config.label}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                        style={{ background: '#f5f5f5', color: '#888' }}>
                        {job.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <p className="text-xs" style={{ color: '#aaa' }}>
                        {(job.centre as any)?.name ?? '—'}
                      </p>
                      {job.location_in_centre && (
                        <p className="text-xs" style={{ color: '#aaa' }}>· {job.location_in_centre}</p>
                      )}
                      <p className="text-xs" style={{ color: '#aaa' }}>
                        · {new Date(job.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      {(job.quote_count ?? 0) > 0 && (
                        <p className="text-xs" style={{ color: '#2980b9' }}>
                          · {job.quote_count} quote{job.quote_count !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {job.assigned_to_profile && (
                    <p className="text-xs hidden sm:block" style={{ color: '#888' }}>
                      Assigned to {(job.assigned_to_profile as any)?.full_name}
                    </p>
                  )}
                  <ChevronRight size={16} style={{ color: '#ccc' }} />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}