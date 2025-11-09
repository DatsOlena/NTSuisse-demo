import { useEffect, useState } from 'react'
import { fetchWaterNews, type WaterNewsArticle } from '../api/news'
import Loader from './Loader'

const FALLBACK_IMAGE = 'https://www.unwater.org/sites/default/files/2022-02/UN-Water_0.png'

export default function WaterNews() {
  const [articles, setArticles] = useState<WaterNewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    fetchWaterNews()
      .then((items) => {
        if (isMounted) {
          setArticles(items)
        }
      })
      .catch((err) => {
        console.error('Failed to load water news', err)
        if (isMounted) {
          setError('Unable to load water news right now.')
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-theme-lg p-6 flex items-center justify-center">
        <Loader />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-theme-lg p-6 text-red-600">
        {error}
      </div>
    )
  }

  if (!articles.length) {
    return (
      <div className="bg-white rounded-xl shadow-theme-lg p-6 text-secondary">
        No recent water news found.
      </div>
    )
  }

  return (
    <section className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-primary mb-4">Recent Water News</h2>
      <div className="grid gap-6 md:grid-cols-2">
        {articles.map((article, index) => {
          const previewImage = article.image ?? FALLBACK_IMAGE
          return (
            <a
              key={`${article.link}-${index}`}
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white rounded-xl shadow-theme-md hover:shadow-theme-lg transition-shadow duration-200 overflow-hidden"
            >
              <div className="h-64 w-full overflow-hidden bg-slate-100">
                <img
                  src={previewImage}
                  alt={article.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(event) => {
                    const target = event.currentTarget
                    if (target.src !== FALLBACK_IMAGE) {
                      target.src = FALLBACK_IMAGE
                    }
                  }}
                />
              </div>
              <div className="p-5 space-y-2">
                <h3 className="text-lg font-semibold text-primary">
                  {article.title}
                </h3>
                <p className="text-xs text-secondary">
                  {article.date ? new Date(article.date).toLocaleString() : 'Date unavailable'} • {article.source}
                </p>
                {article.summary && (
                  <p className="text-secondary">
                    {article.summary.length > 220 ? `${article.summary.slice(0, 220)}…` : article.summary}
                  </p>
                )}
              </div>
            </a>
          )
        })}
      </div>
    </section>
  )
}
