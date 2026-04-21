'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Wifi, ChevronDown, Check, AlertCircle } from 'lucide-react'

type Centre = { id: string; name: string }
type Package = { id: string; name: string; speed_mbps: number; cost_price: number; sell_price: number }
type TenantInternet = {
  id: string
  tenant_id: string
  company_name: string
  centre_id: string
  package_id: string | null
  custom_sell_price: number | null
  package: Package | null
  // billing fields
  this_month_price: number
  router_fee: number
  installation_fee: number
  is_new: boolean
  verified: boolean
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

export default function InternetBillingPage() {
  const [centres, setCentres] = useState<Centre[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [tenants, setTenants] = useState<TenantInternet[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [selectedCentre, setSelectedCentre] = useState<string>('all')

  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [centresRes, packagesRes, tenantsRes, internetRes] = await Promise.all([
        supabase.from('centres').select('id, name').eq('is_active', true).order('name'),
        supabase.from('internet_packages').select('*').eq('is_active', true),
        supabase.from('tenants').select('id, company_name, centre_id').eq('has_internet', true).eq('status', 'active'),
        supabase.from('tenant_internet').select('*, package:internet_packages(*)'),
      ])

      setCentres(centresRes.data ?? [])
      setPackages(packagesRes.data ?? [])

      const internetMap = new Map(
        (internetRes.data ?? []).map((i: any) => [i.tenant_id, i])
      )

      const rows: TenantInternet[] = (tenantsRes.data ?? []).map((t: any) => {
        const sub = internetMap.get(t.id) as any
        const basePrice = sub?.custom_sell_price ?? sub?.package?.sell_price ?? 0
        return {
          id: sub?.id ?? '',
          tenant_id: t.id,
          company_name: t.company_name,
          centre_id: t.centre_id,
          package_id: sub?.package_id ?? null,
          custom_sell_price: sub?.custom_sell_price ?? null,
          package: sub?.package ?? null,
          this_month_price: basePrice,
          router_fee: 0,
          installation_fee: 0,
          is_new: false,
          verified: false,
        }
      })

      setTenants(rows)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = tenants.filter((t) =>
    selectedCentre === 'all' ? true : t.centre_id === selectedCentre
  )

  const totalRevenue = filtered.reduce((sum, t) => sum + t.this_month_price + (t.is_new ? t.router_fee + t.installation_fee : 0), 0)
  const totalCost = filtered.reduce((sum, t) => sum + (t.package?.cost_price ?? 0), 0)
  const totalProfit = totalRevenue - totalCost
  const verifiedCount = filtered.filter((t) => t.verified).length

  function updateTenant(tenant_id: string, field: string, value: any) {
    setTenants((prev) =>
      prev.map((t) => t.tenant_id === tenant_id ? { ...t, [field]: value } : t)
    )
  }

  function toggleVerified(tenant_id: string) {
    setTenants((prev) =>
      prev.map((t) => t.tenant_id === tenant_id ? { ...t, verified: !t.verified } : t)
    )
  }

  function verifyAll() {
    setTenants((prev) =>
      prev.map((t) =>
        t.centre_id === selectedCentre || selectedCentre === 'all'
          ? { ...t, verified: true }
          : t
      )
    )
  }

  async function saveBilling() {
    setSaving(true)
    const supabase = createClient()

    // Get or create billing period
    let periodId: string | null = null
    const centreId = selectedCentre === 'all' ? null : selectedCentre

    if (centreId) {
      const { data: existing } = await supabase
        .from('billing_periods')
        .select('id')
        .eq('centre_id', centreId)
        .eq('period_month', selectedMonth + 1)
        .eq('period_year', selectedYear)
        .maybeSingle()

      if (existing) {
        periodId = existing.id
      } else {
        const { data: newPeriod } = await supabase
          .from('billing_periods')
          .insert({
            centre_id: centreId,
            period_month: selectedMonth + 1,
            period_year: selectedYear,
            status: 'draft',
          })
          .select()
          .single()
        periodId = newPeriod?.id ?? null
      }
    }

    if (periodId) {
      const lines = filtered.map((t) => ({
        billing_period_id: periodId,
        tenant_id: t.tenant_id,
        utility_type: 'internet',
        description: `Internet — ${t.package?.name ?? 'Custom'} ${t.package?.speed_mbps ? `(${t.package.speed_mbps}Mbps)` : ''}`,
        cost_price: t.package?.cost_price ?? 0,
        sell_price: t.this_month_price + (t.is_new ? t.router_fee + t.installation_fee : 0),
        quantity: 1,
        is_verified: t.verified,
      }))

      await supabase
        .from('billing_line_items')
        .upsert(lines, { onConflict: 'billing_period_id,tenant_id,utility_type' })
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <div className="p-8"><p style={{ color: '#888' }}>Loading...</p></div>

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-medium" style={{ color: '#1a1a18' }}>Internet billing</h1>
          <p className="text-sm mt-1" style={{ color: '#888' }}>Dande Mutande · Monthly charges</p>
        </div>
        <button
          onClick={saveBilling}
          disabled={saving || verifiedCount === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-all"
          style={{ background: saved ? '#1a6b3a' : 'var(--color-brand)' }}
        >
          {saved ? <><Check size={15} /> Saved</> : saving ? 'Saving...' : 'Save billing run'}
        </button>
      </div>

      {/* Period + Centre selectors */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{ border: '1px solid #e2e0da', background: '#fff', color: '#1a1a18' }}
          >
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{ border: '1px solid #e2e0da', background: '#fff', color: '#1a1a18' }}
          >
            {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="w-px h-6" style={{ background: '#e2e0da' }} />

        <select
          value={selectedCentre}
          onChange={(e) => setSelectedCentre(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{ border: '1px solid #e2e0da', background: '#fff', color: '#1a1a18' }}
        >
          <option value="all">All centres</option>
          {centres.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <button
          onClick={verifyAll}
          className="px-3 py-2 rounded-lg text-sm transition-all"
          style={{ border: '1px solid #e2e0da', background: '#fff', color: '#444' }}
        >
          Verify all
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Tenants', value: filtered.length },
          { label: 'Total revenue', value: `$${totalRevenue.toFixed(2)}` },
          { label: 'Total cost', value: `$${totalCost.toFixed(2)}` },
          { label: 'Profit', value: `$${totalProfit.toFixed(2)}` },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
            <p className="text-xs" style={{ color: '#888' }}>{s.label}</p>
            <p className="text-xl font-semibold mt-1" style={{ color: '#1a1a18' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm" style={{ color: '#888' }}>
            {verifiedCount} of {filtered.length} verified
          </p>
          <p className="text-sm font-medium" style={{ color: 'var(--color-brand)' }}>
            {filtered.length > 0 ? Math.round((verifiedCount / filtered.length) * 100) : 0}%
          </p>
        </div>
        <div className="w-full h-1.5 rounded-full" style={{ background: '#e8e6e0' }}>
          <div
            className="h-1.5 rounded-full transition-all"
            style={{
              width: `${filtered.length > 0 ? (verifiedCount / filtered.length) * 100 : 0}%`,
              background: 'var(--color-brand)',
            }}
          />
        </div>
      </div>

      {/* Tenant rows */}
      {filtered.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
          <Wifi size={24} style={{ color: '#ccc', margin: '0 auto 12px' }} />
          <p className="text-sm" style={{ color: '#888' }}>
            No tenants with internet subscriptions found.
          </p>
          <p className="text-xs mt-1" style={{ color: '#aaa' }}>
            Go to a tenant and enable internet to see them here.
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #ece9e3', background: '#fff' }}>
          {/* Table header */}
          <div
            className="grid px-5 py-2.5 text-xs font-medium"
            style={{
              gridTemplateColumns: '1fr 140px 100px 100px 100px 80px 60px',
              color: '#888',
              background: '#fafaf8',
              borderBottom: '1px solid #f0ede7',
            }}
          >
            <span>Tenant</span>
            <span>Package</span>
            <span>Cost price</span>
            <span>Charge</span>
            <span>One-off fees</span>
            <span>Total</span>
            <span>Verified</span>
          </div>

          {filtered.map((tenant, i) => {
            const oneOff = tenant.is_new ? tenant.router_fee + tenant.installation_fee : 0
            const total = tenant.this_month_price + oneOff
            const margin = total - (tenant.package?.cost_price ?? 0)
            const centre = centres.find((c) => c.id === tenant.centre_id)

            return (
              <div
                key={tenant.tenant_id}
                className="grid px-5 py-3 items-center"
                style={{
                  gridTemplateColumns: '1fr 140px 100px 100px 100px 80px 60px',
                  borderTop: i > 0 ? '1px solid #f0ede7' : 'none',
                  background: tenant.verified ? '#f9fdf9' : 'transparent',
                }}
              >
                {/* Tenant name */}
                <div>
                  <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>{tenant.company_name}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#aaa' }}>{centre?.name}</p>
                </div>

                {/* Package */}
                <div>
                  <p className="text-xs font-medium" style={{ color: '#555' }}>
                    {tenant.package?.name ?? 'Custom'}
                  </p>
                  <p className="text-xs" style={{ color: '#aaa' }}>
                    {tenant.package?.speed_mbps ? `${tenant.package.speed_mbps}Mbps` : '—'}
                  </p>
                </div>

                {/* Cost price */}
                <p className="text-sm" style={{ color: '#888' }}>
                  ${(tenant.package?.cost_price ?? 0).toFixed(2)}
                </p>

                {/* Charge (editable) */}
                <div>
                  <input
                    type="number"
                    step="0.01"
                    value={tenant.this_month_price}
                    onChange={(e) => updateTenant(tenant.tenant_id, 'this_month_price', parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 rounded text-sm outline-none"
                    style={{ border: '1px solid #e2e0da', background: '#fff', color: '#1a1a18' }}
                  />
                  {margin > 0 && (
                    <p className="text-xs mt-0.5" style={{ color: '#1a6b3a' }}>
                      +${margin.toFixed(2)} margin
                    </p>
                  )}
                </div>

                {/* One-off fees */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs mb-1" style={{ color: '#888' }}>
                    <input
                      type="checkbox"
                      checked={tenant.is_new}
                      onChange={(e) => updateTenant(tenant.tenant_id, 'is_new', e.target.checked)}
                    />
                    New tenant
                  </label>
                  {tenant.is_new && (
                    <div className="space-y-1">
                      <input
                        type="number"
                        step="0.01"
                        value={tenant.router_fee}
                        onChange={(e) => updateTenant(tenant.tenant_id, 'router_fee', parseFloat(e.target.value) || 0)}
                        placeholder="Router fee"
                        className="w-full px-2 py-1 rounded text-xs outline-none"
                        style={{ border: '1px solid #e2e0da', background: '#fff', color: '#1a1a18' }}
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={tenant.installation_fee}
                        onChange={(e) => updateTenant(tenant.tenant_id, 'installation_fee', parseFloat(e.target.value) || 0)}
                        placeholder="Installation fee"
                        className="w-full px-2 py-1 rounded text-xs outline-none"
                        style={{ border: '1px solid #e2e0da', background: '#fff', color: '#1a1a18' }}
                      />
                    </div>
                  )}
                </div>

                {/* Total */}
                <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>
                  ${total.toFixed(2)}
                </p>

                {/* Verified toggle */}
                <button
                  onClick={() => toggleVerified(tenant.tenant_id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  style={
                    tenant.verified
                      ? { background: '#e8f5ee', color: '#1a472a' }
                      : { background: '#f5f5f5', color: '#ccc' }
                  }
                  title={tenant.verified ? 'Verified' : 'Click to verify'}
                >
                  <Check size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Warning if unverified */}
      {filtered.length > 0 && verifiedCount < filtered.length && (
        <div
          className="flex items-center gap-2 mt-4 px-4 py-3 rounded-lg text-sm"
          style={{ background: '#fef3dc', color: '#7d5a00' }}
        >
          <AlertCircle size={15} />
          {filtered.length - verifiedCount} tenant{filtered.length - verifiedCount !== 1 ? 's' : ''} not yet verified. Verify all before saving.
        </div>
      )}
    </div>
  )
}