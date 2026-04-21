'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building2, Users, FileText, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const [centres, setCentres] = useState<any[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [c, t] = await Promise.all([
        supabase.from('centres').select('*').eq('is_active', true),
        supabase.from('tenants').select('id, status, centre_id'),
      ])
      setCentres(c.data ?? [])
      setTenants(t.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const activeTenants = tenants.filter((t) => t.status === 'active')
  const now = new Date()
  const monthName = now.toLocaleString('default', { month: 'long' })

  const stats = [
    { label: 'Active centres', value: centres.length, icon: Building2, color: '#1a472a', bg: '#e8f5ee' },
    { label: 'Total tenants', value: tenants.length, icon: Users, color: '#1a5276', bg: '#eaf4fd' },
    { label: 'Active tenants', value: activeTenants.length, icon: TrendingUp, color: '#7d6608', bg: '#fef9e7' },
    { label: 'Invoices this month', value: 0, icon: FileText, color: '#6c3483', bg: '#f5eef8' },
  ]

  if (loading) return (
    <div className="p-8">
      <p style={{ color: '#888' }}>Loading...</p>
    </div>
  )

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-medium" style={{ color: '#1a1a18' }}>Overview</h1>
        <p className="text-sm mt-1" style={{ color: '#888' }}>
          {monthName} {now.getFullYear()} · Utility billing dashboard
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl p-5" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: s.bg }}>
              <s.icon size={18} style={{ color: s.color }} strokeWidth={1.75} />
            </div>
            <p className="text-2xl font-semibold" style={{ color: '#1a1a18' }}>{s.value}</p>
            <p className="text-sm mt-0.5" style={{ color: '#888' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-medium" style={{ color: '#1a1a18' }}>Your centres</h2>
          <Link href="/dashboard/centres" className="text-sm" style={{ color: 'var(--color-brand-light)' }}>
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {centres.map((centre) => {
            const centreTenantsCount = tenants.filter((t) => t.centre_id === centre.id).length
            const activeCount = tenants.filter((t) => t.centre_id === centre.id && t.status === 'active').length
            return (
              
                key={centre.id}
                href={`/dashboard/centres/${centre.id}`}
                className="block rounded-xl p-4 transition-all"
                style={{ background: '#fff', border: '1px solid #ece9e3', textDecoration: 'none' }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 text-xs font-semibold"
                  style={{ background: 'var(--color-brand-muted)', color: 'var(--color-brand)' }}>
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