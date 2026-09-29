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

// Navy app tile with the J Order interlocking gear mark.
function svgForSize(size) {
  const scale = size / 128
  const gears = (cx, cy, radius, teeth, color) => {
    const points = []
    const steps = teeth * 4
    for (let index = 0; index < steps; index += 1) {
      const angle = (Math.PI * 2 * index) / steps - Math.PI / 2
      const depth = index % 4 === 1 || index % 4 === 2 ? 1 : 0.84
      points.push(`${(cx + Math.cos(angle) * radius * depth).toFixed(2)},${(cy + Math.sin(angle) * radius * depth).toFixed(2)}`)
    }
    return `<polygon points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="7" stroke-linejoin="round"/><circle cx="${cx}" cy="${cy}" r="${radius * 0.54}" fill="none" stroke="${color}" stroke-width="6"/><circle cx="${cx}" cy="${cy}" r="5" fill="${color}"/>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="#0b122e"/>
  <defs>
    <linearGradient id="ember" x1="32" y1="24" x2="76" y2="92" gradientUnits="userSpaceOnUse">
      <stop stop-color="#fbbf24"/>
      <stop offset="1" stop-color="#ea580c"/>
    </linearGradient>
  </defs>
  <g transform="scale(${scale}) translate(0 0)">
    ${gears(48, 64, 31, 8, 'url(#ember)')}
    ${gears(88, 64, 23, 8, '#f8fafc')}
  </g>
</svg>`
}

for (const size of [...sizes, 180]) {
  const svg = Buffer.from(svgForSize(size))
  const outPath = join(outputDir, `icon-${size}x${size}.png`)
  await sharp(svg).png().toFile(outPath)
  console.log(`Created ${outPath}`)
}

// Also create a favicon.ico-compatible 32x32
const favicon = Buffer.from(svgForSize(32))
await sharp(favicon).png().toFile(join(__dirname, '..', 'public', 'favicon.png'))
console.log('Created public/favicon.png')

await sharp(Buffer.from(svgForSize(32))).resize(16, 16).png().toFile(join(__dirname, '..', 'public', 'favicon-16x16.png'))
await sharp(Buffer.from(svgForSize(32))).resize(32, 32).png().toFile(join(__dirname, '..', 'public', 'favicon-32x32.png'))

console.log('All icons generated.')
