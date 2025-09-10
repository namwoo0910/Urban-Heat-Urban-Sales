#!/usr/bin/env node

/**
 * Generate Seoul mesh with actual card sales data
 * Uses January 1st, 2024 sales data for height values
 */

const fs = require('fs');
const path = require('path');
const turf = require('@turf/turf');

// Configuration
const RESOLUTION = 120; // Requested resolution
const INPUT_FILE = path.join(__dirname, '../public/data/local_economy/local_economy_dong.geojson');
const SALES_FILE = path.join(__dirname, '../public/data/local_economy/monthly/2024-01.json');
const OUTPUT_DIR = path.join(__dirname, '../public/data');

// Load sales data for January 1st
console.log('Loading sales data for 2024-01-01...');
const salesData = JSON.parse(fs.readFileSync(SALES_FILE, 'utf8'));

// Create dong sales map for January 1st
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
 * Get sales-based height for a dong
 */
function getSalesHeight(dongCode) {
  const sales = dongSalesMap.get(dongCode) || 0;
  if (sales === 0) return 0;
  
  // Normalize sales to height (0-1000 range)
  // Use log scale for better visualization of differences
  const logSales = Math.log10(sales + 1);
  const logMax = Math.log10(maxSales + 1);
  const logMin = Math.log10(minSales + 1);
  
  // Normalize to 0-1000 range
  const normalized = ((logSales - logMin) / (logMax - logMin)) * 1000;
  return Math.max(0, normalized);
}

/**
 * Find which dong a point belongs to
 */
function findDong(point, dongFeatures) {
  for (const feature of dongFeatures) {
    if (turf.booleanPointInPolygon(point, feature)) {
      return feature.properties.ADM_DR_CD; // dong code
    }
  }
  return null;
}

/**
 * Generate mesh from Seoul boundaries with sales data
 */
function generateMeshWithSales(boundaries, resolution) {
  console.log(`Generating ${resolution}x${resolution} mesh with sales data...`);
  
  // Get bounds
  const bbox = turf.bbox(boundaries);
  const [minX, minY, maxX, maxY] = bbox;
  
  // Calculate step sizes
  const stepX = (maxX - minX) / (resolution - 1);
  const stepY = (maxY - minY) / (resolution - 1);
  
  // Get unified Seoul boundary
  let union = boundaries.features[0];
  for (let i = 1; i < boundaries.features.length; i++) {
    const result = turf.union(union, boundaries.features[i]);
    if (result) union = result;
  }
  const dongFeatures = boundaries.features;
  
  // Generate grid points with dong mapping
  const positions = [];
  const normals = [];
  const texCoords = [];
  const colors = [];
  const indices = [];
  
  // Create height map first
  const heightMap = [];
  for (let row = 0; row < resolution; row++) {
    heightMap[row] = [];
    for (let col = 0; col < resolution; col++) {
      const x = minX + col * stepX;
      const y = minY + row * stepY;
      const point = turf.point([x, y]);
      
      // Check if point is inside Seoul
      if (turf.booleanPointInPolygon(point, union)) {
        // Find which dong this point belongs to
        const dongCode = findDong(point, dongFeatures);
        if (dongCode) {
          heightMap[row][col] = getSalesHeight(dongCode);
        } else {
          heightMap[row][col] = 0; // Inside Seoul but no dong found
        }
      } else {
        heightMap[row][col] = 0; // Outside Seoul
      }
    }
  }
  
  // Apply smoothing to height map for better visualization
  const smoothedHeightMap = smoothHeightMap(heightMap, resolution);
  
  // Generate vertices with smoothed heights
  for (let row = 0; row < resolution; row++) {
    for (let col = 0; col < resolution; col++) {
      const x = minX + col * stepX;
      const y = minY + row * stepY;
      const z = smoothedHeightMap[row][col];
      
      // Position (x, y, z)
      positions.push(x, y, z);
      
      // Normal (calculated from neighboring heights)
      const normal = calculateNormal(smoothedHeightMap, row, col, resolution, stepX, stepY);
      normals.push(...normal);
      
      // Texture coordinates (u, v)
      const u = col / (resolution - 1);
      const v = row / (resolution - 1);
      texCoords.push(u, v);
      
      // Color based on height (RGBA)
      const colorValue = z / 1000; // Normalize to 0-1
      colors.push(
        0.0 + colorValue * 0.5,     // R: 0 to 0.5
        1.0 - colorValue * 0.5,     // G: 1 to 0.5  
        1.0 - colorValue * 0.8,     // B: 1 to 0.2
        z > 0 ? 1.0 : 0.0           // A: transparent if no sales
      );
    }
  }
  
  // Generate triangle indices
  for (let row = 0; row < resolution - 1; row++) {
    for (let col = 0; col < resolution - 1; col++) {
      const topLeft = row * resolution + col;
      const topRight = topLeft + 1;
      const bottomLeft = (row + 1) * resolution + col;
      const bottomRight = bottomLeft + 1;
      
      // Two triangles per quad
      indices.push(topLeft, bottomLeft, topRight);
      indices.push(topRight, bottomLeft, bottomRight);
    }
  }
  
  // Calculate mesh statistics
  const vertices = positions.length / 3;
  const triangles = indices.length / 3;
  
  // Calculate center
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
      vertices,
      triangles,
      bounds: { minX, maxX, minY, maxY },
      center: { x: centerX, y: centerY },
      generated: new Date().toISOString(),
      source: 'Card sales data 2024-01-01',
      salesRange: { min: minSales, max: maxSales },
      dongsWithData: dongSalesMap.size
    }
  };
}

/**
 * Smooth height map for better visualization
 */
function smoothHeightMap(heightMap, resolution) {
  const smoothed = [];
  const kernel = [
    [0.05, 0.1, 0.05],
    [0.1,  0.4, 0.1],
    [0.05, 0.1, 0.05]
  ];
  
  for (let row = 0; row < resolution; row++) {
    smoothed[row] = [];
    for (let col = 0; col < resolution; col++) {
      let sum = 0;
      let weight = 0;
      
      // Apply convolution kernel
      for (let kr = -1; kr <= 1; kr++) {
        for (let kc = -1; kc <= 1; kc++) {
          const r = row + kr;
          const c = col + kc;
          
          if (r >= 0 && r < resolution && c >= 0 && c < resolution) {
            const k = kernel[kr + 1][kc + 1];
            sum += heightMap[r][c] * k;
            weight += k;
          }
        }
      }
      
      smoothed[row][col] = weight > 0 ? sum / weight : heightMap[row][col];
    }
  }
  
  return smoothed;
}

/**
 * Calculate normal vector for a vertex
 */
function calculateNormal(heightMap, row, col, resolution, stepX, stepY) {
  // Get neighboring heights
  const h = heightMap[row][col];
  const hLeft = col > 0 ? heightMap[row][col - 1] : h;
  const hRight = col < resolution - 1 ? heightMap[row][col + 1] : h;
  const hUp = row > 0 ? heightMap[row - 1][col] : h;
  const hDown = row < resolution - 1 ? heightMap[row + 1][col] : h;
  
  // Calculate tangent vectors
  const dx = stepX * 111000; // Convert to meters (approximate)
  const dy = stepY * 111000;
  
  // Tangent in X direction
  const tx = [2 * dx, 0, (hRight - hLeft)];
  // Tangent in Y direction  
  const ty = [0, 2 * dy, (hDown - hUp)];
  
  // Normal is cross product of tangents
  const nx = ty[1] * tx[2] - ty[2] * tx[1];
  const ny = ty[2] * tx[0] - ty[0] * tx[2];
  const nz = ty[0] * tx[1] - ty[1] * tx[0];
  
  // Normalize
  const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
  
  return [nx / length, ny / length, nz / length];
}

// Main execution
async function main() {
  try {
    // Load Seoul boundaries
    console.log('Loading Seoul boundary data...');
    const boundaries = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
    
    // Generate mesh with sales data
    const meshData = generateMeshWithSales(boundaries, RESOLUTION);
    
    // Save JSON mesh
    const outputPath = path.join(OUTPUT_DIR, `seoul-mesh-${RESOLUTION}-sales.json`);
    console.log(`Saving mesh to ${outputPath}...`);
    fs.writeFileSync(outputPath, JSON.stringify(meshData, null, 2));
    
    // Print statistics
    console.log('\nMesh generation complete!');
    console.log(`Resolution: ${RESOLUTION}x${RESOLUTION}`);
    console.log(`Vertices: ${meshData.metadata.vertices}`);
    console.log(`Triangles: ${meshData.metadata.triangles}`);
    console.log(`Dongs with sales data: ${meshData.metadata.dongsWithData}`);
    console.log(`Output: ${outputPath}`);
    
    console.log('\nNext step: Run convertMeshToBinary.js to create binary format');
    
  } catch (error) {
    console.error('Error generating mesh:', error);
    process.exit(1);
  }
}

main();