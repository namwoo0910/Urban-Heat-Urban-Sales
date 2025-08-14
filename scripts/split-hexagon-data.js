/**
 * Script to split large hexagon data into smaller geographic chunks
 * This improves loading performance by allowing lazy loading based on viewport
 */

const fs = require('fs');
const path = require('path');

// Seoul geographic bounds for data chunking
const SEOUL_BOUNDS = {
  north: 37.7,
  south: 37.4,
  east: 127.2,
  west: 126.7
};

// Grid configuration - 4x4 grid creates 16 chunks of ~8K points each
const GRID_SIZE = 4;
const CHUNK_SIZE = Math.round(132800 / (GRID_SIZE * GRID_SIZE)); // ~8300 points per chunk

function calculateGrid(lat, lng) {
  const latStep = (SEOUL_BOUNDS.north - SEOUL_BOUNDS.south) / GRID_SIZE;
  const lngStep = (SEOUL_BOUNDS.east - SEOUL_BOUNDS.west) / GRID_SIZE;
  
  const gridX = Math.floor((lng - SEOUL_BOUNDS.west) / lngStep);
  const gridY = Math.floor((lat - SEOUL_BOUNDS.south) / latStep);
  
  // Ensure grid coordinates are within bounds
  const x = Math.max(0, Math.min(GRID_SIZE - 1, gridX));
  const y = Math.max(0, Math.min(GRID_SIZE - 1, gridY));
  
  return { x, y };
}

function splitHexagonData() {
  console.log('Starting hexagon data splitting...');
  
  // Read the original data
  const inputPath = path.join(__dirname, '../public/dummy-hexagon-data.json');
  const outputDir = path.join(__dirname, '../public/hexagon-chunks');
  
  if (!fs.existsSync(inputPath)) {
    console.error('Input file not found:', inputPath);
    return;
  }
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log('Reading data file...');
  const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  console.log(`Loaded ${data.length} data points`);
  
  // Initialize grid chunks
  const chunks = {};
  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      chunks[`${x}_${y}`] = {
        data: [],
        bounds: {
          north: SEOUL_BOUNDS.south + (y + 1) * (SEOUL_BOUNDS.north - SEOUL_BOUNDS.south) / GRID_SIZE,
          south: SEOUL_BOUNDS.south + y * (SEOUL_BOUNDS.north - SEOUL_BOUNDS.south) / GRID_SIZE,
          east: SEOUL_BOUNDS.west + (x + 1) * (SEOUL_BOUNDS.east - SEOUL_BOUNDS.west) / GRID_SIZE,
          west: SEOUL_BOUNDS.west + x * (SEOUL_BOUNDS.east - SEOUL_BOUNDS.west) / GRID_SIZE
        }
      };
    }
  }
  
  // Distribute data points to chunks
  console.log('Distributing data points to grid chunks...');
  data.forEach((point, index) => {
    if (index % 10000 === 0) {
      console.log(`Processed ${index} points...`);
    }
    
    const [lng, lat] = point.coordinates;
    const { x, y } = calculateGrid(lat, lng);
    const chunkKey = `${x}_${y}`;
    
    chunks[chunkKey].data.push(point);
  });
  
  // Write chunks to files
  console.log('Writing chunk files...');
  const chunkIndex = {
    gridSize: GRID_SIZE,
    totalPoints: data.length,
    chunks: {}
  };
  
  Object.keys(chunks).forEach(chunkKey => {
    const chunk = chunks[chunkKey];
    const chunkFilename = `chunk-${chunkKey}.json`;
    const chunkPath = path.join(outputDir, chunkFilename);
    
    // Write chunk data
    fs.writeFileSync(chunkPath, JSON.stringify(chunk.data, null, 0));
    
    // Update index
    chunkIndex.chunks[chunkKey] = {
      filename: chunkFilename,
      bounds: chunk.bounds,
      pointCount: chunk.data.length,
      sizeKB: Math.round(fs.statSync(chunkPath).size / 1024)
    };
    
    console.log(`Chunk ${chunkKey}: ${chunk.data.length} points (${chunkIndex.chunks[chunkKey].sizeKB}KB)`);
  });
  
  // Write chunk index
  const indexPath = path.join(outputDir, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(chunkIndex, null, 2));
  
  console.log('Splitting complete!');
  console.log(`Created ${Object.keys(chunks).length} chunks`);
  console.log(`Total original size: ${Math.round(fs.statSync(inputPath).size / 1024 / 1024 * 100) / 100}MB`);
  
  const totalChunkSize = Object.values(chunkIndex.chunks).reduce((sum, chunk) => sum + chunk.sizeKB, 0);
  console.log(`Total chunk size: ${Math.round(totalChunkSize / 1024 * 100) / 100}MB`);
  console.log(`Index file: ${Math.round(fs.statSync(indexPath).size / 1024)}KB`);
}

if (require.main === module) {
  splitHexagonData();
}

module.exports = { splitHexagonData };