'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, Save, X, Wifi, Building2 } from 'lucide-react'

type Package = {
  id: string
  name: string
  speed_mbps: number | null
  cost_price: number
  sell_price: number
  is_active: boolean
}

type Centre = {
  id: string
  name: string
  address: string | null
  city: string | null
  is_active: boolean
}

type Tab = 'packages' | 'centres'

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('packages')
  const [packages, setPackages] = useState<Package[]>([])
  const [centres, setCentres] = useState<Centre[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPackage, setEditingPackage] = useState<Package | null>(null)
  const [editingCentre, setEditingCentre] = useState<Centre | null>(null)
  const [showNewPackage, setShowNewPackage] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [newPackage, setNewPackage] = useState({
    name: '', speed_mbps: '', cost_price: '', sell_price: ''
  })

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const supabase = createClient()
    const [p, c] = await Promise.all([
      supabase.from('internet_packages').select('*').order('name'),
      supabase.from('centres').select('*').order('name'),
    ])
    setPackages(p.data ?? [])
    setCentres(c.data ?? [])
    setLoading(false)
  }

  // ── PACKAGES ──────────────────────────────────────────────

  async function addPackage() {
    if (!newPackage.name || !newPackage.cost_price || !newPackage.sell_price) {
      setError('Please fill in name, cost price and sell price')
      return
    }
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: e } = await supabase.from('internet_packages').insert({
      name: newPackage.name,
      speed_mbps: newPackage.speed_mbps ? parseInt(newPackage.speed_mbps) : null,
      cost_price: parseFloat(newPackage.cost_price),
      sell_price: parseFloat(newPackage.sell_price),
      is_active: true,
    })
    if (e) { setError(e.message); setSaving(false); return }
    setNewPackage({ name: '', speed_mbps: '', cost_price: '', sell_price: '' })
    setShowNewPackage(false)
    setSaving(false)
    load()
  }

  async function savePackage() {
    if (!editingPackage) return
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: e } = await supabase
      .from('internet_packages')
      .update({
        name: editingPackage.name,
        speed_mbps: editingPackage.speed_mbps,
        cost_price: editingPackage.cost_price,
        sell_price: editingPackage.sell_price,
        is_active: editingPackage.is_active,
      })
      .eq('id', editingPackage.id)
    if (e) { setError(e.message); setSaving(false); return }
    setEditingPackage(null)
    setSaving(false)
    load()
  }

  async function deletePackage(id: string) {
    if (!confirm('Delete this package? This cannot be undone.')) return
    const supabase = createClient()
    await supabase.from('internet_packages').delete().eq('id', id)
    load()
  }

  async function togglePackage(pkg: Package) {
    const supabase = createClient()
    await supabase
      .from('internet_packages')
      .update({ is_active: !pkg.is_active })
      .eq('id', pkg.id)
    load()
  }

  // ── CENTRES ───────────────────────────────────────────────

  async function saveCentre() {
    if (!editingCentre) return
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: e } = await supabase
      .from('centres')
      .update({
        name: editingCentre.name,
        address: editingCentre.address,
        city: editingCentre.city,
        is_active: editingCentre.is_active,
      })
      .eq('id', editingCentre.id)
    if (e) { setError(e.message); setSaving(false); return }
    setEditingCentre(null)
    setSaving(false)
    load()
  }

  const inputClass = "w-full px-3 py-2 rounded-lg text-sm outline-none"
  const inputStyle = { border: '1px solid #e2e0da', background: '#fff', color: '#1a1a18' }

  if (loading) return <div className="p-8"><p style={{ color: '#888' }}>Loading...</p></div>

  const margin = (pkg: Package) => ((pkg.sell_price - pkg.cost_price) / pkg.sell_price * 100).toFixed(0)

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-medium" style={{ color: '#1a1a18' }}>Settings</h1>
        <p className="text-sm mt-1" style={{ color: '#888' }}>Manage packages, centres and system configuration</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 p-1 rounded-xl w-fit" style={{ background: '#f0ede7' }}>
        {([
          { key: 'packages', label: 'Internet packages', icon: Wifi },
          { key: 'centres', label: 'Centres', icon: Building2 },
        ] as { key: Tab; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all"
            style={
              tab === key
                ? { background: '#fff', color: '#1a1a18', fontWeight: 500 }
                : { background: 'transparent', color: '#888' }
            }
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ background: '#fff0f0', color: '#c0392b', border: '1px solid #fcc' }}>
          {error}
        </div>
      )}

      {/* ── PACKAGES TAB ── */}
      {tab === 'packages' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm" style={{ color: '#888' }}>{packages.length} packages</p>
            <button
              onClick={() => setShowNewPackage(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: 'var(--color-brand)' }}
            >
              <Plus size={14} />
              Add package
            </button>
          </div>

          {/* New package form */}
          {showNewPackage && (
            <div className="rounded-xl p-5 mb-4" style={{ background: '#eaf4fd', border: '1px solid #bde0f5' }}>
              <p className="text-sm font-medium mb-4" style={{ color: '#1a5276' }}>New package</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#444' }}>Package name *</label>
                  <input
                    type="text"
                    value={newPackage.name}
                    onChange={(e) => setNewPackage(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Highland 50"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#444' }}>Speed (Mbps)</label>
                  <input
                    type="number"
                    value={newPackage.speed_mbps}
                    onChange={(e) => setNewPackage(p => ({ ...p, speed_mbps: e.target.value }))}
                    placeholder="e.g. 50"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#444' }}>Cost price (USD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPackage.cost_price}
                    onChange={(e) => setNewPackage(p => ({ ...p, cost_price: e.target.value }))}
                    placeholder="0.00"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#444' }}>Sell price (USD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPackage.sell_price}
                    onChange={(e) => setNewPackage(p => ({ ...p, sell_price: e.target.value }))}
                    placeholder="0.00"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={addPackage}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                  style={{ background: 'var(--color-brand)' }}
                >
                  <Save size={13} />
                  {saving ? 'Saving...' : 'Save package'}
                </button>
                <button
                  onClick={() => { setShowNewPackage(false); setError(null) }}
                  className="px-4 py-2 rounded-lg text-sm"
                  style={{ color: '#666' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Packages list */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #ece9e3', background: '#fff' }}>
            <div
              className="grid px-5 py-2.5 text-xs font-medium"
              style={{
                gridTemplateColumns: '1fr 80px 100px 100px 80px 80px',
                color: '#888',
                background: '#fafaf8',
                borderBottom: '1px solid #f0ede7',
              }}
            >
              <span>Package name</span>
              <span>Speed</span>
              <span>Cost price</span>
              <span>Sell price</span>
              <span>Margin</span>
              <span>Actions</span>
            </div>

            {packages.map((pkg, i) => (
              <div key={pkg.id}>
                {editingPackage?.id === pkg.id ? (
                  <div
                    className="px-5 py-3"
                    style={{ borderTop: i > 0 ? '1px solid #f0ede7' : 'none', background: '#fafaf8' }}
                  >
                    <div className="grid grid-cols-4 gap-3 mb-3">
                      <div>
                        <label className="block text-xs mb-1" style={{ color: '#888' }}>Name</label>
                        <input
                          type="text"
                          value={editingPackage.name}
                          onChange={(e) => setEditingPackage(p => p ? { ...p, name: e.target.value } : p)}
                          className={inputClass}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: '#888' }}>Speed (Mbps)</label>
                        <input
                          type="number"
                          value={editingPackage.speed_mbps ?? ''}
                          onChange={(e) => setEditingPackage(p => p ? { ...p, speed_mbps: parseInt(e.target.value) || null } : p)}
                          className={inputClass}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: '#888' }}>Cost price</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editingPackage.cost_price}
                          onChange={(e) => setEditingPackage(p => p ? { ...p, cost_price: parseFloat(e.target.value) || 0 } : p)}
                          className={inputClass}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: '#888' }}>Sell price</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editingPackage.sell_price}
                          onChange={(e) => setEditingPackage(p => p ? { ...p, sell_price: parseFloat(e.target.value) || 0 } : p)}
                          className={inputClass}
                          style={inputStyle}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={savePackage}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-60"
                        style={{ background: 'var(--color-brand)' }}
                      >
                        <Save size={12} />
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingPackage(null)}
                        className="px-3 py-1.5 rounded-lg text-xs"
                        style={{ color: '#666' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="grid px-5 py-3.5 items-center"
                    style={{
                      gridTemplateColumns: '1fr 80px 100px 100px 80px 80px',
                      borderTop: i > 0 ? '1px solid #f0ede7' : 'none',
                      opacity: pkg.is_active ? 1 : 0.5,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>{pkg.name}</p>
                      {!pkg.is_active && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#f5f5f5', color: '#888' }}>
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm" style={{ color: '#555' }}>
                      {pkg.speed_mbps ? `${pkg.speed_mbps}Mbps` : '—'}
                    </p>
                    <p className="text-sm" style={{ color: '#555' }}>${pkg.cost_price.toFixed(2)}</p>
                    <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>${pkg.sell_price.toFixed(2)}</p>
                    <span
                      className="text-xs font-medium px-2 py-1 rounded-full w-fit"
                      style={{ background: '#e8f5ee', color: '#1a472a' }}
                    >
                      {margin(pkg)}%
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingPackage(pkg)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: '#888' }}
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => togglePackage(pkg)}
                        className="p-1.5 rounded-lg transition-colors text-xs"
                        style={{ color: '#888' }}
                        title={pkg.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {pkg.is_active ? <X size={13} /> : <Plus size={13} />}
                      </button>
                      <button
                        onClick={() => deletePackage(pkg.id)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: '#e74c3c' }}
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {packages.length === 0 && (
              <div className="px-5 py-12 text-center">
                <p className="text-sm" style={{ color: '#aaa' }}>No packages yet. Add your first package above.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CENTRES TAB ── */}
      {tab === 'centres' && (
        <div>
          <p className="text-sm mb-4" style={{ color: '#888' }}>{centres.length} centres</p>

          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #ece9e3', background: '#fff' }}>
            <div
              className="grid px-5 py-2.5 text-xs font-medium"
              style={{
                gridTemplateColumns: '1fr 140px 120px 80px 60px',
                color: '#888',
                background: '#fafaf8',
                borderBottom: '1px solid #f0ede7',
              }}
            >
              <span>Centre name</span>
              <span>Address</span>
              <span>City</span>
              <span>Status</span>
              <span>Edit</span>
            </div>

            {centres.map((centre, i) => (
              <div key={centre.id}>
                {editingCentre?.id === centre.id ? (
                  <div
                    className="px-5 py-4"
                    style={{ borderTop: i > 0 ? '1px solid #f0ede7' : 'none', background: '#fafaf8' }}
                  >
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className="block text-xs mb-1" style={{ color: '#888' }}>Name</label>
                        <input
                          type="text"
                          value={editingCentre.name}
                          onChange={(e) => setEditingCentre(c => c ? { ...c, name: e.target.value } : c)}
                          className={inputClass}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: '#888' }}>Address</label>
                        <input
                          type="text"
                          value={editingCentre.address ?? ''}
                          onChange={(e) => setEditingCentre(c => c ? { ...c, address: e.target.value } : c)}
                          className={inputClass}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: '#888' }}>City</label>
                        <input
                          type="text"
                          value={editingCentre.city ?? ''}
                          onChange={(e) => setEditingCentre(c => c ? { ...c, city: e.target.value } : c)}
                          className={inputClass}
                          style={inputStyle}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingCentre.is_active}
                          onChange={(e) => setEditingCentre(c => c ? { ...c, is_active: e.target.checked } : c)}
                        />
                        Active
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={saveCentre}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-60"
                        style={{ background: 'var(--color-brand)' }}
                      >
                        <Save size={12} />
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingCentre(null)}
                        className="px-3 py-1.5 rounded-lg text-xs"
                        style={{ color: '#666' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="grid px-5 py-3.5 items-center"
                    style={{
                      gridTemplateColumns: '1fr 140px 120px 80px 60px',
                      borderTop: i > 0 ? '1px solid #f0ede7' : 'none',
                    }}
                  >
                    <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>{centre.name}</p>
                    <p className="text-sm" style={{ color: '#555' }}>{centre.address ?? '—'}</p>
                    <p className="text-sm" style={{ color: '#555' }}>{centre.city ?? '—'}</p>
                    <span
                      className="text-xs font-medium px-2.5 py-1 rounded-full w-fit"
                      style={
                        centre.is_active
                          ? { background: '#e8f5ee', color: '#1a472a' }
                          : { background: '#f5f5f5', color: '#888' }
                      }
                    >
                      {centre.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => setEditingCentre(centre)}
                      className="p-1.5 rounded-lg"
                      style={{ color: '#888' }}
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}