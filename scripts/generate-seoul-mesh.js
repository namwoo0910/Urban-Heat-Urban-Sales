/**
 * Generate static Seoul mesh data from GeoJSON boundaries
 * This script pre-computes mesh geometry for better runtime performance
 */

const fs = require('fs');
const path = require('path');
const turf = require('@turf/turf');

// Configuration
const RESOLUTION = 120; // High quality mesh
const HEIGHT_SCALE = 4; // Increased for more dramatic 3D effect
const INPUT_FILE = path.join(__dirname, '../public/data/local_economy/local_economy_dong.geojson');
const OUTPUT_FILE = path.join(__dirname, '../public/data/seoul-mesh-120.json');

/**
 * Generate dummy elevation data for testing
 * Creates smooth wave-like patterns across the region
 */
function generateDummyElevation(x, y, centerX = 126.978, centerY = 37.5765) {
  // Create multiple sine/cosine waves for interesting terrain
  const dx = (x - centerX) * 100;
  const dy = (y - centerY) * 100;
  
  // Primary wave pattern - increased amplitude
  const wave1 = Math.sin(dx * 0.5) * Math.cos(dy * 0.5) * 300;
  
  // Secondary wave for variation - increased amplitude
  const wave2 = Math.sin(dx * 0.3 + 1) * Math.sin(dy * 0.3 + 1) * 250;
  
  // Tertiary wave for detail - increased amplitude
  const wave3 = Math.cos(dx * 0.7) * Math.sin(dy * 0.9) * 150;
  
  // Distance from center affects height (bowl shape) - increased effect
  const distance = Math.sqrt(dx * dx + dy * dy);
  const distanceFactor = Math.max(0, 1 - distance / 50) * 200;
  
  // Combine all factors with some randomness - increased base height
  const baseHeight = 200 + wave1 + wave2 * 0.5 + wave3 * 0.3 + distanceFactor;
  
  // Add small random variation
  const randomFactor = (Math.random() - 0.5) * 30;
  
  // Ensure positive height and apply bounds - increased range for more dramatic effect
  return Math.max(100, Math.min(1500, baseHeight + randomFactor));
}

/**
 * Generate mesh data from Seoul boundaries
 */
function generateSeoulMesh() {
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
  
  // Add padding
  const padding = 0.01;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;
  
  const width = maxX - minX;
  const height = maxY - minY;
  
  console.log(`Bounding box: [${minX}, ${minY}] - [${maxX}, ${maxY}]`);
  
  // Filter valid features
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
  
  // Create grid vertices
  const vertexCount = RESOLUTION * RESOLUTION;
  const positions = new Array(vertexCount * 3);
  const normals = new Array(vertexCount * 3);
  const texCoords = new Array(vertexCount * 2);
  const colors = new Array(vertexCount * 4);
  
  const heightMap = [];
  const insideMap = [];
  
  console.log(`Generating ${RESOLUTION}x${RESOLUTION} mesh...`);
  
  // Generate vertices
  for (let row = 0; row < RESOLUTION; row++) {
    heightMap[row] = [];
    insideMap[row] = [];
    
    if (row % 10 === 0) {
      console.log(`Processing row ${row}/${RESOLUTION}...`);
    }
    
    for (let col = 0; col < RESOLUTION; col++) {
      const idx = row * RESOLUTION + col;
      const u = col / (RESOLUTION - 1);
      const v = row / (RESOLUTION - 1);
      
      const x = minX + width * u;
      const y = minY + height * v;
      
      // Generate elevation
      let z = generateDummyElevation(x, y) * HEIGHT_SCALE;
      
      // Check if point is inside Seoul boundaries
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
      
      // Set zero elevation for points outside districts
      if (!pointInDistrict) {
        z = 0;
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
      
      // Set vertex colors with height-based gradient
      if (pointInDistrict) {
        // Normalize height based on expected range (100-6000 with HEIGHT_SCALE=4)
        // This ensures we use the full color gradient
        const maxExpectedHeight = 1500 * HEIGHT_SCALE; // 6000
        const normalizedHeight = Math.max(0, Math.min(1, z / maxExpectedHeight));
        
        let r, g, b;
        if (normalizedHeight < 0.33) {
          // Blue to cyan (low elevations)
          const t = normalizedHeight / 0.33;
          r = 0;
          g = 100 + 155 * t;
          b = 255;
        } else if (normalizedHeight < 0.67) {
          // Cyan to purple (mid elevations)
          const t = (normalizedHeight - 0.33) / 0.34;
          r = 120 * t;
          g = 255 - 155 * t;
          b = 255;
        } else {
          // Purple to red/orange (high elevations)
          const t = (normalizedHeight - 0.67) / 0.33;
          r = 120 + 135 * t;
          g = 100 - 50 * t;
          b = 255 - 155 * t;
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
  
  console.log('Calculating normals...');
  
  // Calculate normals
  for (let row = 0; row < RESOLUTION; row++) {
    for (let col = 0; col < RESOLUTION; col++) {
      const idx = row * RESOLUTION + col;
      
      // Get neighboring heights for normal calculation
      const h = heightMap[row][col];
      const hLeft = col > 0 ? heightMap[row][col - 1] : h;
      const hRight = col < RESOLUTION - 1 ? heightMap[row][col + 1] : h;
      const hUp = row > 0 ? heightMap[row - 1][col] : h;
      const hDown = row < RESOLUTION - 1 ? heightMap[row + 1][col] : h;
      
      // Calculate normal using central differences (accounting for meter conversion)
      // Need to use the same scale factors as vertex positions
      const centerY = (minY + maxY) / 2;
      const latScale = 111000;
      const lonScale = 111000 * Math.cos(centerY * Math.PI / 180);
      
      const dx = (hRight - hLeft) / (width * lonScale / RESOLUTION);
      const dy = (hDown - hUp) / (height * latScale / RESOLUTION);
      
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
  
  console.log('Generating triangle indices...');
  
  // Generate triangle indices only for triangles inside Seoul boundaries
  const indices = [];
  
  for (let row = 0; row < RESOLUTION - 1; row++) {
    for (let col = 0; col < RESOLUTION - 1; col++) {
      const topLeft = row * RESOLUTION + col;
      const topRight = topLeft + 1;
      const bottomLeft = (row + 1) * RESOLUTION + col;
      const bottomRight = bottomLeft + 1;
      
      // Check if vertices are inside Seoul
      const tlInside = insideMap[row][col];
      const trInside = insideMap[row][col + 1];
      const blInside = insideMap[row + 1][col];
      const brInside = insideMap[row + 1][col + 1];
      
      const insideCount = (tlInside ? 1 : 0) + (trInside ? 1 : 0) + 
                          (blInside ? 1 : 0) + (brInside ? 1 : 0);
      
      if (insideCount >= 3) {
        // Most of the quad is inside, include both triangles
        indices.push(topLeft, bottomLeft, topRight);
        indices.push(topRight, bottomLeft, bottomRight);
      } else if (insideCount === 2) {
        // Check which triangles to include
        if ((tlInside && blInside) || (tlInside && trInside) || (blInside && trInside)) {
          indices.push(topLeft, bottomLeft, topRight);
        }
        if ((trInside && blInside) || (trInside && brInside) || (blInside && brInside)) {
          indices.push(topRight, bottomLeft, bottomRight);
        }
      }
    }
  }
  
  console.log(`Generated ${indices.length / 3} triangles`);
  
  // Calculate center coordinates
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  
  // Create output data
  const meshData = {
    positions,
    normals,
    texCoords,
    colors,
    indices,
    metadata: {
      resolution: RESOLUTION,
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
      source: 'local_economy_dong.geojson'
    }
  };
  
  // Save to file
  console.log(`Saving to ${OUTPUT_FILE}...`);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(meshData));
  
  const fileSizeInMB = fs.statSync(OUTPUT_FILE).size / (1024 * 1024);
  console.log(`✅ Mesh data saved successfully (${fileSizeInMB.toFixed(2)} MB)`);
  console.log(`   - Resolution: ${RESOLUTION}x${RESOLUTION}`);
  console.log(`   - Vertices: ${vertexCount}`);
  console.log(`   - Triangles: ${indices.length / 3}`);
}

// Run the script
try {
  generateSeoulMesh();
} catch (error) {
  console.error('Error generating mesh:', error);
  process.exit(1);
}