export default function GeneratorPage() {
  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-medium mb-2" style={{ color: '#1a1a18' }}>Generator</h1>
      <p className="text-sm mb-8" style={{ color: '#888' }}>kWh meter readings and cost sharing</p>
      <div className="rounded-xl p-12 text-center" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
        <p className="text-sm font-medium mb-2" style={{ color: '#1a1a18' }}>Coming in Phase 2</p>
        <p className="text-sm" style={{ color: '#888' }}>Enter monthly fuel and opex costs, input tenant meter readings, and the system calculates each share automatically.</p>
      </div>
    </div>
  )
}
