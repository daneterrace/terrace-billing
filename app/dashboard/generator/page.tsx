'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Zap, Check, AlertCircle, ChevronDown, ChevronUp, Upload, Download } from 'lucide-react'
import * as XLSX from 'xlsx'

type Centre = { id: string; name: string }
type TenantReading = {
  tenant_id: string
  company_name: string
  centre_id: string
  meter_number: string
  opening: string
  closing: string
  units_used: number
  charge: number
  verified: boolean
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

export default function GeneratorPage() {
  const [centres, setCentres] = useState<Centre[]>([])
  const [tenants, setTenants] = useState<TenantReading[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadMsg, setUploadMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const now = new Date()
  const [selectedCentre, setSelectedCentre] = useState<string>('')
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  const [fuelCost, setFuelCost] = useState('')
  const [maintenanceCost, setMaintenanceCost] = useState('')
  const [otherCost, setOtherCost] = useState('')
  const [showCosts, setShowCosts] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const centresRes = await supabase.from('centres').select('id, name').eq('is_active', true).order('name')
      setCentres(centresRes.data ?? [])
      if (centresRes.data?.[0]) setSelectedCentre(centresRes.data[0].id)
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
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('id, company_name, centre_id')
      .eq('centre_id', selectedCentre)
      .eq('has_generator', true)
      .eq('status', 'active')
      .order('company_name')

    const { data: genData } = await supabase
      .from('tenant_generator')
      .select('*')
      .in('tenant_id', (tenantData ?? []).map((t: any) => t.id))

    const genMap = new Map((genData ?? []).map((g: any) => [g.tenant_id, g]))

    setTenants((tenantData ?? []).map((t: any) => {
      const gen = genMap.get(t.id) as any
      return {
        tenant_id: t.id,
        company_name: t.company_name,
        centre_id: t.centre_id,
        meter_number: gen?.meter_number ?? '',
        opening: '',
        closing: '',
        units_used: 0,
        charge: 0,
        verified: false,
      }
    }))

    setFuelCost('')
    setMaintenanceCost('')
    setOtherCost('')
    setUploadMsg(null)
  }

  const totalCost = (parseFloat(fuelCost) || 0) + (parseFloat(maintenanceCost) || 0) + (parseFloat(otherCost) || 0)
  const totalKwh = tenants.reduce((sum, t) => sum + t.units_used, 0)
  const costPerKwh = totalKwh > 0 ? totalCost / totalKwh : 0

  function updateReading(tenant_id: string, field: 'opening' | 'closing', value: string) {
    setTenants(prev => prev.map(t => {
      if (t.tenant_id !== tenant_id) return t
      const updated = { ...t, [field]: value }
      const open = parseFloat(field === 'opening' ? value : t.opening) || 0
      const close = parseFloat(field === 'closing' ? value : t.closing) || 0
      updated.units_used = Math.max(0, close - open)
      return updated
    }))
  }

  const tenantsWithCharges = tenants.map(t => ({
    ...t,
    charge: t.units_used * costPerKwh,
  }))

  function toggleVerified(tenant_id: string) {
    setTenants(prev => prev.map(t =>
      t.tenant_id === tenant_id ? { ...t, verified: !t.verified } : t
    ))
  }

  function verifyAll() {
    setTenants(prev => prev.map(t => ({ ...t, verified: true })))
  }

  // ── EXCEL UPLOAD ──────────────────────────────────────────
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadMsg(null)
    setError(null)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        // Find header row (row with "Tenant Name")
        let headerRow = -1
        for (let i = 0; i < rows.length; i++) {
          if (rows[i].some((cell: any) => String(cell).toLowerCase().includes('tenant name'))) {
            headerRow = i
            break
          }
        }

        if (headerRow === -1) {
          setError('Could not find header row in the Excel file. Make sure you are using the correct template.')
          return
        }

        const headers = rows[headerRow].map((h: any) => String(h).toLowerCase().trim())
        const tenantCol = headers.findIndex((h: string) => h.includes('tenant name'))
        const openCol = headers.findIndex((h: string) => h.includes('opening'))
        const closeCol = headers.findIndex((h: string) => h.includes('closing'))
        const meterCol = headers.findIndex((h: string) => h.includes('meter'))

        if (tenantCol === -1 || openCol === -1 || closeCol === -1) {
          setError('Missing required columns. Make sure the file has Tenant Name, Opening Reading, and Closing Reading columns.')
          return
        }

        // Parse data rows
        const readings: { name: string; opening: number; closing: number; meter: string }[] = []
        for (let i = headerRow + 2; i < rows.length; i++) { // +2 to skip instructions row
          const row = rows[i]
          const name = String(row[tenantCol] ?? '').trim()
          if (!name || name.toUpperCase() === 'TOTAL' || name === '') continue
          const opening = parseFloat(String(row[openCol])) || 0
          const closing = parseFloat(String(row[closeCol])) || 0
          const meter = meterCol >= 0 ? String(row[meterCol] ?? '').trim() : ''
          readings.push({ name, opening, closing, meter })
        }

        // Match to tenants (fuzzy match by name)
        let matched = 0
        let unmatched: string[] = []

        setTenants(prev => prev.map(tenant => {
          const match = readings.find(r =>
            r.name.toLowerCase() === tenant.company_name.toLowerCase() ||
            tenant.company_name.toLowerCase().includes(r.name.toLowerCase()) ||
            r.name.toLowerCase().includes(tenant.company_name.toLowerCase().split(' ')[0])
          )
          if (match) {
            matched++
            const units = Math.max(0, match.closing - match.opening)
            return {
              ...tenant,
              opening: match.opening.toString(),
              closing: match.closing.toString(),
              units_used: units,
              meter_number: match.meter || tenant.meter_number,
            }
          }
          return tenant
        }))

        // Find unmatched
        readings.forEach(r => {
          const found = tenants.some(t =>
            t.company_name.toLowerCase() === r.name.toLowerCase() ||
            t.company_name.toLowerCase().includes(r.name.toLowerCase())
          )
          if (!found) unmatched.push(r.name)
        })

        let msg = `✓ Matched ${matched} of ${readings.length} tenants from the file.`
        if (unmatched.length > 0) {
          msg += ` Could not match: ${unmatched.join(', ')}`
        }
        setUploadMsg(msg)

      } catch (err: any) {
        setError('Error reading file: ' + err.message)
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  // ── DOWNLOAD TEMPLATE ────────────────────────────────────
  function downloadTemplate() {
    const wb = XLSX.utils.book_new()
    const centre = centres.find(c => c.id === selectedCentre)

    const data = [
      ['TERRACE UTILITY BILLING — GENERATOR METER READINGS', '', '', '', '', '', ''],
      ['Centre:', centre?.name ?? '', '', '', '', '', ''],
      ['Month/Year:', `${MONTHS[selectedMonth]} ${selectedYear}`, '', '', '', '', ''],
      ['Completed by:', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['Shop #', 'Tenant Name', 'Meter Number', 'Opening Reading (kWh)', 'Closing Reading (kWh)', 'Units Used (kWh)', 'Notes'],
      ['Fill in yellow cells only. Do not change tenant names.', '', '', '', '', '', ''],
      ...tenants.map(t => [
        '',
        t.company_name,
        t.meter_number || '',
        0,
        0,
        { f: `IF(E${tenants.indexOf(t) + 9}-D${tenants.indexOf(t) + 9}>0,E${tenants.indexOf(t) + 9}-D${tenants.indexOf(t) + 9},0)` },
        '',
      ]),
      ['TOTAL', '', '', '', '', { f: `SUM(F9:F${tenants.length + 8})` }, ''],
    ]

    const ws = XLSX.utils.aoa_to_sheet(data)
    ws['!cols'] = [
      { wch: 10 }, { wch: 35 }, { wch: 18 },
      { wch: 22 }, { wch: 22 }, { wch: 20 }, { wch: 25 }
    ]
    XLSX.utils.book_append_sheet(wb, ws, 'Generator Readings')
    XLSX.writeFile(wb, `generator-readings-${centre?.name ?? 'centre'}-${MONTHS[selectedMonth]}-${selectedYear}.xlsx`)
  }

  const verifiedCount = tenants.filter(t => t.verified).length
  const totalRevenue = tenantsWithCharges.reduce((sum, t) => sum + t.charge, 0)

  async function saveBilling() {
    if (!selectedCentre) return
    setSaving(true)
    setError(null)
    const supabase = createClient()

    try {
      await supabase.from('generator_monthly').upsert({
        centre_id: selectedCentre,
        period_month: selectedMonth + 1,
        period_year: selectedYear,
        fuel_cost: parseFloat(fuelCost) || 0,
        opex_cost: (parseFloat(maintenanceCost) || 0) + (parseFloat(otherCost) || 0),
        total_kwh_generated: totalKwh,
        cost_per_kwh: costPerKwh,
        notes: `Maintenance: $${maintenanceCost || 0}, Other: $${otherCost || 0}`,
      }, { onConflict: 'centre_id,period_month,period_year' })

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
        const lines = tenantsWithCharges.map(t => ({
          billing_period_id: periodId,
          tenant_id: t.tenant_id,
          utility_type: 'generator',
          description: `Generator — ${t.units_used.toFixed(2)} kWh @ $${costPerKwh.toFixed(4)}/kWh`,
          cost_price: t.charge,
          sell_price: t.charge,
          quantity: t.units_used,
          rate_per_unit: costPerKwh,
          meter_reading_open: parseFloat(t.opening) || null,
          meter_reading_close: parseFloat(t.closing) || null,
          units_used: t.units_used,
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
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-medium" style={{ color: '#1a1a18' }}>Generator billing</h1>
          <p className="text-sm mt-1" style={{ color: '#888' }}>Enter readings manually or upload the Excel template</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={verifyAll}
            className="px-4 py-2.5 rounded-lg text-sm transition-all"
            style={{ border: '1px solid #e2e0da', background: '#fff', color: '#444' }}
          >
            Verify all
          </button>
          <button
            onClick={saveBilling}
            disabled={saving || verifiedCount === 0 || !selectedCentre}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ background: saved ? '#1a6b3a' : 'var(--color-brand)' }}
          >
            {saved ? <><Check size={15} /> Saved</> : saving ? 'Saving...' : 'Save billing run'}
          </button>
        </div>
      </div>

      {/* Selectors */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="px-3 py-2 rounded-lg text-sm outline-none" style={{ border: '1px solid #e2e0da', background: '#fff', color: '#1a1a18' }}>
          {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
        <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-3 py-2 rounded-lg text-sm outline-none" style={{ border: '1px solid #e2e0da', background: '#fff', color: '#1a1a18' }}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div className="w-px h-6" style={{ background: '#e2e0da' }} />
        <select value={selectedCentre} onChange={(e) => setSelectedCentre(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none" style={{ border: '1px solid #e2e0da', background: '#fff', color: '#1a1a18' }}>
          {centres.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="w-px h-6" style={{ background: '#e2e0da' }} />
        {/* Upload/Download buttons */}
        <button
          onClick={downloadTemplate}
          disabled={tenants.length === 0}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all disabled:opacity-50"
          style={{ border: '1px solid #e2e0da', background: '#fff', color: '#444' }}
        >
          <Download size={14} />
          Download template
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
          style={{ background: '#eaf4fd', color: '#1a5276', border: '1px solid #bde0f5' }}
        >
          <Upload size={14} />
          Upload readings
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
      </div>

      {/* Upload message */}
      {uploadMsg && (
        <div className="flex items-start gap-2 mb-4 px-4 py-3 rounded-lg text-sm"
          style={{ background: uploadMsg.startsWith('✓') ? '#e8f5ee' : '#fef3dc', color: uploadMsg.startsWith('✓') ? '#1a472a' : '#7d5a00' }}>
          {uploadMsg}
        </div>
      )}

      {/* Monthly costs */}
      <div className="rounded-xl mb-6 overflow-hidden" style={{ border: '1px solid #ece9e3', background: '#fff' }}>
        <button onClick={() => setShowCosts(!showCosts)} className="w-full flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>Monthly costs</p>
            {totalCost > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: '#fef3dc', color: '#7d5a00' }}>
                Total: ${totalCost.toFixed(2)}
              </span>
            )}
          </div>
          {showCosts ? <ChevronUp size={16} style={{ color: '#888' }} /> : <ChevronDown size={16} style={{ color: '#888' }} />}
        </button>

        {showCosts && (
          <div className="px-5 pb-5 border-t" style={{ borderColor: '#f0ede7' }}>
            <div className="grid grid-cols-3 gap-4 mt-4">
              {[
                { label: 'Fuel cost (USD)', val: fuelCost, set: setFuelCost },
                { label: 'Maintenance cost (USD)', val: maintenanceCost, set: setMaintenanceCost },
                { label: 'Other costs (USD)', val: otherCost, set: setOtherCost },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#444' }}>{label}</label>
                  <input type="number" step="0.01" value={val} onChange={(e) => set(e.target.value)}
                    placeholder="0.00" className={inputClass} style={inputStyle} />
                </div>
              ))}
            </div>
            {totalCost > 0 && (
              <div className="grid grid-cols-3 gap-4 mt-4">
                {[
                  { label: 'Total cost', value: `$${totalCost.toFixed(2)}` },
                  { label: 'Total kWh used', value: `${totalKwh.toFixed(2)} kWh` },
                  { label: 'Rate per kWh', value: costPerKwh > 0 ? `$${costPerKwh.toFixed(4)}` : '—' },
                ].map(s => (
                  <div key={s.label} className="rounded-lg p-3" style={{ background: '#f7f6f3' }}>
                    <p className="text-xs" style={{ color: '#888' }}>{s.label}</p>
                    <p className="text-sm font-medium mt-0.5" style={{ color: '#1a1a18' }}>{s.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Tenants', value: tenants.length },
          { label: 'Total kWh', value: `${totalKwh.toFixed(1)}` },
          { label: 'Total revenue', value: `$${totalRevenue.toFixed(2)}` },
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
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm" style={{ color: '#888' }}>{verifiedCount} of {tenants.length} verified</p>
          <p className="text-sm font-medium" style={{ color: 'var(--color-brand)' }}>
            {tenants.length > 0 ? Math.round((verifiedCount / tenants.length) * 100) : 0}%
          </p>
        </div>
        <div className="w-full h-1.5 rounded-full" style={{ background: '#e8e6e0' }}>
          <div className="h-1.5 rounded-full transition-all" style={{
            width: `${tenants.length > 0 ? (verifiedCount / tenants.length) * 100 : 0}%`,
            background: 'var(--color-brand)',
          }} />
        </div>
      </div>

      {/* Table */}
      {tenants.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
          <Zap size={24} style={{ color: '#ccc', margin: '0 auto 12px' }} />
          <p className="text-sm" style={{ color: '#888' }}>No tenants with generator subscriptions at this centre.</p>
          <p className="text-xs mt-1" style={{ color: '#aaa' }}>Go to a tenant and enable generator to see them here.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #ece9e3', background: '#fff' }}>
          <div className="grid px-5 py-2.5 text-xs font-medium"
            style={{ gridTemplateColumns: '1fr 100px 110px 110px 90px 100px 60px', color: '#888', background: '#fafaf8', borderBottom: '1px solid #f0ede7' }}>
            <span>Tenant</span>
            <span>Meter #</span>
            <span>Opening (kWh)</span>
            <span>Closing (kWh)</span>
            <span>Units used</span>
            <span>Charge</span>
            <span>Verified</span>
          </div>

          {tenantsWithCharges.map((tenant, i) => (
            <div key={tenant.tenant_id} className="grid px-5 py-3 items-center"
              style={{ gridTemplateColumns: '1fr 100px 110px 110px 90px 100px 60px', borderTop: i > 0 ? '1px solid #f0ede7' : 'none', background: tenant.verified ? '#f9fdf9' : 'transparent' }}>
              <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>{tenant.company_name}</p>
              <p className="text-xs" style={{ color: '#888' }}>{tenant.meter_number || '—'}</p>
              <input type="number" step="0.01" value={tenant.opening}
                onChange={(e) => updateReading(tenant.tenant_id, 'opening', e.target.value)}
                placeholder="0.00" className="w-full px-2 py-1.5 rounded text-sm outline-none"
                style={{ border: '1px solid #e2e0da', background: tenant.opening ? '#e8f5ee' : '#fff', color: '#1a1a18' }} />
              <input type="number" step="0.01" value={tenant.closing}
                onChange={(e) => updateReading(tenant.tenant_id, 'closing', e.target.value)}
                placeholder="0.00" className="w-full px-2 py-1.5 rounded text-sm outline-none"
                style={{ border: '1px solid #e2e0da', background: tenant.closing ? '#e8f5ee' : '#fff', color: '#1a1a18' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>{tenant.units_used.toFixed(2)}</p>
                <p className="text-xs" style={{ color: '#aaa' }}>kWh</p>
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>{tenant.charge > 0 ? `$${tenant.charge.toFixed(2)}` : '—'}</p>
                {costPerKwh > 0 && tenant.units_used > 0 && (
                  <p className="text-xs" style={{ color: '#aaa' }}>@ ${costPerKwh.toFixed(4)}/kWh</p>
                )}
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
            style={{ gridTemplateColumns: '1fr 100px 110px 110px 90px 100px 60px', borderTop: '2px solid #e8e6e0', background: '#fafaf8' }}>
            <p className="text-xs font-medium" style={{ color: '#888' }}>TOTALS</p>
            <span /><span /><span />
            <div>
              <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>{totalKwh.toFixed(2)}</p>
              <p className="text-xs" style={{ color: '#aaa' }}>kWh</p>
            </div>
            <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>${totalRevenue.toFixed(2)}</p>
            <span />
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 mt-4 px-4 py-3 rounded-lg text-sm" style={{ background: '#fff0f0', color: '#c0392b' }}>
          <AlertCircle size={15} />{error}
        </div>
      )}
      {tenants.length > 0 && verifiedCount < tenants.length && (
        <div className="flex items-center gap-2 mt-4 px-4 py-3 rounded-lg text-sm" style={{ background: '#fef3dc', color: '#7d5a00' }}>
          <AlertCircle size={15} />{tenants.length - verifiedCount} tenant{tenants.length - verifiedCount !== 1 ? 's' : ''} not yet verified.
        </div>
      )}
    </div>
  )
}