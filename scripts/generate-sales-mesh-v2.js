/**
 * Generate static Seoul mesh data from GeoJSON boundaries
 * This script pre-computes mesh geometry for better runtime performance
 */

const fs = require('fs');
const path = require('path');
const turf = require('@turf/turf');

// Configuration - Generate only 120 resolution with sales data
const RESOLUTIONS = [120]; // Only 120 resolution as requested
const HEIGHT_SCALE = 1; // Scale factor for height visualization
const INPUT_FILE = path.join(__dirname, '../public/data/local_economy/local_economy_dong.geojson');
const SALES_FILE = path.join(__dirname, '../public/data/local_economy/monthly/2024-01.json');

// Load sales data for January 1st, 2024
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
 * Get sales-based elevation for a dong
 * Uses same linear scale as getDongHeightBySales in district3DUtils.ts
 */
function getSalesElevation(dongCode) {
  const sales = dongSalesMap.get(dongCode);
  
  // 매출이 없는 경우 최소 높이
  if (!sales || sales <= 0) {
    return 10; // 최소 높이로 바닥에 붙어있게
  }
  
  // 매출액을 높이로 변환 (기존 동적 생성과 동일)
  // 1억원 = 1500 units 높이로 매핑
  const scale = 100000000; // 1억원
  const height = (sales / scale) * 1500;
  
  // 최소값만 제한, 최대값 제한 없음
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
        return feature.properties.행정동코드; // dong code
      }
    } catch (e) {
      // Skip invalid features
    }
  }
  return null;
}

/**
 * Calculate distance to nearest boundary for boundary falloff
 * Returns a value between 0 (at boundary) and 1 (far from boundary)
 */
function calculateBoundaryDistance(row, col, insideMap, resolution) {
  // Check if this point is inside Seoul
  if (!insideMap[row][col]) {
    return 0; // Outside Seoul, distance is 0
  }
  
  // Check immediate neighbors (8-connected)
  const neighbors = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];
  
  // Check if any neighbor is outside Seoul (making this a boundary point)
  let boundaryNeighbors = 0;
  for (const [dr, dc] of neighbors) {
    const nr = row + dr;
    const nc = col + dc;
    
    // If neighbor is out of grid bounds or outside Seoul
    if (nr < 0 || nr >= resolution || nc < 0 || nc >= resolution || !insideMap[nr][nc]) {
      boundaryNeighbors++;
    }
  }
  
  // If most neighbors are outside, this is very close to boundary
  if (boundaryNeighbors >= 6) {
    return 0.3; // Very close to boundary - 30% height
  } else if (boundaryNeighbors >= 4) {
    return 0.5; // Close to boundary - 50% height
  } else if (boundaryNeighbors >= 2) {
    return 0.7; // Near boundary - 70% height
  } else if (boundaryNeighbors >= 1) {
    return 0.9; // Slightly near boundary - 90% height (only 10% reduction)
  }
  
  // Check extended neighborhood for distance calculation
  // Maximum search radius (in grid cells)
  const maxRadius = Math.min(10, resolution / 10); // Adaptive based on resolution
  let minDistance = maxRadius;
  
  for (let radius = 2; radius <= maxRadius; radius++) {
    // Check points at this radius
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        // Skip interior points
        if (Math.abs(dr) < radius && Math.abs(dc) < radius) continue;
        
        const nr = row + dr;
        const nc = col + dc;
        
        if (nr >= 0 && nr < resolution && nc >= 0 && nc < resolution) {
          if (!insideMap[nr][nc]) {
            // Found boundary at this distance
            const distance = Math.sqrt(dr * dr + dc * dc);
            minDistance = Math.min(minDistance, distance);
          }
        }
      }
    }
    
    // If we found a boundary at this radius, stop searching
    if (minDistance < maxRadius) {
      break;
    }
  }
  
  // Normalize distance to 0-1 range
  // Points closer than 5 grid cells to boundary will have falloff
  // Increased falloff distance for smoother transition
  const falloffDistance = 5.0;
  return Math.min(1.0, minDistance / falloffDistance);
}

/**
 * Apply smooth falloff function for height near boundaries
 * Returns a factor between 0 (at boundary) and 1 (interior)
 */
function applyBoundaryFalloff(distanceFactor) {
  // distanceFactor is 0 at boundary, 1 in interior
  if (distanceFactor <= 0) {
    return 0; // At boundary - height must be 0
  }
  if (distanceFactor >= 1.0) {
    return 1.0; // No falloff in interior
  }
  
  // Use cubic falloff for sharper transition at boundary
  // This ensures rapid drop to 0 near edges
  return Math.pow(distanceFactor, 3);
}

/**
 * Generate mesh data for a specific resolution
 */
function generateSeoulMeshForResolution(features, validFeatures, minX, minY, maxX, maxY, resolution) {
  const width = maxX - minX;
  const height = maxY - minY;
  
  // Create grid vertices
  const vertexCount = resolution * resolution;
  const positions = new Array(vertexCount * 3);
  const normals = new Array(vertexCount * 3);
  const texCoords = new Array(vertexCount * 2);
  const colors = new Array(vertexCount * 4);
  
  const heightMap = [];
  const insideMap = [];
  
  console.log(`  Generating ${resolution}x${resolution} mesh...`);
  
  // Generate vertices
  for (let row = 0; row < resolution; row++) {
    heightMap[row] = [];
    insideMap[row] = [];
    
    if (row % 20 === 0 && resolution >= 60) {
      console.log(`    Processing row ${row}/${resolution}...`);
    }
    
    for (let col = 0; col < resolution; col++) {
      const idx = row * resolution + col;
      const u = col / (resolution - 1);
      const v = row / (resolution - 1);
      
      const x = minX + width * u;
      const y = minY + height * v;
      
      // Check if point is inside Seoul boundaries first
      const point = turf.point([x, y]);
      let pointInDistrict = false;
      
      for (const feature of validFeatures) {
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
      
      // Generate elevation based on sales data
      let z = 0;
      if (pointInDistrict) {
        // Find which dong this point belongs to
        const dongCode = findDongByPoint(x, y, features);
        if (dongCode) {
          const elevation = getSalesElevation(dongCode);
          z = elevation * HEIGHT_SCALE;
          // Log first few high values for debugging
          if (elevation > 10000 && row === 60 && col < 5) {
            console.log(`    Debug: Dong ${dongCode} → elevation ${elevation.toFixed(0)} → z ${z.toFixed(0)}`);
          }
        }
      }
      
      heightMap[row][col] = z;
      
      // Set vertex position (converted to meters from center with correct latitude scaling)
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      
      // At Seoul's latitude (37.5°N), correct scale factors:
      // Latitude: 111000 meters per degree (constant)
      // Longitude: 111000 * cos(37.5°) ≈ 88000 meters per degree
      const latScale = 111000;
      const lonScale = 111000 * Math.cos(centerY * Math.PI / 180); // Correct for latitude
      
      positions[idx * 3] = (x - centerX) * lonScale;     // Convert to meters with latitude correction
      positions[idx * 3 + 1] = (y - centerY) * latScale;  // Convert to meters
      positions[idx * 3 + 2] = z;
      
      // Set texture coordinates
      texCoords[idx * 2] = u;
      texCoords[idx * 2 + 1] = v;
      
      // Set vertex colors with bright modern gradient
      if (pointInDistrict) {
        // Normalize height based on expected range (max sales 46억 → ~69000 units)
        const maxExpectedHeight = 70000; // Based on max sales of 4.6B
        const normalizedHeight = Math.max(0, Math.min(1, z / maxExpectedHeight));
        
        // Bright modern gradient: cyan → teal → mint → lime → yellow → orange
        let r, g, b;
        if (normalizedHeight < 0.2) {
          // Low elevations: bright cyan to teal
          const t = normalizedHeight / 0.2;
          r = 0;                    // 0 (no red)
          g = 212 + 43 * t;         // 212 to 255 (cyan to teal green)
          b = 255 - 30 * t;         // 255 to 225 (slight reduction)
        } else if (normalizedHeight < 0.4) {
          // Mid-low: teal to mint green
          const t = (normalizedHeight - 0.2) / 0.2;
          r = 0 + 50 * t;           // 0 to 50 (slight red addition)
          g = 255;                  // 255 (max green)
          b = 225 - 77 * t;         // 225 to 148 (reducing blue)
        } else if (normalizedHeight < 0.6) {
          // Mid: mint green to lime
          const t = (normalizedHeight - 0.4) / 0.2;
          r = 50 + 98 * t;          // 50 to 148 (increasing red for lime)
          g = 255;                  // 255 (max green)
          b = 148 - 148 * t;        // 148 to 0 (removing blue)
        } else if (normalizedHeight < 0.8) {
          // Mid-high: lime to bright yellow
          const t = (normalizedHeight - 0.6) / 0.2;
          r = 148 + 107 * t;        // 148 to 255 (max red for yellow)
          g = 255 - 26 * t;         // 255 to 229 (slight green reduction)
          b = 0;                    // 0 (no blue)
        } else {
          // High elevations: yellow to bright orange
          const t = (normalizedHeight - 0.8) / 0.2;
          r = 255;                  // 255 (max red)
          g = 229 - 89 * t;         // 229 to 140 (orange)
          b = 0;                    // 0 (no blue)
        }
        
        colors[idx * 4] = r / 255;
        colors[idx * 4 + 1] = g / 255;
        colors[idx * 4 + 2] = b / 255;
        colors[idx * 4 + 3] = 1.0;
      } else {
        colors[idx * 4] = 0;
        colors[idx * 4 + 1] = 0;
        colors[idx * 4 + 2] = 0;
        colors[idx * 4 + 3] = 0;
      }
    }
  }
  
  // Apply boundary falloff to smooth edges to ground level
  console.log('  Applying boundary falloff...');
  for (let row = 0; row < resolution; row++) {
    for (let col = 0; col < resolution; col++) {
      if (insideMap[row][col] && heightMap[row][col] > 0) {
        // Calculate distance to boundary
        const boundaryDistance = calculateBoundaryDistance(row, col, insideMap, resolution);
        
        // Apply falloff
        const falloffFactor = applyBoundaryFalloff(boundaryDistance);
        heightMap[row][col] *= falloffFactor;
        
        // Update vertex z position
        const idx = row * resolution + col;
        positions[idx * 3 + 2] = heightMap[row][col];
        
        // Update colors based on new height
        const z = heightMap[row][col];
        const maxExpectedHeight = 70000; // Based on max sales of 4.6B
        const normalizedHeight = Math.max(0, Math.min(1, z / maxExpectedHeight));
        
        const colorIdx = idx * 4;
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
        
        colors[colorIdx] = r / 255;
        colors[colorIdx + 1] = g / 255;
        colors[colorIdx + 2] = b / 255;
        colors[colorIdx + 3] = 1.0;
      }
    }
  }
  
  console.log('  Calculating normals...');
  
  // Calculate normals
  for (let row = 0; row < resolution; row++) {
    for (let col = 0; col < resolution; col++) {
      const idx = row * resolution + col;
      
      // Get neighboring heights for normal calculation
      const h = heightMap[row][col];
      const hLeft = col > 0 ? heightMap[row][col - 1] : h;
      const hRight = col < resolution - 1 ? heightMap[row][col + 1] : h;
      const hUp = row > 0 ? heightMap[row - 1][col] : h;
      const hDown = row < resolution - 1 ? heightMap[row + 1][col] : h;
      
      // Calculate normal using central differences (accounting for meter conversion)
      // Need to use the same scale factors as vertex positions
      const centerY = (minY + maxY) / 2;
      const latScale = 111000;
      const lonScale = 111000 * Math.cos(centerY * Math.PI / 180);
      
      const dx = (hRight - hLeft) / (width * lonScale / resolution);
      const dy = (hDown - hUp) / (height * latScale / resolution);
      
      // Normal vector (pointing up)
      const nx = -dx;
      const ny = -dy;
      const nz = 1;
      
      // Normalize
      const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
      normals[idx * 3] = nx / length;
      normals[idx * 3 + 1] = ny / length;
      normals[idx * 3 + 2] = nz / length;
    }
  }
  
  console.log('  Generating triangle indices...');
  
  // Generate triangle indices only for triangles inside Seoul boundaries
  const indices = [];
  
  for (let row = 0; row < resolution - 1; row++) {
    for (let col = 0; col < resolution - 1; col++) {
      const topLeft = row * resolution + col;
      const topRight = topLeft + 1;
      const bottomLeft = (row + 1) * resolution + col;
      const bottomRight = bottomLeft + 1;
      
      // Check if vertices are inside Seoul
      const tlInside = insideMap[row][col];
      const trInside = insideMap[row][col + 1];
      const blInside = insideMap[row + 1][col];
      const brInside = insideMap[row + 1][col + 1];
      
      const insideCount = (tlInside ? 1 : 0) + (trInside ? 1 : 0) + 
                          (blInside ? 1 : 0) + (brInside ? 1 : 0);
      
      // Only include triangles where ALL vertices are inside Seoul
      if (insideCount === 4) {
        // All 4 vertices are inside Seoul - include both triangles
        indices.push(topLeft, bottomLeft, topRight);
        indices.push(topRight, bottomLeft, bottomRight);
      }
    }
  }
  
  console.log(`  Generated ${indices.length / 3} triangles`);
  
  // Calculate center coordinates
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  
  // Create output data
  return {
    positions,
    normals,
    texCoords,
    colors,
    indices,
    metadata: {
      resolution: resolution,
      vertices: vertexCount,
      triangles: indices.length / 3,
      bounds: {
        minX,
        maxX,
        minY,
        maxY
      },
      center: {
        x: centerX,
        y: centerY
      },
      generated: new Date().toISOString(),
      source: 'Card sales data 2024-01-01',
      salesRange: { min: minSales, max: maxSales },
      dongsWithData: dongSalesMap.size
    }
  };
}

/**
 * Generate mesh data from Seoul boundaries for all resolutions
 */
function generateSeoulMeshes() {
  console.log('Loading GeoJSON data...');
  const geojsonData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  const features = geojsonData.features;
  
  console.log(`Loaded ${features.length} features`);
  
  // Calculate bounding box
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  features.forEach(feature => {
    const bbox = turf.bbox(feature);
    minX = Math.min(minX, bbox[0]);
    minY = Math.min(minY, bbox[1]);
    maxX = Math.max(maxX, bbox[2]);
    maxY = Math.max(maxY, bbox[3]);
  });
  
  const width = maxX - minX;
  const height = maxY - minY;
  
  console.log(`Bounding box: [${minX}, ${minY}] - [${maxX}, ${maxY}]`);
  
  // Filter valid features (do this once for all resolutions)
  const validFeatures = features.filter(feature => {
    try {
      if (!feature || !feature.geometry || !feature.geometry.coordinates) {
        return false;
      }
      const area = turf.area(feature);
      return area > 0;
    } catch {
      return false;
    }
  });
  
  console.log(`Valid features: ${validFeatures.length}/${features.length}`);
  console.log('');
  
  // Generate mesh for each resolution
  for (const resolution of RESOLUTIONS) {
    console.log(`\n========================================`);
    console.log(`Generating mesh for resolution ${resolution}x${resolution}`);
    console.log(`========================================`);
    
    const meshData = generateSeoulMeshForResolution(
      features,
      validFeatures,
      minX,
      minY,
      maxX,
      maxY,
      resolution
    );
    
    // Save to file
    const outputFile = path.join(__dirname, `../public/data/seoul-mesh-${resolution}.json`);
    console.log(`  Saving to ${outputFile}...`);
    fs.writeFileSync(outputFile, JSON.stringify(meshData));
    
    const fileSizeInMB = fs.statSync(outputFile).size / (1024 * 1024);
    console.log(`  ✅ Mesh data saved successfully (${fileSizeInMB.toFixed(2)} MB)`);
    console.log(`     - Resolution: ${resolution}x${resolution}`);
    console.log(`     - Vertices: ${meshData.metadata.vertices}`);
    console.log(`     - Triangles: ${meshData.metadata.triangles}`);
  }
  
  // Skip high-resolution mesh (200x200) generation for now
  // const highResMesh = generateSeoulMeshForResolution(
  //   features,
  //   validFeatures,
  //   minX,
  //   minY,
  //   maxX,
  //   maxY,
  //   200
  // );
  
  // const highResFile = path.join(__dirname, '../public/data/seoul-mesh-200.json');
  // console.log(`  Saving to ${highResFile}...`);
  // fs.writeFileSync(highResFile, JSON.stringify(highResMesh));
  
  // const highResSize = fs.statSync(highResFile).size / (1024 * 1024);
  // console.log(`  ✅ High-res mesh saved (${highResSize.toFixed(2)} MB)`);
  
  console.log('\n========================================');
  console.log('✅ All mesh files generated successfully!');
  console.log('========================================');
}

// Run the script
try {
  generateSeoulMeshes();
} catch (error) {
  console.error('Error generating meshes:', error);
  process.exit(1);
}