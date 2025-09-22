#!/usr/bin/env node

/**
 * Script to split large monthly JSON files into district (구) chunks
 * This reduces initial load times by allowing partial data fetching
 */

const fs = require('fs').promises;
const path = require('path');

const MONTHLY_DATA_DIR = path.join(__dirname, '../public/data/local_economy/monthly');
const CHUNKS_OUTPUT_DIR = path.join(__dirname, '../public/data/local_economy/chunks');

async function ensureDirectoryExists(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    console.error(`Error creating directory ${dir}:`, error);
  }
}

async function splitMonthlyFile(monthFile) {
  console.log(`Processing ${monthFile}...`);

  try {
    const filePath = path.join(MONTHLY_DATA_DIR, monthFile);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent);

    // Get year-month from filename (e.g., "2024-01.json" -> "2024-01")
    const yearMonth = path.basename(monthFile, '.json');
    const monthDir = path.join(CHUNKS_OUTPUT_DIR, yearMonth);
    await ensureDirectoryExists(monthDir);

    // Group data by 자치구 (district)
    const districtGroups = {};
    const districtStats = {};

    for (const record of data) {
      const district = record.자치구;
      if (!district) continue;

      if (!districtGroups[district]) {
        districtGroups[district] = [];
        districtStats[district] = { count: 0, size: 0 };
      }

      districtGroups[district].push(record);
      districtStats[district].count++;
    }

    // Write each district's data to a separate file
    const indexData = {
      yearMonth,
      districts: [],
      totalRecords: data.length,
      generatedAt: new Date().toISOString()
    };

    for (const [district, records] of Object.entries(districtGroups)) {
      // Sanitize district name for filename
      const safeDistrictName = district.replace(/[^가-힣a-zA-Z0-9]/g, '_');
      const chunkFile = path.join(monthDir, `${safeDistrictName}.json`);

      // Write district data
      await fs.writeFile(chunkFile, JSON.stringify(records));

      // Get file size
      const stats = await fs.stat(chunkFile);
      districtStats[district].size = stats.size;

      // Add to index
      indexData.districts.push({
        name: district,
        fileName: `${safeDistrictName}.json`,
        records: districtStats[district].count,
        sizeBytes: districtStats[district].size
      });

      console.log(`  - ${district}: ${districtStats[district].count} records (${(districtStats[district].size / 1024).toFixed(2)} KB)`);
    }

    // Write index file for this month
    const indexFile = path.join(monthDir, 'index.json');
    await fs.writeFile(indexFile, JSON.stringify(indexData, null, 2));

    // Calculate savings
    const originalSize = (await fs.stat(filePath)).size;
    const totalChunkedSize = Object.values(districtStats).reduce((sum, stat) => sum + stat.size, 0);
    const savings = ((1 - totalChunkedSize / originalSize) * 100).toFixed(1);

    console.log(`  Total: ${data.length} records`);
    console.log(`  Original size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Chunked size: ${(totalChunkedSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Compression: ${savings}% smaller\n`);

    return {
      yearMonth,
      districts: indexData.districts,
      originalSize,
      chunkedSize: totalChunkedSize
    };

  } catch (error) {
    console.error(`Error processing ${monthFile}:`, error);
    return null;
  }
}

async function main() {
  console.log('Starting monthly data chunking...\n');

  // Ensure output directory exists
  await ensureDirectoryExists(CHUNKS_OUTPUT_DIR);

  // Get all monthly JSON files
  const files = await fs.readdir(MONTHLY_DATA_DIR);
  const monthlyFiles = files.filter(f => f.endsWith('.json') && /^\d{4}-\d{2}\.json$/.test(f));

  if (monthlyFiles.length === 0) {
    console.log('No monthly data files found in', MONTHLY_DATA_DIR);
    return;
  }

  console.log(`Found ${monthlyFiles.length} monthly files to process\n`);

  // Process each file
  const results = [];
  for (const file of monthlyFiles) {
    const result = await splitMonthlyFile(file);
    if (result) {
      results.push(result);
    }
  }

  // Create master index
  const masterIndex = {
    months: results.map(r => ({
      yearMonth: r.yearMonth,
      districts: r.districts.length,
      totalRecords: r.districts.reduce((sum, d) => sum + d.records, 0),
      originalSizeMB: (r.originalSize / 1024 / 1024).toFixed(2),
      chunkedSizeMB: (r.chunkedSize / 1024 / 1024).toFixed(2)
    })),
    generatedAt: new Date().toISOString()
  };

  const masterIndexFile = path.join(CHUNKS_OUTPUT_DIR, 'master-index.json');
  await fs.writeFile(masterIndexFile, JSON.stringify(masterIndex, null, 2));

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Processed ${results.length} monthly files`);

  const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
  const totalChunked = results.reduce((sum, r) => sum + r.chunkedSize, 0);
  const totalSavings = ((1 - totalChunked / totalOriginal) * 100).toFixed(1);

  console.log(`Total original size: ${(totalOriginal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Total chunked size: ${(totalChunked / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Overall compression: ${totalSavings}%`);
  console.log(`\nChunked data saved to: ${CHUNKS_OUTPUT_DIR}`);
}

// Run the script
main().catch(console.error);