-- ============================================================
-- TERRACE UTILITY BILLING DASHBOARD — DATABASE SCHEMA
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  email text not null,
  role text not null default 'centre_manager' check (role in ('admin', 'centre_manager', 'finance')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- CENTRES
-- ============================================================
create table public.centres (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  address text,
  city text,
  country text default 'Zimbabwe',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- CENTRE MANAGERS (which managers can see which centres)
-- ============================================================
create table public.centre_managers (
  id uuid default uuid_generate_v4() primary key,
  profile_id uuid references public.profiles(id) on delete cascade not null,
  centre_id uuid references public.centres(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(profile_id, centre_id)
);

-- ============================================================
-- TENANTS
-- ============================================================
create table public.tenants (
  id uuid default uuid_generate_v4() primary key,
  centre_id uuid references public.centres(id) on delete cascade not null,
  company_name text not null,
  contact_name text,
  email text,
  phone text,
  unit_number text,
  lease_start date,
  lease_end date,
  status text not null default 'active' check (status in ('active', 'inactive', 'pending')),
  -- Utility subscriptions
  has_internet boolean default false,
  has_gas boolean default false,
  has_generator boolean default false,
  has_water boolean default false,
  -- Notes
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- INTERNET PACKAGES
-- ============================================================
create table public.internet_packages (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  speed_mbps integer,
  cost_price numeric(10,2) not null,
  sell_price numeric(10,2) not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ============================================================
-- TENANT INTERNET SUBSCRIPTIONS
-- ============================================================
create table public.tenant_internet (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references public.tenants(id) on delete cascade not null unique,
  package_id uuid references public.internet_packages(id),
  custom_sell_price numeric(10,2), -- override if custom deal
  router_fee numeric(10,2) default 0,
  installation_fee numeric(10,2) default 0,
  start_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- TENANT GAS SUBSCRIPTIONS
-- ============================================================
create table public.tenant_gas (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references public.tenants(id) on delete cascade not null unique,
  connection_fee numeric(10,2) default 35.00,
  meter_fee numeric(10,2) default 15.00,
  start_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- TENANT GENERATOR SUBSCRIPTIONS
-- ============================================================
create table public.tenant_generator (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references public.tenants(id) on delete cascade not null unique,
  meter_number text,
  start_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- BILLING PERIODS
-- ============================================================
create table public.billing_periods (
  id uuid default uuid_generate_v4() primary key,
  centre_id uuid references public.centres(id) on delete cascade not null,
  period_month integer not null check (period_month between 1 and 12),
  period_year integer not null,
  status text not null default 'draft' check (status in ('draft', 'in_review', 'approved', 'sent')),
  created_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(centre_id, period_month, period_year)
);

-- ============================================================
-- BILLING LINE ITEMS
-- ============================================================
create table public.billing_line_items (
  id uuid default uuid_generate_v4() primary key,
  billing_period_id uuid references public.billing_periods(id) on delete cascade not null,
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  utility_type text not null check (utility_type in ('internet', 'gas', 'generator', 'water', 'management')),
  description text,
  -- Cost/revenue
  cost_price numeric(10,2) default 0,
  sell_price numeric(10,2) not null,
  quantity numeric(10,4) default 1,
  -- For generator: kWh reading data
  meter_reading_open numeric(10,4),
  meter_reading_close numeric(10,4),
  units_used numeric(10,4),
  rate_per_unit numeric(10,4),
  -- Status
  is_verified boolean default false,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- GENERATOR MONTHLY DATA (centre-level costs for cost sharing)
-- ============================================================
create table public.generator_monthly (
  id uuid default uuid_generate_v4() primary key,
  centre_id uuid references public.centres(id) on delete cascade not null,
  period_month integer not null,
  period_year integer not null,
  fuel_cost numeric(10,2) default 0,
  opex_cost numeric(10,2) default 0,
  total_kwh_generated numeric(10,4) default 0,
  cost_per_kwh numeric(10,4),
  notes text,
  created_at timestamptz default now(),
  unique(centre_id, period_month, period_year)
);

-- ============================================================
-- GAS MONTHLY DATA (from gas company PDF)
-- ============================================================
create table public.gas_monthly (
  id uuid default uuid_generate_v4() primary key,
  centre_id uuid references public.centres(id) on delete cascade not null,
  period_month integer not null,
  period_year integer not null,
  total_revenue numeric(10,2) default 0,
  gas_company_costs numeric(10,2) default 0,
  gross_profit numeric(10,2) default 0,
  our_share_pct numeric(5,2) default 50.00,
  our_share_amount numeric(10,2) default 0,
  notes text,
  created_at timestamptz default now(),
  unique(centre_id, period_month, period_year)
);

-- ============================================================
-- INVOICES
-- ============================================================
create table public.invoices (
  id uuid default uuid_generate_v4() primary key,
  billing_period_id uuid references public.billing_periods(id) on delete cascade not null,
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  invoice_number text unique,
  subtotal numeric(10,2) not null default 0,
  tax_rate numeric(5,2) default 0,
  tax_amount numeric(10,2) default 0,
  total numeric(10,2) not null default 0,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue')),
  sent_at timestamptz,
  paid_at timestamptz,
  pdf_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at before update on public.profiles for each row execute function update_updated_at();
create trigger update_centres_updated_at before update on public.centres for each row execute function update_updated_at();
create trigger update_tenants_updated_at before update on public.tenants for each row execute function update_updated_at();
create trigger update_billing_periods_updated_at before update on public.billing_periods for each row execute function update_updated_at();
create trigger update_billing_line_items_updated_at before update on public.billing_line_items for each row execute function update_updated_at();
create trigger update_invoices_updated_at before update on public.invoices for each row execute function update_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'centre_manager')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.centres enable row level security;
alter table public.centre_managers enable row level security;
alter table public.tenants enable row level security;
alter table public.tenant_internet enable row level security;
alter table public.tenant_gas enable row level security;
alter table public.tenant_generator enable row level security;
alter table public.billing_periods enable row level security;
alter table public.billing_line_items enable row level security;
alter table public.generator_monthly enable row level security;
alter table public.gas_monthly enable row level security;
alter table public.invoices enable row level security;
alter table public.internet_packages enable row level security;

-- Profiles: users see own profile, admins see all
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Admins can view all profiles" on public.profiles for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Centres: admins/finance see all, managers see assigned
create policy "Admins and finance see all centres" on public.centres for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'finance'))
);
create policy "Managers see assigned centres" on public.centres for select using (
  exists (select 1 from public.centre_managers where profile_id = auth.uid() and centre_id = centres.id)
);
create policy "Admins can manage centres" on public.centres for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Tenants: same pattern as centres
create policy "Admins and finance see all tenants" on public.tenants for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'finance'))
);
create policy "Managers see tenants in assigned centres" on public.tenants for select using (
  exists (select 1 from public.centre_managers where profile_id = auth.uid() and centre_id = tenants.centre_id)
);
create policy "Admins and finance manage tenants" on public.tenants for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'finance'))
);

-- Internet packages: everyone can read
create policy "Everyone can read packages" on public.internet_packages for select using (auth.uid() is not null);
create policy "Admins manage packages" on public.internet_packages for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Centre managers table
create policy "Admins manage centre_managers" on public.centre_managers for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Users see own assignments" on public.centre_managers for select using (profile_id = auth.uid());

-- ============================================================
-- SEED DATA — Internet packages
-- ============================================================
insert into public.internet_packages (name, speed_mbps, cost_price, sell_price) values
  ('Basic',    10,  65.00, 100.00),
  ('Standard', 25,  95.00, 150.00),
  ('Premium',  50, 140.00, 200.00);

-- ============================================================
-- SEED DATA — 8 Centres (update names to match your actual centres)
-- ============================================================
insert into public.centres (name, address, city) values
  ('Terrace Centre 1', '1 Main Street',      'Harare'),
  ('Terrace Centre 2', '2 Enterprise Road',  'Harare'),
  ('Terrace Centre 3', '3 Borrowdale Road',  'Harare'),
  ('Terrace Centre 4', '4 Samora Machel',    'Harare'),
  ('Terrace Centre 5', '5 Chiremba Road',    'Bulawayo'),
  ('Terrace Centre 6', '6 Jason Moyo Ave',   'Bulawayo'),
  ('Terrace Centre 7', '7 Robert Mugabe Rd', 'Mutare'),
  ('Terrace Centre 8', '8 Herbert Chitepo',  'Gweru');
