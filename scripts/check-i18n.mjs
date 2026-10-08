import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const messagesDir = join(__dirname, '..', 'messages')

function flattenKeys(obj, prefix = '') {
  const keys = []
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, full))
    } else {
      keys.push(full)
    }
  }
  return keys
}

const locales = ['en', 'rw', 'fr', 'sw']
const parsed = {}
for (const locale of locales) {
  parsed[locale] = JSON.parse(readFileSync(join(messagesDir, `${locale}.json`), 'utf8'))
}

const enKeys = new Set(flattenKeys(parsed.en))
let failed = false

for (const locale of locales.filter(l => l !== 'en')) {
  const localeKeys = new Set(flattenKeys(parsed[locale]))
  for (const key of enKeys) {
    if (!localeKeys.has(key)) {
      console.error(`[i18n] MISSING in ${locale}: ${key}`)
      failed = true
    }
  }
  for (const key of localeKeys) {
    if (!enKeys.has(key)) {
      console.error(`[i18n] EXTRA in ${locale} (not in en): ${key}`)
      failed = true
    }
  }
}

if (failed) {
  console.error('\n[i18n] Check failed. Fix missing or extra keys above.')
  process.exit(1)
} else {
  console.log(`[i18n] All ${locales.length} locales are in sync. ${enKeys.size} keys checked.`)
}
