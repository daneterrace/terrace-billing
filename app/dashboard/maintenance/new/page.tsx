'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

export default function NewMaintenanceJobPage() {
  const router = useRouter()
  const [centres, setCentres] = useState<{ id: string; name: string }[]>([])
  const [profiles, setProfiles] = useState<{ id: string; full_name: string; role: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    centre_id: '',
    title: '',
    description: '',
    category: 'general',
    location_in_centre: '',
    assigned_to: '',
    notes: '',
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [centresRes, profilesRes] = await Promise.all([
        supabase.from('centres').select('id, name').eq('is_active', true).order('name'),
        supabase.from('profiles').select('id, full_name, role').order('full_name'),
      ])
      setCentres(centresRes.data ?? [])
      setProfiles(profilesRes.data ?? [])
      if (centresRes.data?.[0]) setForm(f => ({ ...f, centre_id: centresRes.data![0].id }))
    }
    load()
  }, [])

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.centre_id) {
      setError('Please fill in title and centre')
      return
    }
    setSaving(true)
    setError(null)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()

    const { data, error: e } = await supabase
      .from('maintenance_jobs')
      .insert({
        centre_id: form.centre_id,
        title: form.title,
        description: form.description || null,
        category: form.category,
        location_in_centre: form.location_in_centre || null,
        assigned_to: form.assigned_to || null,
        notes: form.notes || null,
        logged_by: user?.id ?? null,
        status: form.assigned_to ? 'quotes_requested' : 'logged',
      })
      .select()
      .single()

    if (e) { setError(e.message); setSaving(false); return }

    // Send email notification if assigned
    if (form.assigned_to && data) {
      const assignee = profiles.find(p => p.id === form.assigned_to)
      const centre = centres.find(c => c.id === form.centre_id)
      await fetch('/api/maintenance-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'job_assigned',
          job: { ...data, title: form.title },
          assignee,
          centre,
        }),
      }).catch(() => {}) // Don't fail if email fails
    }

    router.push(`/dashboard/maintenance/${data.id}`)
  }

  const inputClass = "w-full px-3.5 py-2.5 rounded-lg text-sm outline-none"
  const inputStyle = { border: '1px solid #e2e0da', background: '#fff', color: '#1a1a18' }

  return (
    <div className="p-8 max-w-2xl">
      <Link href="/dashboard/maintenance"
        className="inline-flex items-center gap-1.5 text-sm mb-6"
        style={{ color: '#888', textDecoration: 'none' }}>
        <ArrowLeft size={14} /> Back to maintenance
      </Link>

      <h1 className="text-2xl font-medium mb-8" style={{ color: '#1a1a18' }}>Log new maintenance job</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="rounded-xl p-6 space-y-4" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
          <h2 className="text-xs font-medium" style={{ color: '#888', letterSpacing: '0.05em' }}>JOB DETAILS</h2>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#444' }}>Centre *</label>
            <select value={form.centre_id} onChange={(e) => set('centre_id', e.target.value)}
              className={inputClass} style={inputStyle} required>
              {centres.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#444' }}>Job title *</label>
            <input type="text" value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Broken light in parking area"
              className={inputClass} style={inputStyle} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#444' }}>Category</label>
              <select value={form.category} onChange={(e) => set('category', e.target.value)}
                className={inputClass} style={inputStyle}>
                {['general','electrical','plumbing','structural','cleaning','security','equipment'].map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#444' }}>Location in centre</label>
              <input type="text" value={form.location_in_centre}
                onChange={(e) => set('location_in_centre', e.target.value)}
                placeholder="e.g. North parking, Shop 12"
                className={inputClass} style={inputStyle} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#444' }}>Description</label>
            <textarea value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3} placeholder="Describe the issue in detail..."
              className={inputClass} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        </section>

        <section className="rounded-xl p-6 space-y-4" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
          <h2 className="text-xs font-medium" style={{ color: '#888', letterSpacing: '0.05em' }}>ASSIGNMENT</h2>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#444' }}>
              Assign to (optional — they will be notified by email)
            </label>
            <select value={form.assigned_to} onChange={(e) => set('assigned_to', e.target.value)}
              className={inputClass} style={inputStyle}>
              <option value="">Unassigned</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.role.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#444' }}>Notes</label>
            <textarea value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2} placeholder="Any additional notes..."
              className={inputClass} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        </section>

        {error && (
          <p className="text-sm px-4 py-3 rounded-lg" style={{ background: '#fff0f0', color: '#c0392b', border: '1px solid #fcc' }}>
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60"
            style={{ background: 'var(--color-brand)' }}>
            <Save size={15} />
            {saving ? 'Saving...' : 'Log job'}
          </button>
          <Link href="/dashboard/maintenance"
            className="px-5 py-2.5 rounded-lg text-sm" style={{ color: '#666' }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}