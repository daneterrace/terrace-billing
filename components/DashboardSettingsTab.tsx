'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Check, GripVertical } from 'lucide-react'

const SECTION_LABELS: Record<string, string> = {
  maintenance: '🔧 Maintenance alerts',
  foot_traffic: '🚗 Foot traffic',
  lease_renewals: '📅 Lease renewals',
  internet: '📶 Internet revenue',
  generator: '⚡ Generator usage',
  centres: '🏢 Centres quick view',
}

export default function DashboardSettingsTab() {
  const [leasedays, setLeaseDays] = useState('60')
  const [order, setOrder] = useState<string[]>([
    'maintenance', 'foot_traffic', 'lease_renewals', 'internet', 'generator', 'centres'
  ])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dragging, setDragging] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('dashboard_settings')
        .select('key, value')
        .in('key', ['lease_renewal_days', 'overview_section_order'])

      data?.forEach((row: any) => {
        if (row.key === 'lease_renewal_days') setLeaseDays(String(row.value))
        if (row.key === 'overview_section_order') {
          try { setOrder(JSON.parse(row.value)) } catch {}
        }
      })
    }
    load()
  }, [])

  function handleDragStart(index: number) {
    setDragging(index)
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    setDragOver(index)
  }

  function handleDrop(index: number) {
    if (dragging === null || dragging === index) return
    const newOrder = [...order]
    const [moved] = newOrder.splice(dragging, 1)
    newOrder.splice(index, 0, moved)
    setOrder(newOrder)
    setDragging(null)
    setDragOver(null)
  }

  function moveUp(index: number) {
    if (index === 0) return
    const newOrder = [...order]
    ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
    setOrder(newOrder)
  }

  function moveDown(index: number) {
    if (index === order.length - 1) return
    const newOrder = [...order]
    ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
    setOrder(newOrder)
  }

  async function save() {
    setSaving(true)
    const supabase = createClient()
    await Promise.all([
      supabase.from('dashboard_settings')
        .upsert({ key: 'lease_renewal_days', value: leasedays }, { onConflict: 'key' }),
      supabase.from('dashboard_settings')
        .upsert({ key: 'overview_section_order', value: JSON.stringify(order) }, { onConflict: 'key' }),
    ])
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const inputStyle = { border: '1px solid #e2e0da', background: '#fff', color: '#1a1a18' }

  return (
    <div className="space-y-6">
      {/* Lease renewal days */}
      <div className="rounded-xl p-6" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
        <h3 className="text-sm font-medium mb-1" style={{ color: '#1a1a18' }}>Lease renewal warning period</h3>
        <p className="text-xs mb-4" style={{ color: '#888' }}>
          Show tenants on the overview when their lease expires within this many days.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={leasedays}
            onChange={(e) => setLeaseDays(e.target.value)}
            min="1"
            max="365"
            className="w-24 px-3 py-2 rounded-lg text-sm outline-none"
            style={inputStyle}
          />
          <span className="text-sm" style={{ color: '#888' }}>days</span>
        </div>
      </div>

      {/* Section order */}
      <div className="rounded-xl p-6" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
        <h3 className="text-sm font-medium mb-1" style={{ color: '#1a1a18' }}>Overview section order</h3>
        <p className="text-xs mb-4" style={{ color: '#888' }}>
          Drag to reorder or use the arrows. Changes take effect immediately on save.
        </p>
        <div className="space-y-2">
          {order.map((key, index) => (
            <div
              key={key}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={() => { setDragging(null); setDragOver(null) }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-grab active:cursor-grabbing"
              style={{
                background: dragOver === index ? 'var(--color-brand-muted)' : '#f7f6f3',
                border: `1px solid ${dragOver === index ? 'var(--color-brand-light)' : '#e8e6e0'}`,
                opacity: dragging === index ? 0.5 : 1,
              }}
            >
              <GripVertical size={16} style={{ color: '#ccc', flexShrink: 0 }} />
              <span className="text-sm flex-1" style={{ color: '#1a1a18' }}>
                {SECTION_LABELS[key] ?? key}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs disabled:opacity-30"
                  style={{ background: '#fff', border: '1px solid #e2e0da', color: '#555' }}
                >
                  ↑
                </button>
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === order.length - 1}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs disabled:opacity-30"
                  style={{ background: '#fff', border: '1px solid #e2e0da', color: '#555' }}
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60"
        style={{ background: saved ? '#1a6b3a' : 'var(--color-brand)' }}
      >
        {saved ? <><Check size={15} /> Saved</> : saving ? 'Saving...' : <><Save size={15} /> Save settings</>}
      </button>
    </div>
  )
}