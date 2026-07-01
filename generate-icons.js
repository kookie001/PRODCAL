import sharp from 'sharp';
import fs from 'fs';

async function generate() {
  try {
    console.log('Generating PWA icons from public/icon.svg...');

    // Ensure public folder exists
    if (!fs.existsSync('public')) {
      fs.mkdirSync('public');
    }

    // 1. Generate 192x192 PNG
    await sharp('public/icon.svg')
      .resize(192, 192)
      .png()
      .toFile('public/icon-192.png');
    console.log('Successfully generated public/icon-192.png');

    // 2. Generate 512x512 PNG
    await sharp('public/icon.svg')
      .resize(512, 512)
      .png()
      .toFile('public/icon-512.png');
    console.log('Successfully generated public/icon-512.png');

    // 3. Generate apple-touch-icon.png (180x180)
    await sharp('public/icon.svg')
      .resize(180, 180)
      .png()
      .toFile('public/apple-touch-icon.png');
    console.log('Successfully generated public/apple-touch-icon.png');

  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generate();
