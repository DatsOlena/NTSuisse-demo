// RSS-driven news aggregation router. Serves /api/news with cached headlines.
import { Router } from 'express'
import RSSParser from 'rss-parser'

// Parser configured with friendly UA for providers that reject generic fetchers.
const rssParser = new RSSParser({
  headers: {
    'User-Agent': 'WaterLab Demo RSS/1.0 (+https://localhost)',
  },
})

// Upstream feeds the demo currently trusts. Easy to extend if new feeds are needed.
const NEWS_SOURCES = [
  {
    url: 'https://www.unwater.org/rss.xml',
    source: 'UN Water',
  },
]

const NEWS_CACHE_TTL = 10 * 60 * 1000 // 10 minutes

// Simple in-memory cache so the backend does not hammer RSS providers.
let newsCache = {
  items: [],
  fetchedAt: 0,
}

// ----------------------------- Helper functions -----------------------------

// Normalises media URLs (RSS thumbnail, <img> tags, etc.) so the frontend always
// receives a fully-qualified URL, even when the feed uses relative paths.
function extractImageFromItem(item) {
  const articleLink = item.link ?? ''
  const baseUrl = (() => {
    try {
      return articleLink ? new URL(articleLink).origin : null
    } catch (err) {
      return null
    }
  })()

  function normalise(urlValue) {
    if (!urlValue || typeof urlValue !== 'string') {
      return null
    }
    const trimmed = urlValue.trim()
    if (!trimmed) {
      return null
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed
    }
    if (baseUrl) {
      try {
        return new URL(trimmed, baseUrl).toString()
      } catch (err) {
        return null
      }
    }
    return null
  }

  function fromHtml(html) {
    if (!html || typeof html !== 'string') {
      return null
    }
    const match = html.match(/<img[^>]+src\s*=\s*["']([^"'>]+)["']/i)
    if (match && match[1]) {
      return normalise(match[1])
    }
    return null
  }

  const enclosure = item.enclosure
  if (enclosure) {
    if (Array.isArray(enclosure)) {
      const match = enclosure.find((entry) => entry?.url)
      const url = match?.url
      const normalised = normalise(url)
      if (normalised) return normalised
    } else if (typeof enclosure === 'object' && enclosure.url) {
      const normalised = normalise(enclosure.url)
      if (normalised) return normalised
    }
  }

  const mediaContent = item['media:content']
  if (mediaContent) {
    if (Array.isArray(mediaContent)) {
      const match = mediaContent.find((entry) => entry?.url || entry?.['$']?.url)
      const candidate = match?.url ?? match?.['$']?.url
      const normalised = normalise(candidate)
      if (normalised) return normalised
    } else if (mediaContent?.url) {
      const normalised = normalise(mediaContent.url)
      if (normalised) return normalised
    } else if (mediaContent?.['$']?.url) {
      const normalised = normalise(mediaContent['$'].url)
      if (normalised) return normalised
    }
  }

  const mediaThumbnail = item['media:thumbnail']
  if (mediaThumbnail) {
    if (Array.isArray(mediaThumbnail)) {
      const match = mediaThumbnail.find((entry) => entry?.url || entry?.['$']?.url)
      const candidate = match?.url ?? match?.['$']?.url
      const normalised = normalise(candidate)
      if (normalised) return normalised
    } else if (mediaThumbnail?.url) {
      const normalised = normalise(mediaThumbnail.url)
      if (normalised) return normalised
    } else if (mediaThumbnail?.['$']?.url) {
      const normalised = normalise(mediaThumbnail['$'].url)
      if (normalised) return normalised
    }
  }

  if (item.image) {
    const candidate = Array.isArray(item.image) ? item.image[0] : item.image
    const normalised = normalise(candidate)
    if (normalised) return normalised
  }

  const htmlFields = [item['content:encoded'], item.content, item.summary, item.contentSnippet]
  for (const html of htmlFields) {
    const normalised = fromHtml(html)
    if (normalised) {
      return normalised
    }
  }

  return null
}

// Fetches all configured feeds, merges them, and caches the result.
async function fetchLatestNews() {
  const now = Date.now()
  if (newsCache.items.length && now - newsCache.fetchedAt < NEWS_CACHE_TTL) {
    return newsCache.items
  }

  const results = await Promise.allSettled(
    NEWS_SOURCES.map(async (source) => {
      const feed = await rssParser.parseURL(source.url)
      return feed.items.map((item) => ({
        title: item.title ?? 'Untitled article',
        link: item.link ?? source.url,
        date: item.isoDate ?? item.pubDate ?? null,
        summary: item.contentSnippet ?? item.content ?? '',
        source: source.source,
        image: extractImageFromItem(item),
      }))
    }),
  )

  const articles = results
    .flatMap((result, index) => {
      const sourceMeta = NEWS_SOURCES[index]
      if (result.status === 'fulfilled') {
        console.log(`Fetched ${result.value.length} items from ${sourceMeta?.source ?? 'unknown source'}`)
        return result.value
      }
      console.warn(`News source failed (${sourceMeta?.source ?? 'unknown'}):`, result.reason?.message ?? result.reason)
      return []
    })
    .sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0
      const timeB = b.date ? new Date(b.date).getTime() : 0
      return timeB - timeA
    })
    .filter((article, index, arr) => arr.findIndex((item) => item.link === article.link) === index)
    .slice(0, 8)

  if (!articles.length) {
    console.warn('No news articles available from configured sources.')
  }

  newsCache = { items: articles, fetchedAt: now }
  return newsCache.items
}

// ------------------------------- Router setup -------------------------------

export default function createNewsRouter() {
  const router = Router()

  router.get('/', async (req, res) => {
    try {
      const articles = await fetchLatestNews()
      res.json(articles)
    } catch (err) {
      console.error('Failed to fetch news feed:', err)
      res.status(500).json({ error: 'Unable to fetch water news' })
    }
  })

  return router
}
