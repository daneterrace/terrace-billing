'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import TenantForm from '@/components/TenantForm'

export default function EditTenantPage() {
  const params = useParams()
  const id = params.id as string
  const [tenant, setTenant] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.from('tenants').select('*').eq('id', id).single()
      setTenant(data)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div className="p-8"><p style={{ color: '#888' }}>Loading...</p></div>
  if (!tenant) return <div className="p-8"><p style={{ color: '#888' }}>Tenant not found.</p></div>

  return <TenantForm tenant={tenant} />
}