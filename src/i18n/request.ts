import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

const supported = ['en', 'rw', 'fr', 'sw'] as const
type Locale = (typeof supported)[number]

export default getRequestConfig(async () => {
  const cookieStore = cookies()
  const raw = cookieStore.get('NEXT_LOCALE')?.value ?? 'en'
  const locale: Locale = (supported as readonly string[]).includes(raw)
    ? (raw as Locale)
    : 'en'

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
