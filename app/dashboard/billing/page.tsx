'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, Eye, Check, AlertCircle, ChevronDown, ChevronUp, Mail, FileText } from 'lucide-react'

type Centre = {
  id: string; name: string; company_name: string | null
  company_email: string | null; company_phone: string | null
  company_address: string | null; vat_number: string | null
  bank_name: string | null; bank_account: string | null
  bank_branch: string | null; invoice_prefix: string | null
  tax_rate: number | null
}

type LineItem = {
  utility_type: string; description: string
  sell_price: number; quantity: number; is_verified: boolean
}

type TenantBill = {
  tenant_id: string; company_name: string
  email: string | null; contact_name: string | null
  line_items: LineItem[]; subtotal: number
  tax_amount: number; total: number
  status: 'pending' | 'approved' | 'sent'
  expanded: boolean
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const UTILITY_LABELS: Record<string, string> = {
  internet: 'Internet', generator: 'Generator', gas: 'Gas',
  water: 'Water', management: 'Management', rent: 'Rent', ops: 'Ops charges'
}

export default function BillingPage() {
  const [centres, setCentres] = useState<Centre[]>([])
  const [tenants, setTenants] = useState<TenantBill[]>([])
  const [centre, setCentre] = useState<Centre | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCentre, setSelectedCentre] = useState('')
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [sending, setSending] = useState<string | null>(null)
  const [sendingAll, setSendingAll] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [previewTenant, setPreviewTenant] = useState<TenantBill | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('centres')
        .select('id, name, company_name, company_email, company_phone, company_address, vat_number, bank_name, bank_account, bank_branch, invoice_prefix, tax_rate')
        .eq('is_active', true).order('name')
      setCentres(data ?? [])
      if (data?.[0]) setSelectedCentre(data[0].id)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!selectedCentre || centres.length === 0) return
    loadBilling()
  }, [selectedCentre, selectedMonth, selectedYear, centres])

  async function loadBilling() {
    setLoading(true)
    const supabase = createClient()
    const found = centres.find(c => c.id === selectedCentre) ?? null
    setCentre(found)
    const taxRate = (found?.tax_rate ?? 15) / 100

    const { data: tenantData } = await supabase
      .from('tenants')
      .select('id, company_name, email, contact_name')
      .eq('centre_id', selectedCentre)
      .eq('status', 'active')
      .order('company_name')

    const { data: period } = await supabase
      .from('billing_periods')
      .select('id')
      .eq('centre_id', selectedCentre)
      .eq('period_month', selectedMonth + 1)
      .eq('period_year', selectedYear)
      .maybeSingle()

    let lineItemMap = new Map<string, LineItem[]>()
    if (period) {
      const { data: items } = await supabase
        .from('billing_line_items')
        .select('*')
        .eq('billing_period_id', period.id)
      ;(items ?? []).forEach((item: any) => {
        const existing = lineItemMap.get(item.tenant_id) ?? []
        lineItemMap.set(item.tenant_id, [...existing, item])
      })
    }

    const bills: TenantBill[] = (tenantData ?? []).map((t: any) => {
      const items = lineItemMap.get(t.id) ?? []
      const subtotal = items.reduce((sum, i) => sum + (i.sell_price * (i.quantity || 1)), 0)
      const tax_amount = subtotal * taxRate
      return {
        tenant_id: t.id,
        company_name: t.company_name,
        email: t.email,
        contact_name: t.contact_name,
        line_items: items,
        subtotal,
        tax_amount,
        total: subtotal + tax_amount,
        status: 'pending',
        expanded: false,
      }
    })

    setTenants(bills)
    setLoading(false)
  }

  function toggleExpand(tenant_id: string) {
    setTenants(prev => prev.map(t =>
      t.tenant_id === tenant_id ? { ...t, expanded: !t.expanded } : t
    ))
  }

  function approveTenant(tenant_id: string) {
    setTenants(prev => prev.map(t =>
      t.tenant_id === tenant_id ? { ...t, status: 'approved' } : t
    ))
  }

  function approveAll() {
    setTenants(prev => prev.map(t => ({ ...t, status: 'approved' })))
  }

  async function sendInvoice(tenant: TenantBill) {
    if (!tenant.email) {
      setError(`${tenant.company_name} has no email address. Add one in tenant settings.`)
      return
    }
    setSending(tenant.tenant_id)
    setError(null)
    try {
      const res = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant, centre, month: selectedMonth, year: selectedYear }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send')
      setTenants(prev => prev.map(t =>
        t.tenant_id === tenant.tenant_id ? { ...t, status: 'sent' } : t
      ))
      setSuccessMsg(`Invoice sent to ${tenant.company_name}`)
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err: any) {
      setError(err.message)
    }
    setSending(null)
  }

  async function sendAll() {
    const approved = tenants.filter(t => t.status === 'approved' && t.email)
    if (approved.length === 0) {
      setError('No approved tenants with email addresses.')
      return
    }
    setSendingAll(true)
    setError(null)
    let sent = 0
    let failed: string[] = []
    for (const tenant of approved) {
      try {
        const res = await fetch('/api/send-invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenant, centre, month: selectedMonth, year: selectedYear }),
        })
        if (res.ok) {
          setTenants(prev => prev.map(t =>
            t.tenant_id === tenant.tenant_id ? { ...t, status: 'sent' } : t
          ))
          sent++
        } else {
          failed.push(tenant.company_name)
        }
      } catch {
        failed.push(tenant.company_name)
      }
    }
    setSendingAll(false)
    if (failed.length > 0) {
      setError(`Sent ${sent} invoices. Failed: ${failed.join(', ')}`)
    } else {
      setSuccessMsg(`Successfully sent ${sent} invoices!`)
      setTimeout(() => setSuccessMsg(null), 5000)
    }
  }

  const approvedCount = tenants.filter(t => t.status === 'approved').length
  const sentCount = tenants.filter(t => t.status === 'sent').length
  const totalRevenue = tenants.reduce((sum, t) => sum + t.total, 0)
  const noEmailCount = tenants.filter(t => !t.email).length

  const statusStyle = (status: string) => {
    if (status === 'sent') return { background: '#e8f5ee', color: '#1a472a' }
    if (status === 'approved') return { background: '#eaf4fd', color: '#1a5276' }
    return { background: '#f5f5f5', color: '#888' }
  }

  if (loading) return <div className="p-8"><p style={{ color: '#888' }}>Loading...</p></div>

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-medium" style={{ color: '#1a1a18' }}>Billing</h1>
          <p className="text-sm mt-1" style={{ color: '#888' }}>Combined invoices — rent + ops + utilities</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={approveAll}
            className="px-4 py-2.5 rounded-lg text-sm transition-all"
            style={{ border: '1px solid #e2e0da', background: '#fff', color: '#444' }}>
            Approve all
          </button>
          <button onClick={sendAll} disabled={sendingAll || approvedCount === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ background: 'var(--color-brand)' }}>
            <Send size={14} />
            {sendingAll ? 'Sending...' : `Send batch (${approvedCount})`}
          </button>
        </div>
      </div>

      {/* Selectors */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
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

      {/* Warnings */}
      {!centre?.company_name && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-lg text-sm"
          style={{ background: '#fff0f0', color: '#c0392b', border: '1px solid #fcc' }}>
          <AlertCircle size={15} />
          Billing details not set up for this centre. Go to Settings → Billing details first.
        </div>
      )}
      {noEmailCount > 0 && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-lg text-sm"
          style={{ background: '#fef3dc', color: '#7d5a00' }}>
          <AlertCircle size={15} />
          {noEmailCount} tenant{noEmailCount !== 1 ? 's' : ''} missing email — invoices cannot be sent to them.
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-lg text-sm"
          style={{ background: '#fff0f0', color: '#c0392b', border: '1px solid #fcc' }}>
          <AlertCircle size={15} />{error}
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-lg text-sm"
          style={{ background: '#e8f5ee', color: '#1a472a' }}>
          <Check size={15} />{successMsg}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total tenants', value: tenants.length },
          { label: 'Approved', value: approvedCount },
          { label: 'Sent', value: sentCount },
          { label: 'Total invoiced', value: `$${totalRevenue.toFixed(2)}` },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
            <p className="text-xs" style={{ color: '#888' }}>{s.label}</p>
            <p className="text-xl font-semibold mt-1" style={{ color: '#1a1a18' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tenant list */}
      <div className="space-y-2">
        {tenants.length === 0 ? (
          <div className="rounded-xl p-12 text-center" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
            <FileText size={24} style={{ color: '#ccc', margin: '0 auto 12px' }} />
            <p className="text-sm font-medium" style={{ color: '#888' }}>No tenants found.</p>
            <p className="text-xs mt-1" style={{ color: '#aaa' }}>
              Complete billing runs in Rent, Ops, Internet and Generator first.
            </p>
          </div>
        ) : tenants.map(tenant => (
          <div key={tenant.tenant_id} className="rounded-xl overflow-hidden"
            style={{ border: '1px solid #ece9e3', background: '#fff' }}>
            {/* Tenant row */}
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-4 flex-1">
                <button onClick={() => toggleExpand(tenant.tenant_id)}
                  className="p-1 rounded" style={{ color: '#888' }}>
                  {tenant.expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>{tenant.company_name}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={statusStyle(tenant.status)}>
                      {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                    </span>
                    {!tenant.email && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#fff0f0', color: '#c0392b' }}>
                        No email
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: '#aaa' }}>
                    {tenant.line_items.length} line item{tenant.line_items.length !== 1 ? 's' : ''}
                    {tenant.email ? ` · ${tenant.email}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-semibold" style={{ color: '#1a1a18' }}>${tenant.total.toFixed(2)}</p>
                  <p className="text-xs" style={{ color: '#aaa' }}>incl. tax</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button onClick={() => setPreviewTenant(tenant)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                    style={{ border: '1px solid #e2e0da', background: '#fff', color: '#444' }}>
                    <Eye size={12} /> Preview
                  </button>

                  {tenant.status === 'pending' && (
                    <button onClick={() => approveTenant(tenant.tenant_id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ background: '#eaf4fd', color: '#1a5276' }}>
                      <Check size={12} /> Approve
                    </button>
                  )}

                  {tenant.status === 'approved' && (
                    <button onClick={() => sendInvoice(tenant)}
                      disabled={sending === tenant.tenant_id || !tenant.email}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50 transition-all"
                      style={{ background: 'var(--color-brand)' }}>
                      <Mail size={12} />
                      {sending === tenant.tenant_id ? 'Sending...' : 'Send'}
                    </button>
                  )}

                  {tenant.status === 'sent' && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: '#e8f5ee', color: '#1a472a' }}>
                      <Check size={12} /> Sent
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Expanded line items */}
            {tenant.expanded && (
              <div className="border-t px-5 py-4" style={{ borderColor: '#f0ede7', background: '#fafaf8' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e8e6e0' }}>
                      <th className="text-left pb-2 text-xs font-medium" style={{ color: '#888' }}>Description</th>
                      <th className="text-left pb-2 text-xs font-medium" style={{ color: '#888' }}>Type</th>
                      <th className="text-right pb-2 text-xs font-medium" style={{ color: '#888' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenant.line_items.map((item, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f0ede7' }}>
                        <td className="py-2" style={{ color: '#1a1a18' }}>{item.description}</td>
                        <td className="py-2">
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#f0ede7', color: '#555' }}>
                            {UTILITY_LABELS[item.utility_type] ?? item.utility_type}
                          </span>
                        </td>
                        <td className="py-2 text-right font-medium" style={{ color: '#1a1a18' }}>
                          ${(item.sell_price * (item.quantity || 1)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '1px solid #e8e6e0' }}>
                      <td colSpan={2} className="pt-2 text-xs" style={{ color: '#888' }}>Subtotal</td>
                      <td className="pt-2 text-right text-sm" style={{ color: '#1a1a18' }}>${tenant.subtotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td colSpan={2} className="text-xs" style={{ color: '#888' }}>
                        Tax ({centre?.tax_rate ?? 15}%)
                      </td>
                      <td className="text-right text-sm" style={{ color: '#1a1a18' }}>${tenant.tax_amount.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td colSpan={2} className="pt-1 text-sm font-semibold" style={{ color: '#1a1a18' }}>Total</td>
                      <td className="pt-1 text-right text-sm font-semibold" style={{ color: '#1a1a18' }}>${tenant.total.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Invoice Preview Modal */}
      {previewTenant && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setPreviewTenant(null)}
        >
          <div
            className="w-full max-w-2xl max-h-screen overflow-y-auto rounded-2xl"
            style={{ background: '#fff' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Invoice preview */}
            <div className="p-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-8">
                <div>
                  <p className="text-xl font-semibold" style={{ color: '#1a1a18' }}>
                    {centre?.company_name ?? 'Terrace'}
                  </p>
                  <p className="text-sm mt-1" style={{ color: '#888' }}>{centre?.company_address}</p>
                  <p className="text-sm" style={{ color: '#888' }}>{centre?.company_email}</p>
                  <p className="text-sm" style={{ color: '#888' }}>{centre?.company_phone}</p>
                  {centre?.vat_number && (
                    <p className="text-sm" style={{ color: '#888' }}>VAT: {centre.vat_number}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold" style={{ color: 'var(--color-brand)' }}>INVOICE</p>
                  <p className="text-sm mt-1" style={{ color: '#888' }}>
                    {centre?.invoice_prefix ?? 'INV'}-{selectedYear}-XXX
                  </p>
                  <p className="text-sm" style={{ color: '#888' }}>
                    {MONTHS[selectedMonth]} {selectedYear}
                  </p>
                </div>
              </div>

              {/* Bill to */}
              <div className="mb-6 p-4 rounded-xl" style={{ background: '#f7f6f3' }}>
                <p className="text-xs font-medium mb-1" style={{ color: '#888' }}>BILL TO</p>
                <p className="font-medium" style={{ color: '#1a1a18' }}>{previewTenant.company_name}</p>
                {previewTenant.contact_name && (
                  <p className="text-sm" style={{ color: '#888' }}>Attn: {previewTenant.contact_name}</p>
                )}
                {previewTenant.email && (
                  <p className="text-sm" style={{ color: '#888' }}>{previewTenant.email}</p>
                )}
              </div>

              {/* Line items */}
              <table className="w-full mb-6">
                <thead>
                  <tr style={{ borderBottom: '2px solid #1a1a18' }}>
                    <th className="text-left pb-2 text-xs font-medium" style={{ color: '#888' }}>Description</th>
                    <th className="text-right pb-2 text-xs font-medium" style={{ color: '#888' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {previewTenant.line_items.map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f0ede7' }}>
                      <td className="py-2.5">
                        <p className="text-sm" style={{ color: '#1a1a18' }}>{item.description}</p>
                        <p className="text-xs" style={{ color: '#888' }}>
                          {UTILITY_LABELS[item.utility_type] ?? item.utility_type}
                        </p>
                      </td>
                      <td className="py-2.5 text-right text-sm font-medium" style={{ color: '#1a1a18' }}>
                        ${(item.sell_price * (item.quantity || 1)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '1px solid #e8e6e0' }}>
                    <td className="pt-3 text-sm" style={{ color: '#888' }}>Subtotal</td>
                    <td className="pt-3 text-right text-sm" style={{ color: '#1a1a18' }}>
                      ${previewTenant.subtotal.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-sm" style={{ color: '#888' }}>
                      VAT ({centre?.tax_rate ?? 15}%)
                    </td>
                    <td className="text-right text-sm" style={{ color: '#1a1a18' }}>
                      ${previewTenant.tax_amount.toFixed(2)}
                    </td>
                  </tr>
                  <tr style={{ borderTop: '2px solid #1a1a18' }}>
                    <td className="pt-2 font-semibold" style={{ color: '#1a1a18' }}>TOTAL DUE</td>
                    <td className="pt-2 text-right font-bold text-lg" style={{ color: 'var(--color-brand)' }}>
                      ${previewTenant.total.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Bank details */}
              {centre?.bank_name && (
                <div className="p-4 rounded-xl mb-6" style={{ background: '#f7f6f3' }}>
                  <p className="text-xs font-medium mb-2" style={{ color: '#888' }}>PAYMENT DETAILS</p>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs" style={{ color: '#aaa' }}>Bank</p>
                      <p style={{ color: '#1a1a18' }}>{centre.bank_name}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: '#aaa' }}>Account</p>
                      <p style={{ color: '#1a1a18' }}>{centre.bank_account}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: '#aaa' }}>Branch</p>
                      <p style={{ color: '#1a1a18' }}>{centre.bank_branch}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4" style={{ borderTop: '1px solid #f0ede7' }}>
                {previewTenant.status === 'pending' && (
                  <button
                    onClick={() => { approveTenant(previewTenant.tenant_id); setPreviewTenant(null) }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                    style={{ background: '#eaf4fd', color: '#1a5276' }}>
                    <Check size={14} /> Approve
                  </button>
                )}
                {previewTenant.status === 'approved' && (
                  <button
                    onClick={() => { sendInvoice(previewTenant); setPreviewTenant(null) }}
                    disabled={!previewTenant.email}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                    style={{ background: 'var(--color-brand)' }}>
                    <Mail size={14} /> Send invoice
                  </button>
                )}
                <button onClick={() => setPreviewTenant(null)}
                  className="px-4 py-2 rounded-lg text-sm" style={{ color: '#666' }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}