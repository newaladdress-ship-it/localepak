// ============================================================
// LocalePak — SERVER-SIDE public listings (ANTI-SCRAPE, Round 3)
// ------------------------------------------------------------
// SERVER ONLY — import this module from server components
// (app router pages), never from a 'use client' file. It reads
// Firestore with the Web SDK from the server, so public listing
// pages render their data into the initial HTML and the browser
// never issues a Firestore list query — the exposure the owner
// flagged ("any visitor can download the full dataset") shrinks
// to what is actually rendered on the page, and pages get real
// LCP content instead of a post-fetch grid.
//
// Every function is fail-soft: if Firestore is unreachable or
// the read is denied, it returns empty results and the static
// seed listings still render — exactly the graceful fallback
// the old client-side fetch had.
// ============================================================

import { db, isDummyFirebase } from '@/lib/firebase'
import { collection, query, where, limit, getDocs } from 'firebase/firestore'
import { SEED_BUSINESSES } from '@/lib/seed-businesses'
import { isReleased } from '@/lib/release'
import { applyPendingEdit } from '@/lib/edit-requests'

export type PublicBusinessCard = {
  id: string
  name: string
  slug: string
  category: string
  city: string
  phone: string
  description: string
}

/** Static seed listings as listing cards (build-time data, zero reads). */
export const SEED_CARDS: PublicBusinessCard[] = SEED_BUSINESSES.map((seed) => ({
  id: `seed-${seed.slug}`,
  name: seed.name,
  slug: seed.slug,
  category: seed.category,
  city: seed.city,
  phone: seed.phone || '',
  description: seed.description,
}))

/** Deep-convert Firestore Timestamps to epoch millis so results are plain serializable data. */
function serializeValue(value: any): any {
  if (value === null || value === undefined) return value ?? null
  if (typeof value?.toMillis === 'function') {
    try {
      return value.toMillis()
    } catch {
      return null
    }
  }
  if (Array.isArray(value)) return value.map(serializeValue)
  if (typeof value === 'object') {
    if (value instanceof Date) return value.getTime()
    const out: Record<string, any> = {}
    for (const [k, v] of Object.entries(value)) out[k] = serializeValue(v)
    return out
  }
  return value
}

export type ListingDoc = { id: string; data: any }

/** All approved business documents (serialized). Release-cycle filtering stays with the caller. */
export async function fetchApprovedBusinesses(): Promise<ListingDoc[]> {
  // Dummy-config short-circuit (lib/firebase.ts): never let the SDK
  // retry against a project that cannot answer during static gen.
  if (isDummyFirebase) return []
  try {
    const snap = await getDocs(query(collection(db, 'businesses'), where('status', '==', 'approved')))
    const rows: ListingDoc[] = []
    snap.forEach((d) => rows.push({ id: d.id, data: serializeValue(d.data()) }))
    return rows
  } catch {
    return []
  }
}

/** All approved company documents (serialized). */
export async function fetchApprovedCompanies(): Promise<ListingDoc[]> {
  if (isDummyFirebase) return []
  try {
    const snap = await getDocs(query(collection(db, 'companies'), where('status', '==', 'approved')))
    const rows: ListingDoc[] = []
    snap.forEach((d) => rows.push({ id: d.id, data: serializeValue(d.data()) }))
    return rows
  } catch {
    return []
  }
}

/** All approved job documents (serialized). Jobs have no release cycle — approved is public. */
export async function fetchApprovedJobs(): Promise<ListingDoc[]> {
  if (isDummyFirebase) return []
  try {
    const snap = await getDocs(query(collection(db, 'jobs'), where('status', '==', 'approved')))
    const rows: ListingDoc[] = []
    snap.forEach((d) => rows.push({ id: d.id, data: serializeValue(d.data()) }))
    return rows
  } catch {
    return []
  }
}

/** One job document by slug (public single-document read), or null. */
export async function fetchJobBySlug(slug: string): Promise<ListingDoc | null> {
  if (isDummyFirebase) return null
  try {
    const snap = await getDocs(query(collection(db, 'jobs'), where('slug', '==', slug), where('status', '==', 'approved'), limit(1)))
    if (snap.empty) return null
    const d = snap.docs[0]
    return { id: d.id, data: serializeValue(d.data()) }
  } catch {
    return null
  }
}

export type PublicJobCard = {
  id: string
  title: string
  slug: string
  companyName: string
  city: string
  jobType: string
  salaryRange: string
  description: string
}
export async function getApprovedJobCards(): Promise<PublicJobCard[]> {
  const rows = await fetchApprovedJobs()
  return rows.map((row) => {
    const d = row.data || {}
    return {
      id: row.id,
      title: d.title || '',
      slug: d.slug || '',
      companyName: d.companyName || '',
      city: d.city || '',
      jobType: d.jobType || '',
      salaryRange: d.salaryRange || '',
      description: d.description || '',
    }
  })
}

/** One business document by slug (public single-document read), or null. */
export async function fetchBusinessBySlug(slug: string): Promise<ListingDoc | null> {
  if (isDummyFirebase) return null
  try {
    const snap = await getDocs(query(collection(db, 'businesses'), where('slug', '==', slug), where('status', '==', 'approved'), limit(1)))
    if (snap.empty) return null
    const d = snap.docs[0]
    return { id: d.id, data: serializeValue(d.data()) }
  } catch {
    return null
  }
}

/** One company document by slug (public single-document read), or null. */
export async function fetchCompanyBySlug(slug: string): Promise<ListingDoc | null> {
  if (isDummyFirebase) return null
  try {
    const snap = await getDocs(query(collection(db, 'companies'), where('slug', '==', slug), where('status', '==', 'approved'), limit(1)))
    if (snap.empty) return null
    const d = snap.docs[0]
    return { id: d.id, data: serializeValue(d.data()) }
  } catch {
    return null
  }
}

export type PublicCompanyCard = {
  id: string
  name: string
  slug: string
  industry: string
  city: string
  phone: string
  description: string
}

/** Map a company document to the public listing-card shape (same mapping the old client page used). */
export function toCompanyCard(doc: ListingDoc): PublicCompanyCard {
  // Approved edits past their 7-day boundary show on cards too, not
  // just on the detail page (lib/edit-requests.ts).
  const data = applyPendingEdit(doc.data, Date.now())
  return {
    id: doc.id,
    name: data.name || 'Unnamed Company',
    slug: data.slug || doc.id,
    industry: data.industry || data.category || 'General',
    city: data.city || '',
    phone: data.phone || '',
    description: data.description || '',
  }
}

/**
 * All approved companies as cards (the /companies grid). Companies have
 * NO weekly release cycle — approved is public immediately, exactly the
 * posture the old client-side page and the search index already used —
 * so no isReleased filter is applied here.
 */
export async function getApprovedCompanyCards(): Promise<PublicCompanyCard[]> {
  const rows = await fetchApprovedCompanies()
  return rows.map(toCompanyCard)
}

/** One professional document by slug (public single-document read), or null. */
export async function fetchProfessionalBySlug(slug: string): Promise<ListingDoc | null> {
  if (isDummyFirebase) return null
  try {
    const snap = await getDocs(query(collection(db, 'professionals'), where('slug', '==', slug), where('status', '==', 'approved'), limit(1)))
    if (snap.empty) return null
    const d = snap.docs[0]
    return { id: d.id, data: serializeValue(d.data()) }
  } catch {
    return null
  }
}

export type PublicProfessionalCard = {
  id: string
  name: string
  slug: string
  profession: string
  specialization: string
  city: string
  phone: string
  whatsapp: string
  experience: string
  description: string
}

/** Map a professional document to the public listing-card shape. */
export function toProfessionalCard(doc: ListingDoc): PublicProfessionalCard {
  // Approved edits past their 7-day boundary show on cards too.
  const data = applyPendingEdit(doc.data, Date.now())
  return {
    id: doc.id,
    name: data.name || 'Unnamed Professional',
    slug: data.slug || doc.id,
    profession: data.profession || 'General',
    specialization: data.specialization || '',
    city: data.city || '',
    phone: data.phone || '',
    whatsapp: data.whatsapp || '',
    experience: data.experience || '',
    description: data.description || '',
  }
}

/** All approved professional documents, mapped to public cards. */
export async function getApprovedProfessionalCards(): Promise<PublicProfessionalCard[]> {
  if (isDummyFirebase) return []
  try {
    const snap = await getDocs(query(collection(db, 'professionals'), where('status', '==', 'approved')))
    const rows: ListingDoc[] = []
    snap.forEach((d) => rows.push({ id: d.id, data: serializeValue(d.data()) }))
    return rows.map(toProfessionalCard)
  } catch {
    return []
  }
}

export type UserBlogPost = {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  authorName: string
  listingName: string
  createdAt: number | null
}

/** One approved user-submitted blog post by slug (public read), or null. */
export async function fetchUserBlogPostBySlug(slug: string): Promise<UserBlogPost | null> {
  if (isDummyFirebase) return null
  try {
    const snap = await getDocs(
      query(collection(db, 'blog_posts'), where('slug', '==', slug), where('status', '==', 'approved'), limit(1))
    )
    if (snap.empty) return null
    const d = snap.docs[0]
    const data = serializeValue(d.data())
    return {
      id: d.id,
      title: data.title || 'Untitled post',
      slug: data.slug || d.id,
      excerpt: data.excerpt || '',
      content: data.content || '',
      authorName: data.authorName || '',
      listingName: data.listingName || '',
      createdAt: typeof data.createdAt === 'number' ? data.createdAt : null,
    }
  } catch {
    return null
  }
}

/** All approved user-submitted blog posts, newest first. */
export async function getApprovedUserBlogPosts(): Promise<UserBlogPost[]> {
  if (isDummyFirebase) return []
  try {
    const snap = await getDocs(query(collection(db, 'blog_posts'), where('status', '==', 'approved')))
    const rows: UserBlogPost[] = []
    snap.forEach((d) => {
      const data = serializeValue(d.data())
      rows.push({
        id: d.id,
        title: data.title || 'Untitled post',
        slug: data.slug || d.id,
        excerpt: data.excerpt || '',
        content: data.content || '',
        authorName: data.authorName || '',
        listingName: data.listingName || '',
        createdAt: typeof data.createdAt === 'number' ? data.createdAt : null,
      })
    })
    rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    return rows
  } catch {
    return []
  }
}

/** Map a business document to the public listing-card shape. */
export function toBusinessCard(doc: ListingDoc): PublicBusinessCard {
  // Approved edits past their 7-day boundary show on cards too.
  const data = applyPendingEdit(doc.data, Date.now())
  return {
    id: doc.id,
    name: data.name || 'Unnamed Business',
    slug: data.slug || doc.id,
    category: data.category || 'General',
    city: data.city || '',
    phone: data.phone || '',
    description: data.description || '',
  }
}

/**
 * The directory merge rule (unchanged from the old client code): seed
 * listings keep their slots; a Firestore listing wins a slug clash by
 * replacing the seed IN PLACE (keeping the seed's element id so the card
 * updates in position); genuinely new listings append after the seeds.
 * Nothing is ever moved or prepended — that was a layout-shift (CLS) bug.
 */
export function mergeSeedAndFirestore(
  seeds: PublicBusinessCard[],
  items: PublicBusinessCard[]
): PublicBusinessCard[] {
  const seedIndexBySlug = new Map(seeds.map((s, i) => [s.slug, i] as const))
  const merged = [...seeds]
  const replacedSlugs = new Set<string>()
  const extras: PublicBusinessCard[] = []
  for (const item of items) {
    const idx = seedIndexBySlug.get(item.slug)
    if (idx !== undefined && !replacedSlugs.has(item.slug)) {
      merged[idx] = { ...item, id: seeds[idx].id }
      replacedSlugs.add(item.slug)
    } else {
      extras.push(item)
    }
  }
  return [...merged, ...extras]
}

/** Approved + released businesses as cards, merged over the full seed set (the /businesses grid). */
export async function getMergedBusinessCards(): Promise<PublicBusinessCard[]> {
  const rows = await fetchApprovedBusinesses()
  const now = Date.now()
  const cards = rows
    // Weekly batch release (lib/release.ts): approved businesses go
    // public at the next 7-day cycle boundary, not immediately.
    .filter((r) => isReleased(r.data.approvedAt, now))
    .map(toBusinessCard)
  return mergeSeedAndFirestore(SEED_CARDS, cards)
}

function slugify(value: string): string {
  return (value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Approved + released businesses for one city x category page, merged
 * over that page's seed listings. City/category matching is identical
 * to the old client code: business documents store DISPLAY names for
 * city + category; category ids are accepted too.
 */
export async function getCityCategoryCards(args: {
  city: string
  citySlug: string
  categoryId: string
  categoryName: string
}): Promise<PublicBusinessCard[]> {
  const { city, citySlug, categoryId, categoryName } = args
  const seeds = SEED_BUSINESSES.filter(
    (s) => s.citySlug === citySlug && s.categorySlug === categoryId
  ).map((s) => ({
    id: `seed-${s.slug}`,
    name: s.name,
    slug: s.slug,
    category: s.category,
    city: s.city,
    phone: s.phone || '',
    description: s.description,
  }))

  const rows = await fetchApprovedBusinesses()
  const now = Date.now()
  const cards: PublicBusinessCard[] = []
  for (const r of rows) {
    const data = r.data
    if (!isReleased(data.approvedAt, now)) continue
    const docCity = data.city || ''
    const docCategory = data.category || data.mainCategory || ''
    const cityMatches = slugify(docCity) === citySlug || docCity === city
    const categoryMatches =
      docCategory === categoryName ||
      docCategory === categoryId ||
      slugify(docCategory) === slugify(categoryName)
    if (!cityMatches || !categoryMatches) continue
    cards.push({
      id: r.id,
      name: data.name || 'Unnamed Business',
      slug: data.slug || r.id,
      category: docCategory || categoryName,
      city: docCity,
      phone: data.phone || '',
      description: data.description || '',
    })
  }
  return mergeSeedAndFirestore(seeds, cards)
}

/**
 * Approved + released businesses for one city, merged over that city's
 * seed listings. City matching is identical to getCityCategoryCards:
 * business documents store DISPLAY names for city, so a document
 * matches when its slugified city equals the city slug or its display
 * name equals the city name. The card mapping is exactly the
 * /businesses mapping (toBusinessCard), so city grids show the same
 * labels as /businesses. Used by the city template for its listing
 * grid and for the data-driven noindex decision (zero merged cards =
 * noindex until a real listing appears).
 */
export async function getCityCards(
  city: string,
  citySlug: string
): Promise<PublicBusinessCard[]> {
  const seeds = SEED_BUSINESSES.filter((s) => s.citySlug === citySlug).map((s) => ({
    id: `seed-${s.slug}`,
    name: s.name,
    slug: s.slug,
    category: s.category,
    city: s.city,
    phone: s.phone || '',
    description: s.description,
  }))

  const rows = await fetchApprovedBusinesses()
  const now = Date.now()
  const cards: PublicBusinessCard[] = []
  for (const r of rows) {
    const data = r.data
    if (!isReleased(data.approvedAt, now)) continue
    const docCity = data.city || ''
    if (slugify(docCity) !== citySlug && docCity !== city) continue
    cards.push(toBusinessCard(r))
  }
  return mergeSeedAndFirestore(seeds, cards)
}

/**
 * Approved + released businesses for one category, merged over that
 * category's seed listings. Category matching is identical to
 * getCityCategoryCards: a document matches by category id, display
 * name, or slugified display name. The card mapping is exactly the
 * /businesses mapping (toBusinessCard). Used by the category template
 * for its listing grid and per-city counts.
 */
export async function getCategoryCards(
  categoryId: string,
  categoryName: string
): Promise<PublicBusinessCard[]> {
  const seeds = SEED_BUSINESSES.filter((s) => s.categorySlug === categoryId).map((s) => ({
    id: `seed-${s.slug}`,
    name: s.name,
    slug: s.slug,
    category: s.category,
    city: s.city,
    phone: s.phone || '',
    description: s.description,
  }))

  const rows = await fetchApprovedBusinesses()
  const now = Date.now()
  const cards: PublicBusinessCard[] = []
  for (const r of rows) {
    const data = r.data
    if (!isReleased(data.approvedAt, now)) continue
    const docCategory = data.category || data.mainCategory || ''
    const categoryMatches =
      docCategory === categoryName ||
      docCategory === categoryId ||
      slugify(docCategory) === slugify(categoryName)
    if (!categoryMatches) continue
    cards.push(toBusinessCard(r))
  }
  return mergeSeedAndFirestore(seeds, cards)
}
