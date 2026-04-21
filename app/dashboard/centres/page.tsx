'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Building2, ChevronRight, Plus } from 'lucide-react'

export default function CentresPage() {
  const [centres, setCentres] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('centres')
        .select('*')
        .order('name')

      if (error) {
        setError(error.message)
      } else {
        setCentres(data ?? [])
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="p-8">
      <p style={{ color: '#888' }}>Loading centres...</p>
    </div>
  )

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-medium" style={{ color: '#1a1a18' }}>Centres</h1>
          <p className="text-sm mt-1" style={{ color: '#888' }}>
            {centres.length} business centres
          </p>
        </div>
        <Link
          href="/dashboard/centres/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: 'var(--color-brand)' }}
        >
          <Plus size={15} />
          Add centre
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg text-sm" style={{ background: '#fff0f0', color: '#c0392b' }}>
          Error: {error}
        </div>
      )}

      {centres.length === 0 && !error ? (
        <div className="rounded-xl p-12 text-center" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
          <p className="text-sm" style={{ color: '#888' }}>No centres found.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #ece9e3', background: '#fff' }}>
          {centres.map((centre, i) => (
            <Link
              key={centre.id}
              href={`/dashboard/centres/${centre.id}`}
              className="flex items-center justify-between px-5 py-4 transition-colors"
              style={{
                borderTop: i > 0 ? '1px solid #f0ede7' : 'none',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#fafaf8')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'var(--color-brand-muted)' }}
                >
                  <Building2 size={18} style={{ color: 'var(--color-brand)' }} strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>{centre.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#888' }}>
                    {centre.city ?? '—'} · {centre.address ?? '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={
                    centre.is_active
                      ? { background: '#e8f5ee', color: '#1a472a' }
                      : { background: '#f5f5f5', color: '#888' }
                  }
                >
                  {centre.is_active ? 'Active' : 'Inactive'}
                </span>
                <ChevronRight size={16} style={{ color: '#ccc' }} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}