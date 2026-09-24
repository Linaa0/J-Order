'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { FlameIcon } from '@/components/icons/ProductIcons'

const languages = [
  { code: 'en', label: 'English',    flag: '🇬🇧', sub: 'English'    },
  { code: 'rw', label: 'Kinyarwanda', flag: '🇷🇼', sub: 'Kinyarwanda' },
  { code: 'fr', label: 'Français',   flag: '🇫🇷', sub: 'French'     },
  { code: 'sw', label: 'Kiswahili',  flag: '🇰🇪', sub: 'Swahili'    },
]

function getRedirectPath(role: string | undefined) {
  if (role === 'ADMIN') return '/admin/dashboard'
  if (role === 'ORDER_STAFF' || role === 'TECHNICIAN') return '/staff/dashboard'
  return '/orders'
}

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [showSplash, setShowSplash]         = useState(true)
  const [showLanguage, setShowLanguage]     = useState(false)
  const [langChosen, setLangChosen]         = useState(false)
  const [selectedLang, setSelectedLang]     = useState<string | null>(null)

  // Step 1: after 2 s dismiss splash, decide whether to show language picker
  useEffect(() => {
    const t = setTimeout(() => {
      setShowSplash(false)
      const saved = localStorage.getItem('jorder_lang')
      if (!saved) {
        setShowLanguage(true)
      } else {
        setLangChosen(true)   // already picked before, go straight to redirect
      }
    }, 2000)
    return () => clearTimeout(t)
  }, [])

  // Step 2: redirect once session is resolved AND language is chosen
  useEffect(() => {
    if (!langChosen) return
    if (status === 'loading') return   // wait — don't redirect yet

    if (session?.user) {
      router.replace(getRedirectPath(session.user.role))
    } else {
      router.replace('/login')
    }
  }, [langChosen, status, session, router])

  function selectLanguage(code: string) {
    localStorage.setItem('jorder_lang', code)
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000`
    setSelectedLang(code)
    setShowLanguage(false)
    setLangChosen(true)   // triggers the effect above
  }

  return (
    <div className="min-h-screen bg-navy-gradient flex items-center justify-center relative overflow-hidden">
      {/* Decorative background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width:  `${80 + i * 40}px`,
              height: `${80 + i * 40}px`,
              background: 'linear-gradient(135deg, #ffa000, #ea580c)',
              left: `${10 + i * 15}%`,
              top:  `${20 + (i % 3) * 25}%`,
            }}
            animate={{ y: [0, -20, 0], scale: [1, 1.05, 1], opacity: [0.04, 0.12, 0.04] }}
            transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.5, ease: 'easeInOut' }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── Splash ── */}
        {showSplash && (
          <motion.div
            key="splash"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4 }}
            className="text-center text-white z-10 px-8"
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              className="mb-8 flex justify-center"
            >
              <FlameIcon size={80} />
            </motion.div>
            <h1 className="font-display text-5xl font-bold mb-3">J Order</h1>
            <p className="text-navy-300 text-lg">Gas Engineering and Services Ltd</p>
            <p className="text-navy-400 text-sm mt-1">Gasabo, Kigali, Rwanda</p>
            <div className="mt-8 flex justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-ember-600"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.25 }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Language picker ── */}
        {showLanguage && !showSplash && (
          <motion.div
            key="language"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="text-center text-white z-10 px-6 w-full max-w-sm"
          >
            <FlameIcon size={48} className="mx-auto mb-6" />
            <h2 className="font-display text-3xl font-bold mb-2">Welcome to J Order</h2>
            <p className="text-navy-300 mb-8">Choose your language to get started</p>
            <div className="grid grid-cols-2 gap-3">
              {languages.map((lang) => (
                <motion.button
                  key={lang.code}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => selectLanguage(lang.code)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    selectedLang === lang.code
                      ? 'border-ember-600 bg-ember-600/20'
                      : 'border-navy-700 bg-navy-800/50 hover:border-ember-700/50'
                  }`}
                >
                  <span className="text-3xl">{lang.flag}</span>
                  <span className="font-semibold text-sm">{lang.label}</span>
                  <span className="text-xs text-navy-300">{lang.sub}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Waiting for session after language is chosen ── */}
        {langChosen && !showSplash && !showLanguage && status === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-white z-10"
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex justify-center mb-4"
            >
              <FlameIcon size={56} />
            </motion.div>
            <p className="text-navy-300 text-sm">Loading...</p>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
