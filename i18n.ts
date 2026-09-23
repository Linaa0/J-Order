import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

const supported = ['en', 'rw', 'fr', 'sw']

export default getRequestConfig(async () => {
  const cookieStore = cookies()
  const raw = cookieStore.get('NEXT_LOCALE')?.value ?? 'en'
  const locale = supported.includes(raw) ? raw : 'en'

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  }
})
