export default function BillingPage() {
  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-medium mb-2" style={{ color: '#1a1a18' }}>Billing</h1>
      <p className="text-sm mb-8" style={{ color: '#888' }}>Combined invoices — rent + ops + utilities</p>
      <div className="rounded-xl p-12 text-center" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
        <p className="text-sm font-medium mb-2" style={{ color: '#1a1a18' }}>Coming next</p>
        <p className="text-sm" style={{ color: '#888' }}>
          First complete your billing runs in Rent, Ops charges, Internet and Generator — then come back here to generate and send combined invoices.
        </p>
      </div>
    </div>
  )
}