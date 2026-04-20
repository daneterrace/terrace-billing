'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import {
  LayoutDashboard,
  Building2,
  FileText,
  Zap,
  Settings,
  LogOut,
  Wifi,
  Flame,
  Users,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/centres', label: 'Centres', icon: Building2 },
  { href: '/dashboard/tenants', label: 'Tenants', icon: Users },
  { href: '/dashboard/billing', label: 'Billing', icon: FileText },
  { href: '/dashboard/internet', label: 'Internet', icon: Wifi },
  { href: '/dashboard/generator', label: 'Generator', icon: Zap },
  { href: '/dashboard/gas', label: 'Gas', icon: Flame },
]

const bottomItems = [
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

interface SidebarProps {
  profile: Profile | null
}

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <aside
      className="flex flex-col h-screen shrink-0"
      style={{
        width: 'var(--sidebar-width, 256px)',
        background: 'var(--color-brand)',
        borderRight: 'none',
      }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm shrink-0"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
          >
            T
          </div>
          <div>
            <p className="text-white font-medium text-sm leading-none">Terrace</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Utility Billing</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="text-xs font-medium px-2 mb-2" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>
          MAIN
        </p>
        <ul className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact)
            return (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-all"
                  style={{
                    background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                    color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                    fontWeight: active ? 500 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                      e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'rgba(255,255,255,0.55)'
                    }
                  }}
                >
                  <Icon size={16} strokeWidth={active ? 2 : 1.75} />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        {bottomItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-all mb-0.5"
            style={{ color: 'rgba(255,255,255,0.45)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
              e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'rgba(255,255,255,0.45)'
            }}
          >
            <Icon size={16} strokeWidth={1.75} />
            {label}
          </Link>
        ))}

        {/* Profile */}
        <div
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg mt-1"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12, marginTop: 8 }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
            style={{ background: 'var(--color-accent)', color: '#1a1a18' }}
          >
            {profile?.full_name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{profile?.full_name ?? 'User'}</p>
            <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {profile?.role === 'admin' ? 'Administrator' : profile?.role === 'finance' ? 'Finance' : 'Centre Manager'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1 rounded transition-colors"
            style={{ color: 'rgba(255,255,255,0.35)' }}
            title="Sign out"
            onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
