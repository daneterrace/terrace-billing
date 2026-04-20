export default function BillingPage() {
  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-medium mb-2" style={{ color: '#1a1a18' }}>Billing</h1>
      <p className="text-sm mb-8" style={{ color: '#888' }}>Monthly billing runs across all centres</p>
      <div
        className="rounded-xl p-12 text-center"
        style={{ background: '#fff', border: '1px solid #ece9e3' }}
      >
        <p className="text-sm font-medium mb-2" style={{ color: '#1a1a18' }}>Coming in Phase 2</p>
        <p className="text-sm" style={{ color: '#888' }}>
          Once centres and tenants are set up, billing runs will appear here. You&apos;ll be able to input monthly figures, verify them, and send invoices.
        </p>
      </div>
    </div>
  )
}
