const sharp = require('sharp')
const fs = require('fs')

async function main() {
  const logo = await sharp('public/letsmeet-logo.png')
    .resize(280, 280, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()

  const svg = Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#2a0b3f"/>
        <stop offset="38%" stop-color="#4a1063"/>
        <stop offset="70%" stop-color="#7d1480"/>
        <stop offset="100%" stop-color="#b5179e"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#g)"/>
    <text x="600" y="430" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="72" font-weight="800">LetsMeet</text>
    <text x="600" y="480" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-family="Arial, sans-serif" font-size="28" font-weight="600" letter-spacing="8">MATCH · CHAT · LOVE</text>
    <text x="600" y="540" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-family="Arial, sans-serif" font-size="22">Meet genuine people near you and start something real today.</text>
  </svg>`)

  const og = await sharp(svg)
    .composite([{ input: logo, top: 70, left: 460 }])
    .png()
    .toBuffer()

  fs.writeFileSync('app/opengraph-image.png', og)
  fs.writeFileSync('app/twitter-image.png', og)
  fs.writeFileSync('public/og-image.png', og)
  console.log('wrote og images', og.length)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
