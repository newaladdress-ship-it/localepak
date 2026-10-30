import type { Metadata } from 'next'
import Script from 'next/script'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import ClientProviders from '@/components/client-providers'
import ProtectionGuard from '@/components/protection-guard'
import { founderPersonSchema, organizationSchema } from '@/lib/organization-schema'

// Google Analytics measurement ID, owner-supplied 2026-10-25. Defined
// once and referenced by both the loader URL and the gtag config call, so
// the tag exists in exactly one place (one Google tag per page).
const GA_MEASUREMENT_ID = 'G-77B4J5JX5F'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-plus-jakarta',
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: "Pakistan Business Directory – Find & List Businesses Free | LocalePak",
  description: "LocalePak is Pakistan's free business directory. Find local businesses by city & category — or add your business listing free and get a public profile page that search engines can read.",
  metadataBase: new URL('https://www.localepak.com'),
  keywords: [
    'business directory Pakistan',
    'businesses in Pakistan',
    'list business free',
    'companies in Pakistan',
    'local services Pakistan',
    'free business listing Pakistan',
    'LocalePak'
  ],
  icons: {
    icon: [{ url: '/favicon.png', sizes: 'any' }],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: "Pakistan Business Directory – Find & List Businesses Free | LocalePak",
    description: "LocalePak is Pakistan's free business directory. Find local businesses by city & category — or add your business listing free and get a public profile page that search engines can read.",
    url: 'https://www.localepak.com/',
    siteName: 'LocalePak',
    locale: 'en_PK',
    type: 'website',
    images: ['https://www.localepak.com/logo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Pakistan Business Directory – Find & List Businesses Free | LocalePak",
    description: "LocalePak is Pakistan's free business directory. Find local businesses by city & category — or add your business listing free and get a public profile page that search engines can read.",
    images: ['https://www.localepak.com/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: 'DD7RD57EpgiMi0ae0M6aae43iW9lzFTUZdVWRWyqeaM',
    other: {
      'msvalidate.01': '207473D434A6B2FA4E2217EFA3CB53DB',
    },
  },
}

export const viewport = { width: 'device-width', initialScale: 1 }

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'LocalePak',
    url: 'https://www.localepak.com/',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://www.localepak.com/search?q={search_term_string}',
      'query-input': 'required name=search_term_string'
    }
  }

  // Canonical Organization + founder Person nodes live in
  // lib/organization-schema.ts so every page references one entity.

  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <head>
        {/* Google tag (gtag.js) — owner-supplied; first in <head> on every page via the root layout. */}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', '${GA_MEASUREMENT_ID}');`,
          }}
        />
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        <link rel="help" href="/llms.txt" type="text/plain" title="LLM Context" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify([organizationSchema, founderPersonSchema, websiteSchema]) }}
        />
      </head>
      <body className="font-sans antialiased bg-[#FAFAFA] text-[#09090B] pb-16 md:pb-0 min-h-screen selection:bg-emerald-600 selection:text-white">
        {children}
        <ProtectionGuard />
        <ClientProviders />
        <Script id="ms-clarity" strategy="lazyOnload">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","z22cr0frhy");`}
        </Script>
      </body>
    </html>
  )
}
