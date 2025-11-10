import { useEffect, useState } from 'react'
import { fetchWaterNews, type WaterNewsArticle } from '../api/news'
import Loader from './Shared/Loader'

const FALLBACK_IMAGE = '/public/logo/FallbackNews.png'

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
    <>
      <hr className="my-4" />
    <section className="max-w-6xl mx-auto">
  
      <h2 className="text-2xl font-bold color-primary mb-4">Recent Water News</h2>
      <div className="rounded-xl hidden md:block">
      <img src="/public/logo/UNWater.png" alt="UN Water Logo" className="rounded-xl w-full h-44 object-cover" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {articles.map((article, index) => {
          const previewImage = article.image ?? FALLBACK_IMAGE
          return (
            <a
              key={`${article.link}-${index}`}
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-primary rounded-xl shadow-theme-md hover:shadow-theme-lg transition-shadow duration-200 overflow-hidden"
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
    <hr className="my-4 w-full" />
    </>
  )
}
