'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, AlertCircle, Save } from 'lucide-react'

type Centre = { id: string; name: string }
type TenantRent = {
  tenant_id: string
  company_name: string
  unit_number: string | null
  rent_amount: number
  this_month_rent: number
  verified: boolean
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function RentPage() {
  const [centres, setCentres] = useState<Centre[]>([])
  const [tenants, setTenants] = useState<TenantRent[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCentre, setSelectedCentre] = useState('')
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.from('centres').select('id, name').eq('is_active', true).order('name')
      setCentres(data ?? [])
      if (data?.[0]) setSelectedCentre(data[0].id)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!selectedCentre) return
    loadTenants()
  }, [selectedCentre])

  async function loadTenants() {
    const supabase = createClient()
    const { data } = await supabase
      .from('tenants')
      .select('id, company_name, unit_number, rent_amount')
      .eq('centre_id', selectedCentre)
      .eq('status', 'active')
      .order('company_name')

    setTenants((data ?? []).map((t: any) => ({
      tenant_id: t.id,
      company_name: t.company_name,
      unit_number: t.unit_number,
      rent_amount: t.rent_amount ?? 0,
      this_month_rent: t.rent_amount ?? 0,
      verified: false,
    })))
  }

  function updateRent(tenant_id: string, value: number) {
    setTenants(prev => prev.map(t => t.tenant_id === tenant_id ? { ...t, this_month_rent: value } : t))
  }

  async function saveRentAmount(tenant_id: string, amount: number) {
    const supabase = createClient()
    await supabase.from('tenants').update({ rent_amount: amount }).eq('id', tenant_id)
  }

  function toggleVerified(tenant_id: string) {
    setTenants(prev => prev.map(t => t.tenant_id === tenant_id ? { ...t, verified: !t.verified } : t))
  }

  function verifyAll() {
    setTenants(prev => prev.map(t => ({ ...t, verified: true })))
  }

  async function saveBilling() {
    if (!selectedCentre) return
    setSaving(true)
    setError(null)
    const supabase = createClient()

    try {
      // Get or create billing period
      let periodId: string | null = null
      const { data: existing } = await supabase
        .from('billing_periods')
        .select('id')
        .eq('centre_id', selectedCentre)
        .eq('period_month', selectedMonth + 1)
        .eq('period_year', selectedYear)
        .maybeSingle()

      if (existing) {
        periodId = existing.id
      } else {
        const { data: newPeriod } = await supabase
          .from('billing_periods')
          .insert({ centre_id: selectedCentre, period_month: selectedMonth + 1, period_year: selectedYear, status: 'draft' })
          .select().single()
        periodId = newPeriod?.id ?? null
      }

      if (periodId) {
        const lines = tenants.map(t => ({
          billing_period_id: periodId,
          tenant_id: t.tenant_id,
          utility_type: 'rent',
description: 'Monthly rent',
          cost_price: 0,
          sell_price: t.this_month_rent,
          quantity: 1,
          is_verified: t.verified,
        }))
        await supabase.from('billing_line_items')
          .upsert(lines, { onConflict: 'billing_period_id,tenant_id,utility_type' })
      }

      // Save rent amounts back to tenant profiles
      for (const t of tenants) {
        if (t.this_month_rent !== t.rent_amount) {
          await saveRentAmount(t.tenant_id, t.this_month_rent)
        }
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err.message)
    }
    setSaving(false)
  }

  const verifiedCount = tenants.filter(t => t.verified).length
  const totalRent = tenants.reduce((sum, t) => sum + t.this_month_rent, 0)

  if (loading) return <div className="p-8"><p style={{ color: '#888' }}>Loading...</p></div>

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-medium" style={{ color: '#1a1a18' }}>Rent</h1>
          <p className="text-sm mt-1" style={{ color: '#888' }}>Monthly rental charges per tenant</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={verifyAll}
            className="px-4 py-2.5 rounded-lg text-sm"
            style={{ border: '1px solid #e2e0da', background: '#fff', color: '#444' }}>
            Verify all
          </button>
          <button onClick={saveBilling} disabled={saving || verifiedCount === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ background: saved ? '#1a6b3a' : 'var(--color-brand)' }}>
            {saved ? <><Check size={15} /> Saved</> : saving ? 'Saving...' : <><Save size={15} /> Save billing run</>}
          </button>
        </div>
      </div>

      {/* Selectors */}
      <div className="flex items-center gap-3 mb-6">
        <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{ border: '1px solid #e2e0da', background: '#fff', color: '#1a1a18' }}>
          {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
        <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{ border: '1px solid #e2e0da', background: '#fff', color: '#1a1a18' }}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div className="w-px h-6" style={{ background: '#e2e0da' }} />
        <select value={selectedCentre} onChange={(e) => setSelectedCentre(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{ border: '1px solid #e2e0da', background: '#fff', color: '#1a1a18' }}>
          {centres.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total tenants', value: tenants.length },
          { label: 'Total rent', value: `$${totalRent.toFixed(2)}` },
          { label: 'Verified', value: `${verifiedCount}/${tenants.length}` },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
            <p className="text-xs" style={{ color: '#888' }}>{s.label}</p>
            <p className="text-xl font-semibold mt-1" style={{ color: '#1a1a18' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <p className="text-sm" style={{ color: '#888' }}>{verifiedCount} of {tenants.length} verified</p>
          <p className="text-sm font-medium" style={{ color: 'var(--color-brand)' }}>
            {tenants.length > 0 ? Math.round((verifiedCount / tenants.length) * 100) : 0}%
          </p>
        </div>
        <div className="w-full h-1.5 rounded-full" style={{ background: '#e8e6e0' }}>
          <div className="h-1.5 rounded-full transition-all"
            style={{ width: `${tenants.length > 0 ? (verifiedCount / tenants.length) * 100 : 0}%`, background: 'var(--color-brand)' }} />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #ece9e3', background: '#fff' }}>
        <div className="grid px-5 py-2.5 text-xs font-medium"
          style={{ gridTemplateColumns: '1fr 100px 160px 80px', color: '#888', background: '#fafaf8', borderBottom: '1px solid #f0ede7' }}>
          <span>Tenant</span>
          <span>Unit</span>
          <span>Monthly rent (USD)</span>
          <span>Verified</span>
        </div>

        {tenants.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm" style={{ color: '#aaa' }}>No active tenants at this centre.</p>
          </div>
        ) : (
          <>
            {tenants.map((tenant, i) => (
              <div key={tenant.tenant_id} className="grid px-5 py-3 items-center"
                style={{ gridTemplateColumns: '1fr 100px 160px 80px', borderTop: i > 0 ? '1px solid #f0ede7' : 'none', background: tenant.verified ? '#f9fdf9' : 'transparent' }}>
                <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>{tenant.company_name}</p>
                <p className="text-sm" style={{ color: '#888' }}>{tenant.unit_number ?? '—'}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: '#888' }}>$</span>
                  <input type="number" step="0.01" value={tenant.this_month_rent}
                    onChange={(e) => updateRent(tenant.tenant_id, parseFloat(e.target.value) || 0)}
                    className="flex-1 px-2 py-1.5 rounded text-sm outline-none"
                    style={{ border: '1px solid #e2e0da', background: '#fff', color: '#1a1a18' }} />
                </div>
                <button onClick={() => toggleVerified(tenant.tenant_id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  style={tenant.verified ? { background: '#e8f5ee', color: '#1a472a' } : { background: '#f5f5f5', color: '#ccc' }}>
                  <Check size={14} />
                </button>
              </div>
            ))}

            {/* Totals */}
            <div className="grid px-5 py-3 items-center"
              style={{ gridTemplateColumns: '1fr 100px 160px 80px', borderTop: '2px solid #e8e6e0', background: '#fafaf8' }}>
              <p className="text-xs font-medium" style={{ color: '#888' }}>TOTAL</p>
              <span />
              <p className="text-sm font-semibold" style={{ color: '#1a1a18' }}>${totalRent.toFixed(2)}</p>
              <span />
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 mt-4 px-4 py-3 rounded-lg text-sm" style={{ background: '#fff0f0', color: '#c0392b' }}>
          <AlertCircle size={15} />{error}
        </div>
      )}
    </div>
  )
}