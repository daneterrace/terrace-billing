'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, AlertCircle, Save, Plus, Trash2 } from 'lucide-react'

type Centre = { id: string; name: string }
type Expense = { id: string; name: string; amount: number }
type TenantOps = {
  tenant_id: string
  company_name: string
  unit_number: string | null
  unit_size_m2: number
  manual_amount: number | null
  calculated_amount: number
  verified: boolean
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function OpsPage() {
  const [centres, setCentres] = useState<Centre[]>([])
  const [tenants, setTenants] = useState<TenantOps[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([
    { id: '1', name: 'Gardening', amount: 0 },
    { id: '2', name: 'Maintenance', amount: 0 },
    { id: '3', name: 'Lighting / electricity', amount: 0 },
  ])
  const [splitMethod, setSplitMethod] = useState<'m2' | 'manual'>('m2')
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
      .select('id, company_name, unit_number, unit_size_m2')
      .eq('centre_id', selectedCentre)
      .eq('status', 'active')
      .order('company_name')

    setTenants((data ?? []).map((t: any) => ({
      tenant_id: t.id,
      company_name: t.company_name,
      unit_number: t.unit_number,
      unit_size_m2: t.unit_size_m2 ?? 0,
      manual_amount: null,
      calculated_amount: 0,
      verified: false,
    })))
  }

  // Recalculate ops share whenever expenses or m2 changes
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const totalM2 = tenants.reduce((sum, t) => sum + t.unit_size_m2, 0)

  const tenantsWithCalc = tenants.map(t => ({
    ...t,
    calculated_amount: splitMethod === 'm2' && totalM2 > 0
      ? (t.unit_size_m2 / totalM2) * totalExpenses
      : t.manual_amount ?? 0,
  }))

  const totalCharged = tenantsWithCalc.reduce((sum, t) => sum + t.calculated_amount, 0)
  const difference = totalExpenses - totalCharged
  const verifiedCount = tenants.filter(t => t.verified).length

  function addExpense() {
    setExpenses(prev => [...prev, { id: Date.now().toString(), name: '', amount: 0 }])
  }

  function updateExpense(id: string, field: 'name' | 'amount', value: string | number) {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
  }

  function removeExpense(id: string) {
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  function updateTenantM2(tenant_id: string, value: number) {
    setTenants(prev => prev.map(t => t.tenant_id === tenant_id ? { ...t, unit_size_m2: value } : t))
  }

  function updateManualAmount(tenant_id: string, value: number) {
    setTenants(prev => prev.map(t => t.tenant_id === tenant_id ? { ...t, manual_amount: value } : t))
  }

  function toggleVerified(tenant_id: string) {
    setTenants(prev => prev.map(t => t.tenant_id === tenant_id ? { ...t, verified: !t.verified } : t))
  }

  function verifyAll() {
    setTenants(prev => prev.map(t => ({ ...t, verified: true })))
  }

  async function saveBilling() {
    if (!selectedCentre) return
    if (splitMethod === 'm2' && Math.abs(difference) > 0.01) {
      setError(`Total charged ($${totalCharged.toFixed(2)}) doesn't match total expenses ($${totalExpenses.toFixed(2)}). Check m2 values.`)
      return
    }
    setSaving(true)
    setError(null)
    const supabase = createClient()

    try {
      // Save m2 to tenant profiles
      for (const t of tenantsWithCalc) {
        if (t.unit_size_m2 > 0) {
          await supabase.from('tenants').update({ unit_size_m2: t.unit_size_m2 }).eq('id', t.tenant_id)
        }
      }

      // Get or create billing period
      let periodId: string | null = null
      const { data: existing } = await supabase
        .from('billing_periods').select('id')
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
        const expenseNames = expenses.filter(e => e.name && e.amount > 0).map(e => e.name).join(', ')
        const lines = tenantsWithCalc.map(t => ({
          billing_period_id: periodId,
          tenant_id: t.tenant_id,
          utility_type: 'management',
          description: `Ops charges: ${expenseNames || 'Centre expenses'}`,
          cost_price: 0,
          sell_price: t.calculated_amount,
          quantity: 1,
          is_verified: t.verified,
        }))
        await supabase.from('billing_line_items')
          .upsert(lines, { onConflict: 'billing_period_id,tenant_id,utility_type' })
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err.message)
    }
    setSaving(false)
  }

  const inputClass = "w-full px-3 py-2 rounded-lg text-sm outline-none"
  const inputStyle = { border: '1px solid #e2e0da', background: '#fff', color: '#1a1a18' }

  if (loading) return <div className="p-8"><p style={{ color: '#888' }}>Loading...</p></div>

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-medium" style={{ color: '#1a1a18' }}>Ops charges</h1>
          <p className="text-sm mt-1" style={{ color: '#888' }}>Centre operational expenses divided across tenants</p>
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

      {/* Expenses panel */}
      <div className="rounded-xl p-5 mb-6" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>Centre expenses this month</p>
          <button onClick={addExpense}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
            style={{ border: '1px solid #e2e0da', background: '#fff', color: '#444' }}>
            <Plus size={12} /> Add expense
          </button>
        </div>

        <div className="space-y-2 mb-4">
          {expenses.map(expense => (
            <div key={expense.id} className="flex items-center gap-3">
              <input type="text" value={expense.name}
                onChange={(e) => updateExpense(expense.id, 'name', e.target.value)}
                placeholder="Expense name (e.g. Gardening)"
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={inputStyle} />
              <div className="flex items-center gap-1">
                <span className="text-sm" style={{ color: '#888' }}>$</span>
                <input type="number" step="0.01" value={expense.amount}
                  onChange={(e) => updateExpense(expense.id, 'amount', parseFloat(e.target.value) || 0)}
                  className="w-28 px-3 py-2 rounded-lg text-sm outline-none"
                  style={inputStyle} />
              </div>
              <button onClick={() => removeExpense(expense.id)}
                className="p-2 rounded-lg" style={{ color: '#e74c3c' }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid #f0ede7' }}>
          <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>Total expenses</p>
          <p className="text-lg font-semibold" style={{ color: '#1a1a18' }}>${totalExpenses.toFixed(2)}</p>
        </div>
      </div>

      {/* Split method */}
      <div className="rounded-xl p-5 mb-6" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
        <p className="text-sm font-medium mb-3" style={{ color: '#1a1a18' }}>How to split costs</p>
        <div className="flex gap-3">
          {[
            { key: 'm2', label: 'By m² (proportional)', desc: 'Tenants with larger units pay more' },
            { key: 'manual', label: 'Manual', desc: 'Enter each tenant\'s share manually' },
          ].map(({ key, label, desc }) => (
            <label key={key}
              className="flex-1 flex items-start gap-3 p-4 rounded-xl cursor-pointer"
              style={{ border: `2px solid ${splitMethod === key ? 'var(--color-brand-light)' : '#e2e0da'}`, background: splitMethod === key ? 'var(--color-brand-muted)' : '#fff' }}>
              <input type="radio" name="split" value={key} checked={splitMethod === key}
                onChange={() => setSplitMethod(key as 'm2' | 'manual')} className="mt-0.5" />
              <div>
                <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>{label}</p>
                <p className="text-xs mt-0.5" style={{ color: '#888' }}>{desc}</p>
              </div>
            </label>
          ))}
        </div>

        {splitMethod === 'm2' && (
          <div className="mt-3 px-4 py-3 rounded-lg text-sm" style={{ background: '#f7f6f3' }}>
            Total m² across all tenants: <strong>{totalM2.toFixed(0)} m²</strong>
            {totalM2 === 0 && (
              <span style={{ color: '#e74c3c' }}> — Add m² for each tenant below</span>
            )}
          </div>
        )}

        {splitMethod === 'manual' && Math.abs(difference) > 0.01 && totalExpenses > 0 && (
          <div className="mt-3 px-4 py-3 rounded-lg text-sm flex items-center gap-2"
            style={{ background: '#fef3dc', color: '#7d5a00' }}>
            <AlertCircle size={14} />
            Difference of ${Math.abs(difference).toFixed(2)} — manual amounts must add up to ${totalExpenses.toFixed(2)}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total expenses', value: `$${totalExpenses.toFixed(2)}` },
          { label: 'Total charged', value: `$${totalCharged.toFixed(2)}` },
          { label: 'Verified', value: `${verifiedCount}/${tenants.length}` },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
            <p className="text-xs" style={{ color: '#888' }}>{s.label}</p>
            <p className="text-xl font-semibold mt-1" style={{ color: '#1a1a18' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tenant table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #ece9e3', background: '#fff' }}>
        <div className="grid px-5 py-2.5 text-xs font-medium"
          style={{
            gridTemplateColumns: splitMethod === 'm2' ? '1fr 80px 100px 120px 60px' : '1fr 80px 160px 60px',
            color: '#888', background: '#fafaf8', borderBottom: '1px solid #f0ede7'
          }}>
          <span>Tenant</span>
          <span>Unit</span>
          {splitMethod === 'm2' && <span>Size (m²)</span>}
          <span>Ops share</span>
          <span>Verified</span>
        </div>

        {tenantsWithCalc.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm" style={{ color: '#aaa' }}>No active tenants at this centre.</p>
          </div>
        ) : (
          <>
            {tenantsWithCalc.map((tenant, i) => (
              <div key={tenant.tenant_id} className="grid px-5 py-3 items-center"
                style={{
                  gridTemplateColumns: splitMethod === 'm2' ? '1fr 80px 100px 120px 60px' : '1fr 80px 160px 60px',
                  borderTop: i > 0 ? '1px solid #f0ede7' : 'none',
                  background: tenant.verified ? '#f9fdf9' : 'transparent'
                }}>
                <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>{tenant.company_name}</p>
                <p className="text-sm" style={{ color: '#888' }}>{tenant.unit_number ?? '—'}</p>
                {splitMethod === 'm2' && (
                  <div className="flex items-center gap-1">
                    <input type="number" step="0.1" value={tenant.unit_size_m2 || ''}
                      onChange={(e) => updateTenantM2(tenant.tenant_id, parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full px-2 py-1.5 rounded text-sm outline-none"
                      style={{ border: '1px solid #e2e0da', background: '#fff', color: '#1a1a18' }} />
                    <span className="text-xs" style={{ color: '#888' }}>m²</span>
                  </div>
                )}
                {splitMethod === 'manual' ? (
                  <div className="flex items-center gap-1">
                    <span className="text-sm" style={{ color: '#888' }}>$</span>
                    <input type="number" step="0.01" value={tenant.manual_amount ?? ''}
                      onChange={(e) => updateManualAmount(tenant.tenant_id, parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="flex-1 px-2 py-1.5 rounded text-sm outline-none"
                      style={{ border: '1px solid #e2e0da', background: '#fff', color: '#1a1a18' }} />
                  </div>
                ) : (
                  <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>
                    {tenant.calculated_amount > 0 ? `$${tenant.calculated_amount.toFixed(2)}` : '—'}
                  </p>
                )}
                <button onClick={() => toggleVerified(tenant.tenant_id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  style={tenant.verified ? { background: '#e8f5ee', color: '#1a472a' } : { background: '#f5f5f5', color: '#ccc' }}>
                  <Check size={14} />
                </button>
              </div>
            ))}

            <div className="grid px-5 py-3 items-center"
              style={{
                gridTemplateColumns: splitMethod === 'm2' ? '1fr 80px 100px 120px 60px' : '1fr 80px 160px 60px',
                borderTop: '2px solid #e8e6e0', background: '#fafaf8'
              }}>
              <p className="text-xs font-medium" style={{ color: '#888' }}>TOTAL</p>
              <span />
              {splitMethod === 'm2' && <p className="text-xs font-medium" style={{ color: '#888' }}>{totalM2.toFixed(0)} m²</p>}
              <p className="text-sm font-semibold" style={{ color: '#1a1a18' }}>${totalCharged.toFixed(2)}</p>
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