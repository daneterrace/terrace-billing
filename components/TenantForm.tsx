'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Centre, Tenant, InternetPackage } from '@/lib/types'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

interface TenantFormProps {
  centres: Centre[]
  packages: InternetPackage[]
  tenant?: Tenant
  defaultCentreId?: string
}

export default function TenantForm({ centres, packages, tenant, defaultCentreId }: TenantFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const isEdit = !!tenant

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    centre_id: tenant?.centre_id ?? defaultCentreId ?? centres[0]?.id ?? '',
    company_name: tenant?.company_name ?? '',
    contact_name: tenant?.contact_name ?? '',
    email: tenant?.email ?? '',
    phone: tenant?.phone ?? '',
    unit_number: tenant?.unit_number ?? '',
    lease_start: tenant?.lease_start ?? '',
    lease_end: tenant?.lease_end ?? '',
    status: tenant?.status ?? 'active',
    has_internet: tenant?.has_internet ?? false,
    has_gas: tenant?.has_gas ?? false,
    has_generator: tenant?.has_generator ?? false,
    has_water: tenant?.has_water ?? false,
    notes: tenant?.notes ?? '',
    // Internet package
    internet_package_id: '',
    internet_custom_price: '',
    internet_router_fee: '',
    internet_installation_fee: '',
  })

  function set(key: string, val: string | boolean) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const payload = {
        centre_id: form.centre_id,
        company_name: form.company_name,
        contact_name: form.contact_name || null,
        email: form.email || null,
        phone: form.phone || null,
        unit_number: form.unit_number || null,
        lease_start: form.lease_start || null,
        lease_end: form.lease_end || null,
        status: form.status as 'active' | 'inactive' | 'pending',
        has_internet: form.has_internet,
        has_gas: form.has_gas,
        has_generator: form.has_generator,
        has_water: form.has_water,
        notes: form.notes || null,
      }

      let tenantId = tenant?.id

      if (isEdit) {
        const { error: e } = await supabase.from('tenants').update(payload).eq('id', tenant!.id)
        if (e) throw e
      } else {
        const { data, error: e } = await supabase.from('tenants').insert(payload).select().single()
        if (e) throw e
        tenantId = data.id
      }

      // Upsert internet subscription
      if (form.has_internet && tenantId) {
        const internetPayload = {
          tenant_id: tenantId,
          package_id: form.internet_package_id || null,
          custom_sell_price: form.internet_custom_price ? parseFloat(form.internet_custom_price) : null,
          router_fee: parseFloat(form.internet_router_fee || '0'),
          installation_fee: parseFloat(form.internet_installation_fee || '0'),
        }
        await supabase
          .from('tenant_internet')
          .upsert(internetPayload, { onConflict: 'tenant_id' })
      }

      router.push(tenantId ? `/dashboard/tenants/${tenantId}` : `/dashboard/centres/${form.centre_id}`)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  const inputClass = "w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-all"
  const inputStyle = { border: '1px solid #e2e0da', background: '#fff', color: '#1a1a18' }

  return (
    <div className="p-8 max-w-2xl">
      <Link
        href={isEdit ? `/dashboard/tenants/${tenant!.id}` : '/dashboard/centres'}
        className="inline-flex items-center gap-1.5 text-sm mb-6"
        style={{ color: '#888', textDecoration: 'none' }}
      >
        <ArrowLeft size={14} />
        {isEdit ? 'Back to tenant' : 'Back to centres'}
      </Link>

      <h1 className="text-2xl font-medium mb-8" style={{ color: '#1a1a18' }}>
        {isEdit ? `Edit ${tenant!.company_name}` : 'Add new tenant'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <section className="rounded-xl p-6 space-y-4" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
          <h2 className="text-sm font-medium" style={{ color: '#888', letterSpacing: '0.05em' }}>TENANT DETAILS</h2>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#444' }}>Centre *</label>
            <select
              value={form.centre_id}
              onChange={(e) => set('centre_id', e.target.value)}
              className={inputClass}
              style={inputStyle}
              required
            >
              {centres.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#444' }}>Company name *</label>
              <input
                type="text"
                value={form.company_name}
                onChange={(e) => set('company_name', e.target.value)}
                required
                placeholder="Acme Ltd"
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#444' }}>Unit number</label>
              <input
                type="text"
                value={form.unit_number}
                onChange={(e) => set('unit_number', e.target.value)}
                placeholder="A1"
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#444' }}>Contact name</label>
              <input
                type="text"
                value={form.contact_name}
                onChange={(e) => set('contact_name', e.target.value)}
                placeholder="John Smith"
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#444' }}>Status</label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className={inputClass}
                style={inputStyle}
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#444' }}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="accounts@acme.com"
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#444' }}>Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+263 77 000 0000"
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#444' }}>Lease start</label>
              <input
                type="date"
                value={form.lease_start}
                onChange={(e) => set('lease_start', e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#444' }}>Lease end</label>
              <input
                type="date"
                value={form.lease_end}
                onChange={(e) => set('lease_end', e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#444' }}>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              placeholder="Any additional notes..."
              className={inputClass}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
        </section>

        {/* Utilities */}
        <section className="rounded-xl p-6 space-y-4" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
          <h2 className="text-sm font-medium" style={{ color: '#888', letterSpacing: '0.05em' }}>UTILITIES</h2>

          {[
            { key: 'has_internet', label: 'Internet', desc: 'Dande Mutande WiFi service' },
            { key: 'has_generator', label: 'Generator', desc: 'Metered kWh usage' },
            { key: 'has_gas', label: 'Gas', desc: '$35 connection + $15/month meter fee' },
            { key: 'has_water', label: 'Water', desc: 'Water supply' },
          ].map(({ key, label, desc }) => (
            <label key={key} className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form[key as keyof typeof form] as boolean}
                onChange={(e) => set(key, e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-green-800"
              />
              <div>
                <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>{label}</p>
                <p className="text-xs" style={{ color: '#888' }}>{desc}</p>
              </div>
            </label>
          ))}
        </section>

        {/* Internet package (shown when has_internet) */}
        {form.has_internet && (
          <section className="rounded-xl p-6 space-y-4" style={{ background: '#eaf4fd', border: '1px solid #bde0f5' }}>
            <h2 className="text-sm font-medium" style={{ color: '#1a5276', letterSpacing: '0.05em' }}>INTERNET PACKAGE</h2>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#444' }}>Package</label>
              <select
                value={form.internet_package_id}
                onChange={(e) => set('internet_package_id', e.target.value)}
                className={inputClass}
                style={inputStyle}
              >
                <option value="">Select package…</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.speed_mbps}Mbps — ${p.sell_price}/mo
                  </option>
                ))}
                <option value="custom">Custom price</option>
              </select>
            </div>

            {form.internet_package_id === 'custom' && (
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#444' }}>Custom monthly price (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.internet_custom_price}
                  onChange={(e) => set('internet_custom_price', e.target.value)}
                  placeholder="0.00"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#444' }}>Router fee (once-off)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.internet_router_fee}
                  onChange={(e) => set('internet_router_fee', e.target.value)}
                  placeholder="0.00"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#444' }}>Installation fee (once-off)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.internet_installation_fee}
                  onChange={(e) => set('internet_installation_fee', e.target.value)}
                  placeholder="0.00"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
            </div>
          </section>
        )}

        {error && (
          <p className="text-sm px-4 py-3 rounded-lg" style={{ background: '#fff0f0', color: '#c0392b', border: '1px solid #fcc' }}>
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60"
            style={{ background: 'var(--color-brand)' }}
          >
            <Save size={15} />
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add tenant'}
          </button>
          <Link
            href={isEdit ? `/dashboard/tenants/${tenant!.id}` : '/dashboard/centres'}
            className="px-5 py-2.5 rounded-lg text-sm"
            style={{ color: '#666' }}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
