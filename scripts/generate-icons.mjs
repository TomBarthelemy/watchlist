import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Read the popcorn SVG source
const svgSource = readFileSync(join(root, 'src/assets/icons/popcorn-icon.svg'), 'utf8');

// Build a composed SVG: purple rounded background + popcorn centered with padding (75%)
function buildIconSvg(size) {
  const padding = Math.round(size * 0.125); // 12.5% padding each side
  const iconSize = size - padding * 2;
  const radius = Math.round(size * 0.2);

  // Strip XML declaration and extract the inner SVG attributes/content
  const innerSvg = svgSource
    .replace(/<\?xml[^?>]*\?>\s*/i, '')
    .replace(/width="[^"]*"/, `width="${iconSize}"`)
    .replace(/height="[^"]*"/, `height="${iconSize}"`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#8b7dff"/>
  <g transform="translate(${padding}, ${padding})">
    ${innerSvg}
  </g>
</svg>`;
}

for (const size of sizes) {
  const svg = buildIconSvg(size);
  const outPath = join(root, `public/icons/icon-${size}x${size}.png`);

  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(outPath);

  console.log(`✓ icon-${size}x${size}.png`);
}

// Also generate a 180x180 apple-touch-icon
const appleSvg = buildIconSvg(180);
await sharp(Buffer.from(appleSvg))
  .resize(180, 180)
  .png()
  .toFile(join(root, 'public/icons/apple-touch-icon.png'));
console.log('✓ apple-touch-icon.png');

// Optionally replace favicon.ico with a 32x32 version
const faviconSvg = buildIconSvg(32);
await sharp(Buffer.from(faviconSvg))
  .resize(32, 32)
  .png()
  .toFile(join(root, 'public/favicon-32.png'));
console.log('✓ favicon-32.png (use as reference for favicon.ico if desired)');

console.log('\nAll icons generated successfully!');
