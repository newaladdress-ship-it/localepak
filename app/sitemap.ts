import { MetadataRoute } from 'next'
import { CATEGORIES, CITIES, TOP_CITIES } from '@/lib/data'
import { BLOG_POSTS } from '@/lib/blog-data'
import { SEED_BUSINESSES } from '@/lib/seed-businesses'

const BASE = 'https://www.localepak.com'

function canonicalUrl(path: string): string {
  if (path === '' || path === '/') return `${BASE}/`
  return `${BASE}${path.startsWith('/') ? path : `/${path}`}/`
}

function citySlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-')
}

export default function sitemap(): MetadataRoute.Sitemap {
  // Indexable core + policy pages only. /search is noindex, and
  // /login, /register, /dashboard are auth/utility pages — none belong here.
  const corePages = [
    '',
    '/about',
    '/contact',
    '/categories',
    '/cities',
    '/businesses',
    '/companies',
    '/professionals',
    '/jobs',
    '/blog',
    '/faqs',
    '/help-center',
    '/support',
    '/careers',
    '/advertise-with-us',
    '/html-sitemap',
  ]

  const policyPages = [
    '/privacy',
    '/terms',
    '/cookie-policy',
    '/disclaimer',
    '/refund-policy',
    '/editorial-policy',
    '/community-guidelines',
    '/business-listing-guidelines',
    '/verification-policy',
    '/accessibility',
    '/report-abuse',
  ]

  // No lastModified on static routes: stamping every URL with "today"
  // is a false freshness signal, so the field is omitted entirely.
  const coreRoutes = [...corePages, ...policyPages].map((path) => ({
    url: canonicalUrl(path),
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1.0 : 0.6,
  }))

  const categoryRoutes = CATEGORIES.map((cat) => ({
    url: canonicalUrl(`/category/${cat.id}`),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  const cityRoutes = CITIES.map((city) => ({
    url: canonicalUrl(`/city/${citySlug(city)}`),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  const cityCategoryRoutes = TOP_CITIES.flatMap((city) =>
    CATEGORIES.map((cat) => ({
      url: canonicalUrl(`/city/${citySlug(city)}/${cat.id}`),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  )

  const blogRoutes = Object.values(BLOG_POSTS).map((post) => {
    const realDate = post.dateModified || post.date
    const parsed = realDate ? new Date(realDate) : null
    return {
      url: canonicalUrl(`/blog/${post.slug}`),
      ...(parsed && !Number.isNaN(parsed.getTime()) ? { lastModified: parsed } : {}),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }
  })

  // Static seed business listings (lib/seed-businesses.ts) — fully
  // static pages, always indexable. Owner-added Firestore listings are
  // not listed here (they are discovered via /businesses and search).
  const seedBusinessRoutes = SEED_BUSINESSES.map((biz) => ({
    url: canonicalUrl(`/business/${biz.slug}`),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [...coreRoutes, ...categoryRoutes, ...cityRoutes, ...cityCategoryRoutes, ...blogRoutes, ...seedBusinessRoutes]
}
