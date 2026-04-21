import TenantForm from '@/components/TenantForm'

export default async function NewTenantPage({
  searchParams,
}: {
  searchParams: Promise<{ centre?: string }>
}) {
  const { centre } = await searchParams
  return <TenantForm defaultCentreId={centre} />
}