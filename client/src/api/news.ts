export interface WaterNewsArticle {
  title: string
  link: string
  date: string | null
  summary: string
  source: string
  image?: string | null
}

export async function fetchWaterNews(): Promise<WaterNewsArticle[]> {
  const response = await fetch('/api/news')
  if (!response.ok) {
    throw new Error('Failed to load water news')
  }
  return response.json()
}
