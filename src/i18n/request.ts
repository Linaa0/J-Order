import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

const supported = ['en', 'rw', 'fr', 'sw'] as const
type Locale = (typeof supported)[number]

function getLocaleFromHeader(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return 'en'
  const locales = acceptLanguage
    .split(',')
    .map((lang) => lang.split(';')[0].trim().toLowerCase())
  for (const locale of locales) {
    if (locale.startsWith('en')) return 'en'
    if (locale.startsWith('fr')) return 'fr'
    if (locale.startsWith('rw')) return 'rw'
    if (locale.startsWith('sw')) return 'sw'
  }
  return 'en'
}

export default getRequestConfig(async ({ requestLocale: _requestLocale }) => {
  const cookieStore = cookies()
  
  // Priority 1: Cookie
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value
  if (cookieLocale && (supported as readonly string[]).includes(cookieLocale)) {
    return {
      locale: cookieLocale as Locale,
      messages: (await import(`../../messages/${cookieLocale}.json`)).default,
    }
  }

  // Priority 2: Browser language
  try {
    const { headers } = await import('next/headers')
    const headersList = await headers()
    const acceptLanguage = headersList.get('accept-language')
    const browserLocale = getLocaleFromHeader(acceptLanguage)
    return {
      locale: browserLocale,
      messages: (await import(`../../messages/${browserLocale}.json`)).default,
    }
  } catch {
    // Ignore errors
  }

  // Priority 3: Default to English
  return {
    locale: 'en',
    messages: (await import(`../../messages/en.json`)).default,
  }
})
