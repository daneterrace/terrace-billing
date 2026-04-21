'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, Wifi, Zap, Flame } from 'lucide-react'

export default function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([])
  const [centres, setCentres] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCentre, setFilterCentre] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [t, c] = await Promise.all([
        supabase.from('tenants').select('*, centre:centres(id, name)').order('company_name'),
        supabase.from('centres').select('id, name').eq('is_active', true).order('name'),
      ])
      setTenants(t.data ?? [])
      setCentres(c.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = tenants
    .filter((t) => filterCentre ? t.centre_id === filterCentre : true)
    .filter((t) => filterStatus ? t.status === filterStatus : true)

  const statusStyle = (status: string) => {
    if (status === 'active') return { background: '#e8f5ee', color: '#1a472a' }
    if (status === 'pending') return { background: '#fef3dc', color: '#7d5a00' }
    return { background: '#f5f5f5', color: '#888' }
  }

  if (loading) return <div className="p-8"><p style={{ color: '#888' }}>Loading...</p></div>

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-medium" style={{ color: '#1a1a18' }}>Tenants</h1>
          <p className="text-sm mt-1" style={{ color: '#888' }}>
            {filtered.length} tenant{filtered.length !== 1 ? 's' : ''}
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
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <button
          onClick={() => { setFilterCentre(''); setFilterStatus('') }}
          className="text-xs px-3 py-1.5 rounded-full transition-all"
          style={
            !filterCentre && !filterStatus
              ? { background: 'var(--color-brand)', color: '#fff' }
              : { background: '#fff', color: '#666', border: '1px solid #ece9e3' }
          }
        >
          All
        </button>
        {['active', 'pending', 'inactive'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
            className="text-xs px-3 py-1.5 rounded-full capitalize transition-all"
            style={
              filterStatus === s
                ? { background: 'var(--color-brand)', color: '#fff' }
                : { background: '#fff', color: '#666', border: '1px solid #ece9e3' }
            }
          >
            {s}
          </button>
        ))}
        <div className="w-px h-4" style={{ background: '#ece9e3' }} />
        {centres.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilterCentre(filterCentre === c.id ? '' : c.id)}
            className="text-xs px-3 py-1.5 rounded-full transition-all"
            style={
              filterCentre === c.id
                ? { background: 'var(--color-brand)', color: '#fff' }
                : { background: '#fff', color: '#666', border: '1px solid #ece9e3' }
            }
          >
            {c.name}
          </button>
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

        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm" style={{ color: '#aaa' }}>No tenants found.</p>
          </div>
        ) : (
          filtered.map((tenant, i) => (
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
                {tenant.centre?.name ?? '—'}
              </p>
              <p className="text-sm" style={{ color: '#555' }}>{tenant.contact_name ?? '—'}</p>
              <div className="flex items-center gap-1.5">
                {tenant.has_internet && <Wifi size={13} style={{ color: '#2980b9' }} />}
                {tenant.has_generator && <Zap size={13} style={{ color: '#f39c12' }} />}
                {tenant.has_gas && <Flame size={13} style={{ color: '#e74c3c' }} />}
              </div>
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full"
                style={statusStyle(tenant.status)}
              >
                {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}