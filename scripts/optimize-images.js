#!/usr/bin/env node

/**
 * Image optimization script
 * Converts PNG images to WebP format for better performance
 * Requires: npm install sharp
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '../public');
const IMAGES_DIR = path.join(PUBLIC_DIR, 'images');

// Configuration for image optimization
const WEBP_QUALITY = 85;
const RESIZE_OPTIONS = {
  large: { width: 1920 },
  medium: { width: 1200 },
  small: { width: 640 }
};

async function optimizeImage(inputPath, filename) {
  const nameWithoutExt = path.basename(filename, path.extname(filename));
  const outputDir = path.dirname(inputPath);
  
  try {
    // Get image metadata
    const metadata = await sharp(inputPath).metadata();
    console.log(`Processing: ${filename} (${metadata.width}x${metadata.height})`);
    
    // Convert to WebP
    const webpPath = path.join(outputDir, `${nameWithoutExt}.webp`);
    await sharp(inputPath)
      .webp({ quality: WEBP_QUALITY })
      .toFile(webpPath);
    
    const webpStats = fs.statSync(webpPath);
    const originalStats = fs.statSync(inputPath);
    const savings = ((1 - webpStats.size / originalStats.size) * 100).toFixed(1);
    
    console.log(`  ✓ WebP created: ${nameWithoutExt}.webp (${savings}% smaller)`);
    
    // Create responsive sizes for large images
    if (metadata.width > 1920) {
      for (const [size, options] of Object.entries(RESIZE_OPTIONS)) {
        const responsivePath = path.join(outputDir, `${nameWithoutExt}-${size}.webp`);
        await sharp(inputPath)
          .resize(options)
          .webp({ quality: WEBP_QUALITY })
          .toFile(responsivePath);
        console.log(`  ✓ Responsive ${size}: ${nameWithoutExt}-${size}.webp`);
      }
    }
    
  } catch (error) {
    console.error(`  ✗ Error processing ${filename}:`, error.message);
  }
}

async function processImagesDirectory() {
  console.log('Starting image optimization...\n');
  
  if (!fs.existsSync(IMAGES_DIR)) {
    console.error('Images directory not found:', IMAGES_DIR);
    return;
  }
  
  const files = fs.readdirSync(IMAGES_DIR);
  const pngFiles = files.filter(file => file.toLowerCase().endsWith('.png'));
  
  if (pngFiles.length === 0) {
    console.log('No PNG files found to optimize.');
    return;
  }
  
  console.log(`Found ${pngFiles.length} PNG files to optimize.\n`);
  
  for (const file of pngFiles) {
    const filePath = path.join(IMAGES_DIR, file);
    await optimizeImage(filePath, file);
  }
  
  console.log('\n✅ Image optimization complete!');
  console.log('\nNext steps:');
  console.log('1. Update your components to use .webp files instead of .png');
  console.log('2. Consider using the <picture> element for fallback support');
  console.log('3. Test the application to ensure images load correctly');
}

// Check if sharp is installed
try {
  require.resolve('sharp');
  processImagesDirectory();
} catch (error) {
  console.error('Sharp is not installed. Please run: npm install sharp');
  console.log('\nThen run this script again: node scripts/optimize-images.js');
  process.exit(1);
}