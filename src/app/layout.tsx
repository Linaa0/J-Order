import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { SessionProvider } from '@/components/providers/SessionProvider'
import { Toaster } from 'sonner'
import { OfflineIndicator } from '@/components/orders/OfflineIndicator'
import './globals.css'

export const metadata: Metadata = {
  title: 'J Order | Gas Engineering and Services',
  description: 'Order and track gas cylinders and refills from GES in Kigali, Rwanda',
  manifest: '/manifest.json',
  applicationName: 'J Order',
  keywords: ['gas', 'LPG', 'cylinder', 'kigali', 'rwanda', 'delivery'],
  authors: [{ name: 'Gas Engineering and Services Ltd' }],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'J Order',
  },
  formatDetection: { telephone: false },
  openGraph: {
    title: 'J Order',
    description: 'Gas delivered to your door',
    siteName: 'J Order',
    locale: 'en_RW',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#ffa000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body className="font-body bg-gray-50 text-navy-900 antialiased">
        <SessionProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <OfflineIndicator />
            {children}
            <Toaster
              position="top-center"
              toastOptions={{
                classNames: {
                  toast: 'rounded-xl font-body shadow-navy',
                  success: 'bg-green-50 text-green-900 border border-green-200',
                  error: 'bg-red-50 text-red-900 border border-red-200',
                },
              }}
            />
          </NextIntlClientProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
