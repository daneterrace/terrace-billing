import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Wifi, Zap, Flame, Pencil } from 'lucide-react'
import TenantStatusBadge from '@/components/TenantStatusBadge'
import TenantContracts from '@/components/TenantContracts'

export default async function TenantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [tenantRes, internetRes] = await Promise.all([
    supabase.from('tenants').select('*, centre:centres(id, name, city)').eq('id', id).single(),
    supabase
      .from('tenant_internet')
      .select('*, package:internet_packages(*)')
      .eq('tenant_id', id)
      .maybeSingle(),
  ])

  if (tenantRes.error || !tenantRes.data) notFound()
  const tenant = tenantRes.data
  const internet = internetRes.data

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  const effectiveInternetPrice = internet?.custom_sell_price ?? internet?.package?.sell_price ?? null

  return (
    <div className="p-8 max-w-4xl">
      {/* Back */}
      <Link
        href={`/dashboard/centres/${tenant.centre_id}`}
        className="inline-flex items-center gap-1.5 text-sm mb-6"
        style={{ color: '#888', textDecoration: 'none' }}
      >
        <ArrowLeft size={14} />
        {(tenant.centre as { name: string } | null)?.name ?? 'Back'}
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-semibold shrink-0"
            style={{ background: 'var(--color-brand-muted)', color: 'var(--color-brand)' }}
          >
            {tenant.company_name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-medium" style={{ color: '#1a1a18' }}>{tenant.company_name}</h1>
              <TenantStatusBadge status={tenant.status} />
            </div>
            <p className="text-sm mt-0.5" style={{ color: '#888' }}>
              Unit {tenant.unit_number ?? '—'} · {(tenant.centre as { name: string } | null)?.name}
            </p>
          </div>
        </div>
        <Link
          href={`/dashboard/tenants/${id}/edit`}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
          style={{ background: '#fff', border: '1px solid #ece9e3', color: '#444' }}
        >
          <Pencil size={13} />
          Edit tenant
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Left col: contact + lease + contracts */}
        <div className="col-span-1 space-y-4">
          <div className="rounded-xl p-5" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
            <p className="text-xs font-medium mb-3" style={{ color: '#888', letterSpacing: '0.05em' }}>CONTACT</p>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                  <Mail size={13} style={{ color: '#aaa' }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: '#aaa' }}>Email</p>
                  <p className="text-sm" style={{ color: '#1a1a18' }}>{tenant.email ?? '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                  <Phone size={13} style={{ color: '#aaa' }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: '#aaa' }}>Phone</p>
                  <p className="text-sm" style={{ color: '#1a1a18' }}>{tenant.phone ?? '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin size={13} style={{ color: '#aaa' }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: '#aaa' }}>Contact name</p>
                  <p className="text-sm" style={{ color: '#1a1a18' }}>{tenant.contact_name ?? '—'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl p-5" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
            <p className="text-xs font-medium mb-3" style={{ color: '#888', letterSpacing: '0.05em' }}>LEASE</p>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <Calendar size={13} style={{ color: '#aaa', marginTop: 2 }} />
                <div>
                  <p className="text-xs" style={{ color: '#aaa' }}>Start</p>
                  <p className="text-sm" style={{ color: '#1a1a18' }}>{formatDate(tenant.lease_start)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Calendar size={13} style={{ color: '#aaa', marginTop: 2 }} />
                <div>
                  <p className="text-xs" style={{ color: '#aaa' }}>End</p>
                  <p className="text-sm" style={{ color: '#1a1a18' }}>{formatDate(tenant.lease_end)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contracts — client component handles upload/download/delete */}
          <TenantContracts tenantId={id} />
        </div>

        {/* Right col: utilities */}
        <div className="col-span-2 space-y-4">
          <h2 className="text-base font-medium" style={{ color: '#1a1a18' }}>Utilities</h2>

          {/* Internet */}
          <div
            className="rounded-xl p-5"
            style={{
              background: '#fff',
              border: `1px solid ${tenant.has_internet ? '#bde0f5' : '#ece9e3'}`,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: tenant.has_internet ? '#eaf4fd' : '#f5f5f5' }}
                >
                  <Wifi size={15} style={{ color: tenant.has_internet ? '#2980b9' : '#ccc' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>Internet</p>
                  <p className="text-xs" style={{ color: '#888' }}>Dande Mutande</p>
                </div>
              </div>
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full"
                style={
                  tenant.has_internet
                    ? { background: '#eaf4fd', color: '#1a5276' }
                    : { background: '#f5f5f5', color: '#aaa' }
                }
              >
                {tenant.has_internet ? 'Subscribed' : 'Not subscribed'}
              </span>
            </div>
            {tenant.has_internet && internet ? (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Package', value: internet.package?.name ?? 'Custom' },
                  { label: 'Speed', value: internet.package?.speed_mbps ? `${internet.package.speed_mbps} Mbps` : '—' },
                  { label: 'Monthly charge', value: effectiveInternetPrice ? `$${effectiveInternetPrice.toFixed(2)}` : '—' },
                  { label: 'Cost price', value: internet.package?.cost_price ? `$${internet.package.cost_price.toFixed(2)}` : '—' },
                  { label: 'Margin', value: effectiveInternetPrice && internet.package?.cost_price
                    ? `$${(effectiveInternetPrice - internet.package.cost_price).toFixed(2)}`
                    : '—' },
                  { label: 'Router fee', value: internet.router_fee ? `$${internet.router_fee.toFixed(2)}` : '—' },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg p-3" style={{ background: '#f7f6f3' }}>
                    <p className="text-xs" style={{ color: '#888' }}>{item.label}</p>
                    <p className="text-sm font-medium mt-0.5" style={{ color: '#1a1a18' }}>{item.value}</p>
                  </div>
                ))}
              </div>
            ) : tenant.has_internet ? (
              <p className="text-xs" style={{ color: '#aaa' }}>No package assigned yet. <Link href={`/dashboard/tenants/${id}/edit`} style={{ color: 'var(--color-brand-light)' }}>Set up now →</Link></p>
            ) : null}
          </div>

          {/* Generator */}
          <div
            className="rounded-xl p-5"
            style={{
              background: '#fff',
              border: `1px solid ${tenant.has_generator ? '#fde8b0' : '#ece9e3'}`,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: tenant.has_generator ? '#fef3dc' : '#f5f5f5' }}
                >
                  <Zap size={15} style={{ color: tenant.has_generator ? '#f39c12' : '#ccc' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>Generator</p>
                  <p className="text-xs" style={{ color: '#888' }}>Metered per kWh</p>
                </div>
              </div>
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full"
                style={
                  tenant.has_generator
                    ? { background: '#fef3dc', color: '#7d5a00' }
                    : { background: '#f5f5f5', color: '#aaa' }
                }
              >
                {tenant.has_generator ? 'Subscribed' : 'Not subscribed'}
              </span>
            </div>
          </div>

          {/* Gas */}
          <div
            className="rounded-xl p-5"
            style={{
              background: '#fff',
              border: `1px solid ${tenant.has_gas ? '#fac9c9' : '#ece9e3'}`,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: tenant.has_gas ? '#fef0f0' : '#f5f5f5' }}
                >
                  <Flame size={15} style={{ color: tenant.has_gas ? '#e74c3c' : '#ccc' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>Gas</p>
                  <p className="text-xs" style={{ color: '#888' }}>$35 connection + $15/month meter fee</p>
                </div>
              </div>
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full"
                style={
                  tenant.has_gas
                    ? { background: '#fef0f0', color: '#922b21' }
                    : { background: '#f5f5f5', color: '#aaa' }
                }
              >
                {tenant.has_gas ? 'Subscribed' : 'Not subscribed'}
              </span>
            </div>
          </div>

          {/* Notes */}
          {tenant.notes && (
            <div className="rounded-xl p-5" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
              <p className="text-xs font-medium mb-2" style={{ color: '#888', letterSpacing: '0.05em' }}>NOTES</p>
              <p className="text-sm" style={{ color: '#444', lineHeight: 1.6 }}>{tenant.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}