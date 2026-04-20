import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Skip static pre-rendering for auth-gated pages
  // Vercel will render these dynamically at request time
  experimental: {},
}

export default nextConfig
