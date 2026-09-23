/**
 * Generates PWA icons at all required sizes using Sharp.
 * Run once: node scripts/generate-icons.mjs
 */
import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outputDir = join(__dirname, '..', 'public', 'icons')
mkdirSync(outputDir, { recursive: true })

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

// SVG icon: navy background with flame
function svgForSize(size) {
  const pad = Math.round(size * 0.15)
  const inner = size - pad * 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="#060d40"/>
  <defs>
    <linearGradient id="fl" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#ffa000"/>
      <stop offset="60%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#ea580c"/>
    </linearGradient>
  </defs>
  <path transform="translate(${pad}, ${pad}) scale(${inner / 48})"
    d="M24 4 C20 12 14 16 16 26 C18 32 24 36 24 36 C24 36 30 32 32 26 C34 16 28 12 24 4Z"
    fill="url(#fl)"/>
  <path transform="translate(${pad}, ${pad}) scale(${inner / 48})"
    d="M24 16 C22 20 19 22 20 28 C21 31 24 33 24 33 C24 33 27 31 28 28 C29 22 26 20 24 16Z"
    fill="#fff176" opacity="0.7"/>
</svg>`
}

for (const size of sizes) {
  const svg = Buffer.from(svgForSize(size))
  const outPath = join(outputDir, `icon-${size}x${size}.png`)
  await sharp(svg).png().toFile(outPath)
  console.log(`Created ${outPath}`)
}

// Also create a favicon.ico-compatible 32x32
const favicon = Buffer.from(svgForSize(32))
await sharp(favicon).png().toFile(join(__dirname, '..', 'public', 'favicon.png'))
console.log('Created public/favicon.png')

console.log('All icons generated.')
