import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import TenantForm from '@/components/TenantForm'

export default async function EditTenantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [tenantRes, centresRes, packagesRes] = await Promise.all([
    supabase.from('tenants').select('*').eq('id', id).single(),
    supabase.from('centres').select('*').eq('is_active', true).order('name'),
    supabase.from('internet_packages').select('*').eq('is_active', true).order('sell_price'),
  ])

  if (tenantRes.error || !tenantRes.data) notFound()

  return (
    <TenantForm
      tenant={tenantRes.data}
      centres={centresRes.data ?? []}
      packages={packagesRes.data ?? []}
    />
  )
}
