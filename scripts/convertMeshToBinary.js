#!/usr/bin/env node

/**
 * Mesh to Binary Converter
 * Converts JSON mesh data to efficient binary format for faster loading
 * 
 * Binary format structure:
 * - Header (JSON): metadata and byte offsets
 * - Body (Binary): TypedArray data blocks
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Binary format version
const BINARY_FORMAT_VERSION = '1.0.0';

/**
 * Convert JSON mesh to binary format
 */
function convertMeshToBinary(jsonPath, outputDir) {
  console.log(`Converting ${jsonPath} to binary format...`);
  
  // Read JSON data
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  // Extract metadata
  const metadata = {
    version: BINARY_FORMAT_VERSION,
    ...jsonData.metadata,
    originalFile: path.basename(jsonPath),
    converted: new Date().toISOString()
  };
  
  // Create binary buffers for each data type
  const buffers = {};
  const offsets = {};
  let currentOffset = 0;
  
  // Convert positions (Float32)
  if (jsonData.positions) {
    const positions = new Float32Array(jsonData.positions);
    buffers.positions = Buffer.from(positions.buffer);
    offsets.positions = {
      offset: currentOffset,
      length: buffers.positions.length,
      type: 'Float32Array',
      itemSize: 3,
      count: positions.length / 3
    };
    currentOffset += buffers.positions.length;
  }
  
  // Convert normals (Float32)
  if (jsonData.normals) {
    const normals = new Float32Array(jsonData.normals);
    buffers.normals = Buffer.from(normals.buffer);
    offsets.normals = {
      offset: currentOffset,
      length: buffers.normals.length,
      type: 'Float32Array',
      itemSize: 3,
      count: normals.length / 3
    };
    currentOffset += buffers.normals.length;
  }
  
  // Convert texCoords (Float32)
  if (jsonData.texCoords) {
    const texCoords = new Float32Array(jsonData.texCoords);
    buffers.texCoords = Buffer.from(texCoords.buffer);
    offsets.texCoords = {
      offset: currentOffset,
      length: buffers.texCoords.length,
      type: 'Float32Array',
      itemSize: 2,
      count: texCoords.length / 2
    };
    currentOffset += buffers.texCoords.length;
  }
  
  // Convert colors (Float32)
  if (jsonData.colors) {
    const colors = new Float32Array(jsonData.colors);
    buffers.colors = Buffer.from(colors.buffer);
    offsets.colors = {
      offset: currentOffset,
      length: buffers.colors.length,
      type: 'Float32Array',
      itemSize: 4,
      count: colors.length / 4
    };
    currentOffset += buffers.colors.length;
  }
  
  // Convert indices (Uint32)
  if (jsonData.indices) {
    const indices = new Uint32Array(jsonData.indices);
    buffers.indices = Buffer.from(indices.buffer);
    offsets.indices = {
      offset: currentOffset,
      length: buffers.indices.length,
      type: 'Uint32Array',
      itemSize: 1,
      count: indices.length
    };
    currentOffset += buffers.indices.length;
  }
  
  // Combine all buffers
  const combinedBuffer = Buffer.concat(Object.values(buffers));
  
  // Create header with metadata and offsets
  const header = {
    format: 'seoul-mesh-binary',
    version: BINARY_FORMAT_VERSION,
    metadata,
    offsets,
    totalSize: combinedBuffer.length,
    compressed: false
  };
  
  // Generate output filenames
  const baseName = path.basename(jsonPath, '.json');
  const headerPath = path.join(outputDir, `${baseName}.header.json`);
  const binaryPath = path.join(outputDir, `${baseName}.bin`);
  const compressedPath = path.join(outputDir, `${baseName}.bin.gz`);
  
  // Write header file
  fs.writeFileSync(headerPath, JSON.stringify(header, null, 2));
  console.log(`  ✓ Header written to ${headerPath}`);
  
  // Write uncompressed binary
  fs.writeFileSync(binaryPath, combinedBuffer);
  console.log(`  ✓ Binary written to ${binaryPath}`);
  console.log(`    Size: ${(combinedBuffer.length / 1024 / 1024).toFixed(2)} MB`);
  
  // Write compressed binary
  const compressed = zlib.gzipSync(combinedBuffer, { level: 9 });
  fs.writeFileSync(compressedPath, compressed);
  console.log(`  ✓ Compressed binary written to ${compressedPath}`);
  console.log(`    Size: ${(compressed.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`    Compression ratio: ${((1 - compressed.length / combinedBuffer.length) * 100).toFixed(1)}%`);
  
  // Calculate and display savings
  const originalSize = fs.statSync(jsonPath).size;
  const savings = ((1 - compressed.length / originalSize) * 100).toFixed(1);
  console.log(`  ✓ Total size reduction: ${savings}%`);
  
  return {
    headerPath,
    binaryPath,
    compressedPath,
    originalSize,
    binarySize: combinedBuffer.length,
    compressedSize: compressed.length
  };
}

/**
 * Convert all mesh files in a directory
 */
function convertAllMeshes() {
  const inputDir = path.join(__dirname, '../public/data');
  const outputDir = path.join(__dirname, '../public/data/binary');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Find all seoul-mesh JSON files
  const meshFiles = fs.readdirSync(inputDir)
    .filter(file => file.startsWith('seoul-mesh-') && file.endsWith('.json'));
  
  if (meshFiles.length === 0) {
    console.log('No mesh files found to convert.');
    return;
  }
  
  console.log(`Found ${meshFiles.length} mesh files to convert\n`);
  
  const results = [];
  let totalOriginal = 0;
  let totalBinary = 0;
  let totalCompressed = 0;
  
  // Convert each file
  for (const file of meshFiles) {
    const inputPath = path.join(inputDir, file);
    const result = convertMeshToBinary(inputPath, outputDir);
    results.push(result);
    
    totalOriginal += result.originalSize;
    totalBinary += result.binarySize;
    totalCompressed += result.compressedSize;
    
    console.log('');
  }
  
  // Display summary
  console.log('========================================');
  console.log('Conversion Summary:');
  console.log('========================================');
  console.log(`Files converted: ${results.length}`);
  console.log(`Total original size: ${(totalOriginal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Total binary size: ${(totalBinary / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Total compressed size: ${(totalCompressed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Overall compression: ${((1 - totalCompressed / totalOriginal) * 100).toFixed(1)}%`);
  console.log('========================================');
  
  // Create index file for easy loading
  const index = {
    version: BINARY_FORMAT_VERSION,
    generated: new Date().toISOString(),
    files: meshFiles.map(file => {
      const baseName = path.basename(file, '.json');
      const resolution = parseInt(baseName.split('-').pop());
      return {
        resolution,
        header: `${baseName}.header.json`,
        binary: `${baseName}.bin`,
        compressed: `${baseName}.bin.gz`
      };
    })
  };
  
  const indexPath = path.join(outputDir, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log(`\n✓ Index file created at ${indexPath}`);
}

// Run the converter
if (require.main === module) {
  convertAllMeshes();
}

module.exports = { convertMeshToBinary, convertAllMeshes };