export default function Dashboard() {
  const analyticsCards = [
    {
      title: 'Water Quality Index',
      value: '7.8',
      change: '+0.3 vs last week',
    },
    {
      title: 'Samples Collected',
      value: '124',
      change: '+18 new samples',
    },
    {
      title: 'Alerts Triggered',
      value: '2',
      change: 'Both resolved',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-6">
        <header className="mb-12">
          <h1 className="text-3xl font-bold text-primary mb-2">Analytics Dashboard</h1>
          <p className="text-secondary">
            Monitor water quality metrics, sampling activities, and alerts in real time. Detailed
            charts and insights will appear here as data sources are connected.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          {analyticsCards.map((card) => (
            <div key={card.title} className="bg-white rounded-xl shadow-theme-md p-6">
              <h2 className="text-sm uppercase text-secondary tracking-wide mb-2">{card.title}</h2>
              <p className="text-3xl font-semibold text-primary mb-1">{card.value}</p>
              <p className="text-xs text-secondary">{card.change}</p>
            </div>
          ))}
        </section>

        <section className="mt-12">
          <div className="bg-white rounded-xl shadow-theme-lg p-8 text-center">
            <h3 className="text-xl font-semibold text-primary mb-3">Detailed Analytics Coming Soon</h3>
            <p className="text-secondary max-w-2xl mx-auto">
              The analytics dashboard will provide trend charts, anomaly detection, geospatial
              visualizations, and customizable reports for water quality analysis. Connect your data
              sources to unlock these insights.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
