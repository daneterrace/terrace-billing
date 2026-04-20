export type Role = 'admin' | 'finance' | 'centre_manager'
export type TenantStatus = 'active' | 'inactive' | 'pending'
export type BillingStatus = 'draft' | 'in_review' | 'approved' | 'sent'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue'
export type UtilityType = 'internet' | 'gas' | 'generator' | 'water' | 'management'

export interface Profile {
  id: string
  full_name: string
  email: string
  role: Role
  created_at: string
  updated_at: string
}

export interface Centre {
  id: string
  name: string
  address: string | null
  city: string | null
  country: string
  is_active: boolean
  created_at: string
  updated_at: string
  // computed
  tenant_count?: number
}

export interface Tenant {
  id: string
  centre_id: string
  company_name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  unit_number: string | null
  lease_start: string | null
  lease_end: string | null
  status: TenantStatus
  has_internet: boolean
  has_gas: boolean
  has_generator: boolean
  has_water: boolean
  notes: string | null
  created_at: string
  updated_at: string
  // joined
  centre?: Centre
}

export interface InternetPackage {
  id: string
  name: string
  speed_mbps: number | null
  cost_price: number
  sell_price: number
  is_active: boolean
  created_at: string
}

export interface TenantInternet {
  id: string
  tenant_id: string
  package_id: string | null
  custom_sell_price: number | null
  router_fee: number
  installation_fee: number
  start_date: string | null
  notes: string | null
  package?: InternetPackage
}

export interface TenantGas {
  id: string
  tenant_id: string
  connection_fee: number
  meter_fee: number
  start_date: string | null
  notes: string | null
}

export interface TenantGenerator {
  id: string
  tenant_id: string
  meter_number: string | null
  start_date: string | null
  notes: string | null
}

export interface BillingPeriod {
  id: string
  centre_id: string
  period_month: number
  period_year: number
  status: BillingStatus
  created_by: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}
