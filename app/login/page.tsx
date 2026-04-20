'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#f7f6f3' }}>
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ background: 'var(--color-brand)' }}
      >
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-semibold text-sm"
              style={{ background: 'rgba(255,255,255,0.15)' }}
            >
              T
            </div>
            <span className="text-white font-medium text-lg tracking-tight">Terrace</span>
          </div>
          <h1 className="text-4xl font-light text-white leading-snug mb-4">
            Utility billing,<br />
            <span style={{ color: 'var(--color-accent)' }}>simplified.</span>
          </h1>
          <p className="text-base" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Manage gas, internet, and generator billing across all your business centres from one place.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Centres', value: '8' },
            { label: 'Utilities', value: '3' },
            { label: 'Auto invoicing', value: 'Yes' },
          ].map((s) => (
            <div key={s.label} style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 16 }}>
              <p className="text-2xl font-medium text-white">{s.value}</p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-semibold text-sm"
              style={{ background: 'var(--color-brand)' }}
            >
              T
            </div>
            <span className="font-medium text-lg" style={{ color: 'var(--color-brand)' }}>Terrace</span>
          </div>

          <h2 className="text-2xl font-medium mb-1" style={{ color: '#1a1a18' }}>Welcome back</h2>
          <p className="text-sm mb-8" style={{ color: '#888' }}>Sign in to your account</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#444' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@terrace.co.zw"
                className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-all"
                style={{
                  border: '1px solid #e2e0da',
                  background: '#fff',
                  color: '#1a1a18',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--color-brand-light)')}
                onBlur={(e) => (e.target.style.borderColor = '#e2e0da')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#444' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-all"
                style={{
                  border: '1px solid #e2e0da',
                  background: '#fff',
                  color: '#1a1a18',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--color-brand-light)')}
                onBlur={(e) => (e.target.style.borderColor = '#e2e0da')}
              />
            </div>

            {error && (
              <p
                className="text-sm px-3.5 py-2.5 rounded-lg"
                style={{ background: '#fff0f0', color: '#c0392b', border: '1px solid #fcc' }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-60"
              style={{ background: loading ? '#888' : 'var(--color-brand)' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-xs text-center mt-8" style={{ color: '#aaa' }}>
            Terrace Utility Billing System · Admin access only
          </p>
        </div>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
