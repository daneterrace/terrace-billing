'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, Save, X, Wifi, Building2, FileText } from 'lucide-react'
import DashboardSettingsTab from '@/components/DashboardSettingsTab'

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
  company_name: string | null
  company_email: string | null
  company_phone: string | null
  company_address: string | null
  vat_number: string | null
  bank_name: string | null
  bank_account: string | null
  bank_branch: string | null
  invoice_prefix: string | null
  tax_rate: number | null
}

type Tab = 'packages' | 'centres' | 'billing'

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('packages')
  const [packages, setPackages] = useState<Package[]>([])
  const [centres, setCentres] = useState<Centre[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPackage, setEditingPackage] = useState<Package | null>(null)
  const [editingCentre, setEditingCentre] = useState<Centre | null>(null)
  const [editingBilling, setEditingBilling] = useState<Centre | null>(null)
  const [showNewPackage, setShowNewPackage] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [newPackage, setNewPackage] = useState({
    name: '', speed_mbps: '', cost_price: '', sell_price: ''
  })

  useEffect(() => { load() }, [])

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

  function showSuccess(msg: string) {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
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
    showSuccess('Package added')
    load()
  }

  async function savePackage() {
    if (!editingPackage) return
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: e } = await supabase.from('internet_packages').update({
      name: editingPackage.name,
      speed_mbps: editingPackage.speed_mbps,
      cost_price: editingPackage.cost_price,
      sell_price: editingPackage.sell_price,
      is_active: editingPackage.is_active,
    }).eq('id', editingPackage.id)
    if (e) { setError(e.message); setSaving(false); return }
    setEditingPackage(null)
    setSaving(false)
    showSuccess('Package saved')
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
    await supabase.from('internet_packages').update({ is_active: !pkg.is_active }).eq('id', pkg.id)
    load()
  }

  // ── CENTRES ───────────────────────────────────────────────

  async function saveCentre() {
    if (!editingCentre) return
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: e } = await supabase.from('centres').update({
      name: editingCentre.name,
      address: editingCentre.address,
      city: editingCentre.city,
      is_active: editingCentre.is_active,
    }).eq('id', editingCentre.id)
    if (e) { setError(e.message); setSaving(false); return }
    setEditingCentre(null)
    setSaving(false)
    showSuccess('Centre saved')
    load()
  }

  // ── BILLING DETAILS ───────────────────────────────────────

  async function saveBillingDetails() {
    if (!editingBilling) return
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: e } = await supabase.from('centres').update({
      company_name: editingBilling.company_name,
      company_email: editingBilling.company_email,
      company_phone: editingBilling.company_phone,
      company_address: editingBilling.company_address,
      vat_number: editingBilling.vat_number,
      bank_name: editingBilling.bank_name,
      bank_account: editingBilling.bank_account,
      bank_branch: editingBilling.bank_branch,
      invoice_prefix: editingBilling.invoice_prefix,
      tax_rate: editingBilling.tax_rate,
    }).eq('id', editingBilling.id)
    if (e) { setError(e.message); setSaving(false); return }
    setEditingBilling(null)
    setSaving(false)
    showSuccess('Billing details saved')
    load()
  }

  const inputClass = "w-full px-3 py-2 rounded-lg text-sm outline-none"
  const inputStyle = { border: '1px solid #e2e0da', background: '#fff', color: '#1a1a18' }
  const margin = (pkg: Package) => ((pkg.sell_price - pkg.cost_price) / pkg.sell_price * 100).toFixed(0)

  if (loading) return <div className="p-8"><p style={{ color: '#888' }}>Loading...</p></div>

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-medium" style={{ color: '#1a1a18' }}>Settings</h1>
        <p className="text-sm mt-1" style={{ color: '#888' }}>Manage packages, centres and billing configuration</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 p-1 rounded-xl w-fit" style={{ background: '#f0ede7' }}>
  {([
    { key: 'packages', label: 'Internet packages', icon: Wifi },
    { key: 'centres', label: 'Centres', icon: Building2 },
    { key: 'billing', label: 'Billing details', icon: FileText },
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ] as { key: Tab; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
    <button key={key} onClick={() => setTab(key)}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all"
      style={tab === key
        ? { background: '#fff', color: '#1a1a18', fontWeight: 500 }
        : { background: 'transparent', color: '#888' }
      }>
      <Icon size={14} />
      {label}
    </button>
  ))}
</div>

      {/* Messages */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ background: '#fff0f0', color: '#c0392b', border: '1px solid #fcc' }}>
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ background: '#e8f5ee', color: '#1a472a', border: '1px solid #a8d5b5' }}>
          ✓ {successMsg}
        </div>
      )}

      {/* ── PACKAGES TAB ── */}
      {tab === 'packages' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm" style={{ color: '#888' }}>{packages.length} packages</p>
            <button onClick={() => setShowNewPackage(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: 'var(--color-brand)' }}>
              <Plus size={14} />Add package
            </button>
          </div>

          {showNewPackage && (
            <div className="rounded-xl p-5 mb-4" style={{ background: '#eaf4fd', border: '1px solid #bde0f5' }}>
              <p className="text-sm font-medium mb-4" style={{ color: '#1a5276' }}>New package</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#444' }}>Package name *</label>
                  <input type="text" value={newPackage.name}
                    onChange={(e) => setNewPackage(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Highland 50" className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#444' }}>Speed (Mbps)</label>
                  <input type="number" value={newPackage.speed_mbps}
                    onChange={(e) => setNewPackage(p => ({ ...p, speed_mbps: e.target.value }))}
                    placeholder="e.g. 50" className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#444' }}>Cost price (USD) *</label>
                  <input type="number" step="0.01" value={newPackage.cost_price}
                    onChange={(e) => setNewPackage(p => ({ ...p, cost_price: e.target.value }))}
                    placeholder="0.00" className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#444' }}>Sell price (USD) *</label>
                  <input type="number" step="0.01" value={newPackage.sell_price}
                    onChange={(e) => setNewPackage(p => ({ ...p, sell_price: e.target.value }))}
                    placeholder="0.00" className={inputClass} style={inputStyle} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addPackage} disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                  style={{ background: 'var(--color-brand)' }}>
                  <Save size={13} />{saving ? 'Saving...' : 'Save package'}
                </button>
                <button onClick={() => { setShowNewPackage(false); setError(null) }}
                  className="px-4 py-2 rounded-lg text-sm" style={{ color: '#666' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #ece9e3', background: '#fff' }}>
            <div className="grid px-5 py-2.5 text-xs font-medium"
              style={{ gridTemplateColumns: '1fr 80px 100px 100px 80px 80px', color: '#888', background: '#fafaf8', borderBottom: '1px solid #f0ede7' }}>
              <span>Package name</span><span>Speed</span><span>Cost price</span>
              <span>Sell price</span><span>Margin</span><span>Actions</span>
            </div>

            {packages.map((pkg, i) => (
              <div key={pkg.id}>
                {editingPackage?.id === pkg.id ? (
                  <div className="px-5 py-3" style={{ borderTop: i > 0 ? '1px solid #f0ede7' : 'none', background: '#fafaf8' }}>
                    <div className="grid grid-cols-4 gap-3 mb-3">
                      {[
                        { label: 'Name', val: editingPackage.name, key: 'name', type: 'text' },
                        { label: 'Speed (Mbps)', val: editingPackage.speed_mbps ?? '', key: 'speed_mbps', type: 'number' },
                        { label: 'Cost price', val: editingPackage.cost_price, key: 'cost_price', type: 'number' },
                        { label: 'Sell price', val: editingPackage.sell_price, key: 'sell_price', type: 'number' },
                      ].map(f => (
                        <div key={f.key}>
                          <label className="block text-xs mb-1" style={{ color: '#888' }}>{f.label}</label>
                          <input type={f.type} value={f.val}
                            onChange={(e) => setEditingPackage(p => p ? { ...p, [f.key]: f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value } : p)}
                            className={inputClass} style={inputStyle} step={f.type === 'number' ? '0.01' : undefined} />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={savePackage} disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-60"
                        style={{ background: 'var(--color-brand)' }}>
                        <Save size={12} />{saving ? 'Saving...' : 'Save'}
                      </button>
                      <button onClick={() => setEditingPackage(null)} className="px-3 py-1.5 rounded-lg text-xs" style={{ color: '#666' }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid px-5 py-3.5 items-center"
                    style={{ gridTemplateColumns: '1fr 80px 100px 100px 80px 80px', borderTop: i > 0 ? '1px solid #f0ede7' : 'none', opacity: pkg.is_active ? 1 : 0.5 }}>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>{pkg.name}</p>
                      {!pkg.is_active && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#f5f5f5', color: '#888' }}>Inactive</span>}
                    </div>
                    <p className="text-sm" style={{ color: '#555' }}>{pkg.speed_mbps ? `${pkg.speed_mbps}Mbps` : '—'}</p>
                    <p className="text-sm" style={{ color: '#555' }}>${pkg.cost_price.toFixed(2)}</p>
                    <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>${pkg.sell_price.toFixed(2)}</p>
                    <span className="text-xs font-medium px-2 py-1 rounded-full w-fit" style={{ background: '#e8f5ee', color: '#1a472a' }}>{margin(pkg)}%</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditingPackage(pkg)} className="p-1.5 rounded-lg" style={{ color: '#888' }}><Pencil size={13} /></button>
                      <button onClick={() => togglePackage(pkg)} className="p-1.5 rounded-lg" style={{ color: '#888' }}>{pkg.is_active ? <X size={13} /> : <Plus size={13} />}</button>
                      <button onClick={() => deletePackage(pkg.id)} className="p-1.5 rounded-lg" style={{ color: '#e74c3c' }}><Trash2 size={13} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {packages.length === 0 && (
              <div className="px-5 py-12 text-center">
                <p className="text-sm" style={{ color: '#aaa' }}>No packages yet.</p>
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
            <div className="grid px-5 py-2.5 text-xs font-medium"
              style={{ gridTemplateColumns: '1fr 140px 120px 80px 60px', color: '#888', background: '#fafaf8', borderBottom: '1px solid #f0ede7' }}>
              <span>Centre name</span><span>Address</span><span>City</span><span>Status</span><span>Edit</span>
            </div>
            {centres.map((centre, i) => (
              <div key={centre.id}>
                {editingCentre?.id === centre.id ? (
                  <div className="px-5 py-4" style={{ borderTop: i > 0 ? '1px solid #f0ede7' : 'none', background: '#fafaf8' }}>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {[
                        { label: 'Name', val: editingCentre.name, key: 'name' },
                        { label: 'Address', val: editingCentre.address ?? '', key: 'address' },
                        { label: 'City', val: editingCentre.city ?? '', key: 'city' },
                      ].map(f => (
                        <div key={f.key}>
                          <label className="block text-xs mb-1" style={{ color: '#888' }}>{f.label}</label>
                          <input type="text" value={f.val}
                            onChange={(e) => setEditingCentre(c => c ? { ...c, [f.key]: e.target.value } : c)}
                            className={inputClass} style={inputStyle} />
                        </div>
                      ))}
                    </div>
                    <label className="flex items-center gap-2 text-sm cursor-pointer mb-3">
                      <input type="checkbox" checked={editingCentre.is_active}
                        onChange={(e) => setEditingCentre(c => c ? { ...c, is_active: e.target.checked } : c)} />
                      Active
                    </label>
                    <div className="flex gap-2">
                      <button onClick={saveCentre} disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-60"
                        style={{ background: 'var(--color-brand)' }}>
                        <Save size={12} />{saving ? 'Saving...' : 'Save'}
                      </button>
                      <button onClick={() => setEditingCentre(null)} className="px-3 py-1.5 rounded-lg text-xs" style={{ color: '#666' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="grid px-5 py-3.5 items-center"
                    style={{ gridTemplateColumns: '1fr 140px 120px 80px 60px', borderTop: i > 0 ? '1px solid #f0ede7' : 'none' }}>
                    <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>{centre.name}</p>
                    <p className="text-sm" style={{ color: '#555' }}>{centre.address ?? '—'}</p>
                    <p className="text-sm" style={{ color: '#555' }}>{centre.city ?? '—'}</p>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full w-fit"
                      style={centre.is_active ? { background: '#e8f5ee', color: '#1a472a' } : { background: '#f5f5f5', color: '#888' }}>
                      {centre.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button onClick={() => setEditingCentre(centre)} className="p-1.5 rounded-lg" style={{ color: '#888' }}><Pencil size={13} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── BILLING DETAILS TAB ── */}
      {tab === 'billing' && (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: '#888' }}>
            Set up billing details for each centre. These appear on invoices sent to tenants.
          </p>

          {centres.map((centre) => (
            <div key={centre.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid #ece9e3', background: '#fff' }}>
              {/* Centre header */}
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #f0ede7', background: '#fafaf8' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold"
                    style={{ background: 'var(--color-brand-muted)', color: 'var(--color-brand)' }}>
                    {centre.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>{centre.name}</p>
                    {centre.company_name && (
                      <p className="text-xs" style={{ color: '#888' }}>{centre.company_name}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {centre.company_name ? (
                    <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: '#e8f5ee', color: '#1a472a' }}>
                      ✓ Configured
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: '#fef3dc', color: '#7d5a00' }}>
                      Not set up
                    </span>
                  )}
                  <button
                    onClick={() => setEditingBilling(editingBilling?.id === centre.id ? null : { ...centre })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                    style={{ border: '1px solid #e2e0da', background: '#fff', color: '#444' }}>
                    <Pencil size={12} />
                    {editingBilling?.id === centre.id ? 'Cancel' : 'Edit billing details'}
                  </button>
                </div>
              </div>

              {/* Edit form */}
              {editingBilling?.id === centre.id ? (
                <div className="px-5 py-5">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium mb-1.5" style={{ color: '#444' }}>
                        Company name (as it appears on invoices)
                      </label>
                      <input type="text" value={editingBilling.company_name ?? ''}
                        onChange={(e) => setEditingBilling(c => c ? { ...c, company_name: e.target.value } : c)}
                        placeholder="e.g. Terrace Africa Properties (Pvt) Ltd"
                        className={inputClass} style={inputStyle} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: '#444' }}>Billing email</label>
                      <input type="email" value={editingBilling.company_email ?? ''}
                        onChange={(e) => setEditingBilling(c => c ? { ...c, company_email: e.target.value } : c)}
                        placeholder="billing@terraceafrica.com"
                        className={inputClass} style={inputStyle} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: '#444' }}>Phone</label>
                      <input type="text" value={editingBilling.company_phone ?? ''}
                        onChange={(e) => setEditingBilling(c => c ? { ...c, company_phone: e.target.value } : c)}
                        placeholder="+263 77 000 0000"
                        className={inputClass} style={inputStyle} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium mb-1.5" style={{ color: '#444' }}>Company address</label>
                      <input type="text" value={editingBilling.company_address ?? ''}
                        onChange={(e) => setEditingBilling(c => c ? { ...c, company_address: e.target.value } : c)}
                        placeholder="123 Main Street, Harare, Zimbabwe"
                        className={inputClass} style={inputStyle} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: '#444' }}>VAT number</label>
                      <input type="text" value={editingBilling.vat_number ?? ''}
                        onChange={(e) => setEditingBilling(c => c ? { ...c, vat_number: e.target.value } : c)}
                        placeholder="e.g. 200012345"
                        className={inputClass} style={inputStyle} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: '#444' }}>Tax rate (%)</label>
                      <input type="number" step="0.01" value={editingBilling.tax_rate ?? 15}
                        onChange={(e) => setEditingBilling(c => c ? { ...c, tax_rate: parseFloat(e.target.value) || 0 } : c)}
                        placeholder="15"
                        className={inputClass} style={inputStyle} />
                    </div>
                  </div>

                  {/* Bank details */}
                  <div className="pt-4 mb-4" style={{ borderTop: '1px solid #f0ede7' }}>
                    <p className="text-xs font-medium mb-3" style={{ color: '#888', letterSpacing: '0.05em' }}>BANK DETAILS</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: '#444' }}>Bank name</label>
                        <input type="text" value={editingBilling.bank_name ?? ''}
                          onChange={(e) => setEditingBilling(c => c ? { ...c, bank_name: e.target.value } : c)}
                          placeholder="e.g. CBZ Bank"
                          className={inputClass} style={inputStyle} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: '#444' }}>Account number</label>
                        <input type="text" value={editingBilling.bank_account ?? ''}
                          onChange={(e) => setEditingBilling(c => c ? { ...c, bank_account: e.target.value } : c)}
                          placeholder="0000000000"
                          className={inputClass} style={inputStyle} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: '#444' }}>Branch code</label>
                        <input type="text" value={editingBilling.bank_branch ?? ''}
                          onChange={(e) => setEditingBilling(c => c ? { ...c, bank_branch: e.target.value } : c)}
                          placeholder="e.g. 000001"
                          className={inputClass} style={inputStyle} />
                      </div>
                    </div>
                  </div>

                  {/* Invoice settings */}
                  <div className="pt-4 mb-4" style={{ borderTop: '1px solid #f0ede7' }}>
                    <p className="text-xs font-medium mb-3" style={{ color: '#888', letterSpacing: '0.05em' }}>INVOICE SETTINGS</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: '#444' }}>Invoice prefix</label>
                        <input type="text" value={editingBilling.invoice_prefix ?? 'INV'}
                          onChange={(e) => setEditingBilling(c => c ? { ...c, invoice_prefix: e.target.value } : c)}
                          placeholder="INV"
                          className={inputClass} style={inputStyle} />
                        <p className="text-xs mt-1" style={{ color: '#aaa' }}>
                          Invoices will be numbered: {editingBilling.invoice_prefix || 'INV'}-2026-001
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button onClick={saveBillingDetails} disabled={saving}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                      style={{ background: 'var(--color-brand)' }}>
                      <Save size={15} />
                      {saving ? 'Saving...' : 'Save billing details'}
                    </button>
                    <button onClick={() => setEditingBilling(null)} className="px-5 py-2.5 rounded-lg text-sm" style={{ color: '#666' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Preview of saved details */
                centre.company_name ? (
                  <div className="px-5 py-4">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#aaa' }}>Company</p>
                        <p style={{ color: '#1a1a18' }}>{centre.company_name}</p>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#aaa' }}>Email</p>
                        <p style={{ color: '#1a1a18' }}>{centre.company_email ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#aaa' }}>VAT number</p>
                        <p style={{ color: '#1a1a18' }}>{centre.vat_number ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#aaa' }}>Bank</p>
                        <p style={{ color: '#1a1a18' }}>{centre.bank_name ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#aaa' }}>Account</p>
                        <p style={{ color: '#1a1a18' }}>{centre.bank_account ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#aaa' }}>Tax rate</p>
                        <p style={{ color: '#1a1a18' }}>{centre.tax_rate ?? 15}%</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="px-5 py-4">
                    <p className="text-sm" style={{ color: '#aaa' }}>
                      No billing details set up yet. Click "Edit billing details" to configure.
                    </p>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}