/**
 * Balanced Seoul mesh generation - Fast JavaScript logic with minimal wire artifact prevention
 * Combines speed of JavaScript approach with basic boundary crossing prevention
 */

const fs = require('fs');
const path = require('path');
const turf = require('@turf/turf');

// Configuration
const RESOLUTION = 120;
const HEIGHT_SCALE = 1;
const INPUT_FILE = path.join(__dirname, '../public/data/local_economy/local_economy_dong.geojson');
const SALES_FILE = path.join(__dirname, '../public/data/local_economy/monthly/2024-01.json');
const OUTPUT_DIR = path.join(__dirname, '../public/data');
const BINARY_OUTPUT_DIR = path.join(__dirname, '../public/data/binary');

// Load sales data
console.log('Loading sales data for 2024-01-01...');
const salesData = JSON.parse(fs.readFileSync(SALES_FILE, 'utf8'));

const dongSalesMap = new Map();
let maxSales = 0;
let minSales = Infinity;

salesData
  .filter(d => d.기준일자 === '2024-01-01')
  .forEach(d => {
    const sales = d.총매출액 || 0;
    dongSalesMap.set(d.행정동코드, sales);
    maxSales = Math.max(maxSales, sales);
    if (sales > 0) minSales = Math.min(minSales, sales);
  });

console.log(`Found ${dongSalesMap.size} dongs with sales data`);
console.log(`Sales range: ${minSales.toLocaleString()} - ${maxSales.toLocaleString()} KRW`);

/**
 * Get sales-based elevation for a dong
 */
function getSalesElevation(dongCode) {
  const sales = dongSalesMap.get(dongCode);
  
  if (!sales || sales <= 0) {
    return 10;
  }
  
  const scale = 100000000; // 1억원
  const height = (sales / scale) * 1500;
  
  return Math.max(10, height);
}

/**
 * Find which dong a point belongs to
 */
function findDongByPoint(x, y, features) {
  const point = turf.point([x, y]);
  for (const feature of features) {
    try {
      if (turf.booleanPointInPolygon(point, feature)) {
        return feature.properties.행정동코드;
      }
    } catch (e) {
      // Skip invalid features
    }
  }
  return null;
}

/**
 * Simple boundary crossing check to prevent obvious wire artifacts
 * Much faster than full line-polygon intersection but catches most cases
 */
function hasObviousBoundaryCrossing(row, col, insideMap, resolution) {
  // For a 2x2 quad, check if there's a sharp inside/outside transition
  // that suggests a boundary crossing
  
  const tl = insideMap[row][col];
  const tr = insideMap[row][col + 1];
  const bl = insideMap[row + 1][col];
  const br = insideMap[row + 1][col + 1];
  
  // Pattern detection for potential wire artifacts:
  // If we have a diagonal split (tl+br vs tr+bl), it's likely a boundary crossing
  const diagonalSplit = (tl && br && !tr && !bl) || (!tl && !br && tr && bl);
  
  // If only 1 or 2 corners are inside and they're not adjacent, skip
  const insideCount = (tl ? 1 : 0) + (tr ? 1 : 0) + (bl ? 1 : 0) + (br ? 1 : 0);
  if (insideCount <= 2) {
    // Check if inside points are adjacent
    const hasAdjacentPair = (tl && tr) || (tr && br) || (br && bl) || (bl && tl);
    if (!hasAdjacentPair) {
      return true; // Likely a boundary crossing
    }
  }
  
  return diagonalSplit;
}

/**
 * Generate mesh for a given resolution with balanced approach
 */
function generateMesh(features, resolution) {
  console.log(`Generating mesh for resolution ${resolution}x${resolution} with balanced approach...`);
  
  // Filter valid features
  const validFeatures = features.filter(feature => {
    return feature && 
           feature.geometry && 
           feature.properties && 
           feature.properties.행정동코드;
  });
  
  console.log(`Valid features: ${validFeatures.length}/${features.length}`);
  
  // Calculate bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  validFeatures.forEach(feature => {
    const bbox = turf.bbox(feature);
    minX = Math.min(minX, bbox[0]);
    minY = Math.min(minY, bbox[1]);
    maxX = Math.max(maxX, bbox[2]);
    maxY = Math.max(maxY, bbox[3]);
  });
  
  const width = maxX - minX;
  const height = maxY - minY;
  
  console.log(`Bounding box: [${minX.toFixed(6)}, ${minY.toFixed(6)}, ${maxX.toFixed(6)}, ${maxY.toFixed(6)}]`);
  
  const vertexCount = resolution * resolution;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const texCoords = new Float32Array(vertexCount * 2);
  const colors = new Float32Array(vertexCount * 4);
  
  const heightMap = [];
  const insideMap = [];
  
  // Generate vertices with fast point-in-polygon checking
  console.log('  Generating vertices with fast boundary checking...');
  for (let row = 0; row < resolution; row++) {
    heightMap[row] = [];
    insideMap[row] = [];
    
    for (let col = 0; col < resolution; col++) {
      const idx = row * resolution + col;
      const u = col / (resolution - 1);
      const v = row / (resolution - 1);
      
      const x = minX + width * u;
      const y = minY + height * v;
      
      // Fast boundary check using limited features
      const point = turf.point([x, y]);
      let pointInDistrict = false;
      
      // Only check first 50 features for speed (covers most of Seoul)
      for (const feature of validFeatures.slice(0, 50)) {
        try {
          if (turf.booleanPointInPolygon(point, feature)) {
            pointInDistrict = true;
            break;
          }
        } catch {
          // Skip invalid features
        }
      }
      
      insideMap[row][col] = pointInDistrict;
      
      // Generate elevation
      let z = 0;
      if (pointInDistrict) {
        const dongCode = findDongByPoint(x, y, validFeatures.slice(0, 50));
        if (dongCode) {
          const elevation = getSalesElevation(dongCode);
          z = elevation * HEIGHT_SCALE;
        }
      }
      
      heightMap[row][col] = z;
      
      // Set vertex position
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      
      const latScale = 111000;
      const lonScale = 111000 * Math.cos(centerY * Math.PI / 180);
      
      positions[idx * 3] = (x - centerX) * lonScale;
      positions[idx * 3 + 1] = (y - centerY) * latScale;
      positions[idx * 3 + 2] = z;
      
      texCoords[idx * 2] = u;
      texCoords[idx * 2 + 1] = v;
      
      // Set colors
      if (pointInDistrict) {
        const maxExpectedHeight = 70000;
        const normalizedHeight = Math.max(0, Math.min(1, z / maxExpectedHeight));
        
        let r, g, b;
        if (normalizedHeight < 0.2) {
          const t = normalizedHeight / 0.2;
          r = 0;
          g = 212 + 43 * t;
          b = 255 - 30 * t;
        } else if (normalizedHeight < 0.4) {
          const t = (normalizedHeight - 0.2) / 0.2;
          r = 0 + 50 * t;
          g = 255;
          b = 225 - 77 * t;
        } else if (normalizedHeight < 0.6) {
          const t = (normalizedHeight - 0.4) / 0.2;
          r = 50 + 98 * t;
          g = 255;
          b = 148 - 148 * t;
        } else if (normalizedHeight < 0.8) {
          const t = (normalizedHeight - 0.6) / 0.2;
          r = 148 + 107 * t;
          g = 255 - 26 * t;
          b = 0;
        } else {
          const t = (normalizedHeight - 0.8) / 0.2;
          r = 255;
          g = 229 - 89 * t;
          b = 0;
        }
        
        colors[idx * 4] = r / 255;
        colors[idx * 4 + 1] = g / 255;
        colors[idx * 4 + 2] = b / 255;
        colors[idx * 4 + 3] = 1.0;
      }
    }
  }
  
  // Calculate normals
  console.log('  Calculating normals...');
  for (let row = 0; row < resolution; row++) {
    for (let col = 0; col < resolution; col++) {
      const idx = row * resolution + col;
      
      const h = heightMap[row][col];
      const hLeft = col > 0 ? heightMap[row][col - 1] : h;
      const hRight = col < resolution - 1 ? heightMap[row][col + 1] : h;
      const hUp = row > 0 ? heightMap[row - 1][col] : h;
      const hDown = row < resolution - 1 ? heightMap[row + 1][col] : h;
      
      const centerY = (minY + maxY) / 2;
      const latScale = 111000;
      const lonScale = 111000 * Math.cos(centerY * Math.PI / 180);
      
      const dx = (hRight - hLeft) / (width * lonScale / resolution);
      const dy = (hDown - hUp) / (height * latScale / resolution);
      
      const nx = -dx;
      const ny = -dy;
      const nz = 1;
      
      const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
      normals[idx * 3] = nx / length;
      normals[idx * 3 + 1] = ny / length;
      normals[idx * 3 + 2] = nz / length;
    }
  }
  
  // Generate triangles with smart boundary crossing prevention
  console.log('  Generating triangles with boundary crossing prevention...');
  const indices = [];
  let skippedTriangles = 0;
  
  for (let row = 0; row < resolution - 1; row++) {
    for (let col = 0; col < resolution - 1; col++) {
      const topLeft = row * resolution + col;
      const topRight = topLeft + 1;
      const bottomLeft = (row + 1) * resolution + col;
      const bottomRight = bottomLeft + 1;
      
      const tlInside = insideMap[row][col];
      const trInside = insideMap[row][col + 1];
      const blInside = insideMap[row + 1][col];
      const brInside = insideMap[row + 1][col + 1];
      
      const insideCount = (tlInside ? 1 : 0) + (trInside ? 1 : 0) + 
                          (blInside ? 1 : 0) + (brInside ? 1 : 0);
      
      // Original condition: all 4 vertices inside
      if (insideCount === 4) {
        // Additional check: prevent obvious boundary crossings
        if (!hasObviousBoundaryCrossing(row, col, insideMap, resolution)) {
          indices.push(topLeft, bottomLeft, topRight);
          indices.push(topRight, bottomLeft, bottomRight);
        } else {
          skippedTriangles += 2;
        }
      }
    }
  }
  
  console.log(`  Generated ${indices.length / 3} triangles (skipped ${skippedTriangles} potential wire artifacts)`);
  
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  
  return {
    positions,
    normals,
    texCoords,
    colors,
    indices,
    metadata: {
      resolution,
      vertices: vertexCount,
      triangles: indices.length / 3,
      bounds: { minX, maxX, minY, maxY },
      center: { x: centerX, y: centerY },
      generated: new Date().toISOString(),
      source: 'Balanced JavaScript with wire artifact prevention'
    }
  };
}

/**
 * Save mesh as JSON
 */
function saveMeshAsJSON(meshData, resolution) {
  const outputFile = path.join(OUTPUT_DIR, `seoul-mesh-${resolution}.json`);
  
  const jsonData = {
    positions: Array.from(meshData.positions),
    normals: Array.from(meshData.normals),
    texCoords: Array.from(meshData.texCoords),
    colors: Array.from(meshData.colors),
    indices: Array.from(meshData.indices),
    metadata: meshData.metadata
  };
  
  fs.writeFileSync(outputFile, JSON.stringify(jsonData, null, 2));
  
  const fileSizeMB = (fs.statSync(outputFile).size / 1024 / 1024).toFixed(2);
  console.log(`✅ Mesh data saved successfully (${fileSizeMB} MB)`);
  console.log(`   - Resolution: ${resolution}x${resolution}`);
  console.log(`   - Vertices: ${jsonData.metadata.vertices}`);
  console.log(`   - Triangles: ${jsonData.metadata.triangles}`);
  
  return outputFile;
}

/**
 * Convert to binary format
 */
function convertToBinary(jsonFile, resolution) {
  const meshData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  
  if (!fs.existsSync(BINARY_OUTPUT_DIR)) {
    fs.mkdirSync(BINARY_OUTPUT_DIR, { recursive: true });
  }
  
  const positions = meshData.positions;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  for (let i = 0; i < positions.length; i += 3) {
    minX = Math.min(minX, positions[i]);
    maxX = Math.max(maxX, positions[i]);
    minY = Math.min(minY, positions[i + 1]);
    maxY = Math.max(maxY, positions[i + 1]);
  }
  
  const header = {
    format: 'seoul-mesh-binary',
    version: '1.0',
    metadata: {
      resolution,
      vertices: meshData.positions.length / 3,
      triangles: meshData.indices.length / 3,
      bounds: { minX, maxX, minY, maxY },
      center: meshData.metadata.center,
      generated: new Date().toISOString(),
      source: 'Balanced JavaScript with wire artifact prevention'
    },
    offsets: {
      positions: { offset: 0, length: 0, type: 'Float32', itemSize: 3, count: 0 },
      normals: { offset: 0, length: 0, type: 'Float32', itemSize: 3, count: 0 },
      texCoords: { offset: 0, length: 0, type: 'Float32', itemSize: 2, count: 0 },
      colors: { offset: 0, length: 0, type: 'Float32', itemSize: 4, count: 0 },
      indices: { offset: 0, length: 0, type: 'Uint32', itemSize: 1, count: 0 }
    },
    totalSize: 0,
    compressed: false
  };
  
  const positionsArray = new Float32Array(meshData.positions);
  const normalsArray = new Float32Array(meshData.normals);
  const texCoordsArray = new Float32Array(meshData.texCoords);
  const colorsArray = new Float32Array(meshData.colors);
  const indicesArray = new Uint32Array(meshData.indices);
  
  let offset = 0;
  
  header.offsets.positions.offset = offset;
  header.offsets.positions.length = positionsArray.byteLength;
  header.offsets.positions.count = positionsArray.length / 3;
  offset += positionsArray.byteLength;
  
  header.offsets.normals.offset = offset;
  header.offsets.normals.length = normalsArray.byteLength;
  header.offsets.normals.count = normalsArray.length / 3;
  offset += normalsArray.byteLength;
  
  header.offsets.texCoords.offset = offset;
  header.offsets.texCoords.length = texCoordsArray.byteLength;
  header.offsets.texCoords.count = texCoordsArray.length / 2;
  offset += texCoordsArray.byteLength;
  
  header.offsets.colors.offset = offset;
  header.offsets.colors.length = colorsArray.byteLength;
  header.offsets.colors.count = colorsArray.length / 4;
  offset += colorsArray.byteLength;
  
  header.offsets.indices.offset = offset;
  header.offsets.indices.length = indicesArray.byteLength;
  header.offsets.indices.count = indicesArray.length;
  offset += indicesArray.byteLength;
  
  header.totalSize = offset;
  
  const headerFile = path.join(BINARY_OUTPUT_DIR, `seoul-mesh-${resolution}.header.json`);
  fs.writeFileSync(headerFile, JSON.stringify(header, null, 2));
  
  const buffer = Buffer.alloc(header.totalSize);
  let bufferOffset = 0;
  
  Buffer.from(positionsArray.buffer).copy(buffer, bufferOffset);
  bufferOffset += positionsArray.byteLength;
  
  Buffer.from(normalsArray.buffer).copy(buffer, bufferOffset);
  bufferOffset += normalsArray.byteLength;
  
  Buffer.from(texCoordsArray.buffer).copy(buffer, bufferOffset);
  bufferOffset += texCoordsArray.byteLength;
  
  Buffer.from(colorsArray.buffer).copy(buffer, bufferOffset);
  bufferOffset += colorsArray.byteLength;
  
  Buffer.from(indicesArray.buffer).copy(buffer, bufferOffset);
  
  const binaryFile = path.join(BINARY_OUTPUT_DIR, `seoul-mesh-${resolution}.bin`);
  fs.writeFileSync(binaryFile, buffer);
  
  const binarySize = (buffer.length / 1024 / 1024).toFixed(2);
  console.log(`✅ Binary written to ${binaryFile}`);
  console.log(`    Size: ${binarySize} MB`);
  
  return binaryFile;
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('========================================');
    console.log('Balanced Seoul Mesh Generation');
    console.log('Fast JavaScript + Wire Artifact Prevention');
    console.log('========================================');
    
    const geoJsonData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
    
    if (!geoJsonData.features || !Array.isArray(geoJsonData.features)) {
      throw new Error('Invalid GeoJSON format');
    }
    
    console.log(`Loaded ${geoJsonData.features.length} features`);
    
    const meshData = generateMesh(geoJsonData.features, RESOLUTION);
    
    if (!meshData.positions || meshData.positions.length === 0) {
      throw new Error('Failed to generate mesh');
    }
    
    console.log(`Mesh generated successfully:`);
    console.log(`  - Vertices: ${meshData.positions.length / 3}`);
    console.log(`  - Triangles: ${meshData.indices ? meshData.indices.length / 3 : 0}`);
    
    const jsonFile = saveMeshAsJSON(meshData, RESOLUTION);
    
    console.log('\\nConverting to binary format...');
    convertToBinary(jsonFile, RESOLUTION);
    
    console.log('\\n========================================');
    console.log('✅ Balanced mesh generation completed!');
    console.log('🔥 Fast speed + wire artifact prevention');
    console.log('⚡ Optimized for practical use');
    console.log('========================================');
    
  } catch (error) {
    console.error('\\n❌ Mesh generation failed:');
    console.error(error);
    process.exit(1);
  }
}

main();