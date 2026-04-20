import { createClient } from '@/lib/supabase/server'
import TenantForm from '@/components/TenantForm'

export default async function NewTenantPage({
  searchParams,
}: {
  searchParams: Promise<{ centre?: string }>
}) {
  const { centre } = await searchParams
  const supabase = await createClient()

  const [centresRes, packagesRes] = await Promise.all([
    supabase.from('centres').select('*').eq('is_active', true).order('name'),
    supabase.from('internet_packages').select('*').eq('is_active', true).order('sell_price'),
  ])

  return (
    <TenantForm
      centres={centresRes.data ?? []}
      packages={packagesRes.data ?? []}
      defaultCentreId={centre}
    />
  )
}
