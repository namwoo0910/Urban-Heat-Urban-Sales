/**
 * Web Worker for Dong Boundary Gradient Interpolation
 * Performs heavy gradient calculations in a background thread
 */

// Configuration - Optimized for memory efficiency
const MAX_DISTANCE_DEGREES = 0.01; // ~1km radius limit (reduced from 2km)
const BATCH_SIZE = 20; // Process 20 dongs at a time (increased with spatial index)
const DELAY_BETWEEN_BATCHES = 50; // 50ms delay between batches for memory cleanup

// Message handler
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  if (type === 'PROCESS_GRADIENT') {
    const { dongData, dongBoundaries, gridCells, cellDongMapping, config, timeKey } = data;
    processGradientWithSpatialIndex(dongData, dongBoundaries, gridCells, cellDongMapping, config, timeKey);
  }
};

function processGradientWithSpatialIndex(dongDataArray, dongBoundaries, gridCells, cellDongMappingArray, config, timeKey) {
  const startTime = performance.now();
  const dongData = new Map(dongDataArray);
  const cellDongMapping = new Map(cellDongMappingArray);
  
  // Create dong lookup map
  const dongLookup = new Map();
  dongBoundaries.forEach(boundary => {
    dongLookup.set(boundary.adm_cd, boundary);
  });
  
  // Initialize result
  const gridData = {};
  gridData[timeKey] = {};
  
  // Initialize all cells to 0
  gridCells.forEach(cell => {
    gridData[timeKey][cell.grid_id.toString()] = 0;
  });
  
  // Process cells using spatial index
  let processedCells = 0;
  const totalCells = cellDongMapping.size;
  
  cellDongMapping.forEach((dongCodes, cellId) => {
    const cell = gridCells.find(c => c.grid_id === cellId);
    if (!cell) return;
    
    // For each cell, only check the dongs it potentially overlaps with
    dongCodes.forEach(dongCode => {
      const centerValue = dongData.get(dongCode);
      if (!centerValue || centerValue < 1000000) return; // Skip low values
      
      const dongBoundary = dongLookup.get(dongCode);
      if (!dongBoundary) return;
      
      // Calculate centroid
      const centroid = calculateCentroid(dongBoundary.geometry);
      if (!centroid) return;
      
      // Check if point is actually inside the simplified polygon
      if (isPointInPolygon(cell.center, dongBoundary.geometry)) {
        const dx = centroid[0] - cell.center[0];
        const dy = centroid[1] - cell.center[1];
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Apply gradient interpolation
        let interpolatedValue;
        const ratio = Math.min(1, distance / MAX_DISTANCE_DEGREES);
        
        switch (config.interpolationType) {
          case 'linear':
            interpolatedValue = centerValue + (config.boundaryHeight - centerValue) * ratio;
            break;
          case 'exponential':
            const expRatio = ratio * ratio;
            interpolatedValue = centerValue + (config.boundaryHeight - centerValue) * expRatio;
            break;
          case 'logarithmic':
            const logRatio = Math.sqrt(ratio);
            interpolatedValue = centerValue + (config.boundaryHeight - centerValue) * logRatio;
            break;
          case 'smooth':
          default:
            const smoothRatio = ratio * ratio * (3.0 - 2.0 * ratio);
            interpolatedValue = centerValue + (config.boundaryHeight - centerValue) * smoothRatio;
            break;
        }
        
        // Take maximum value if multiple dongs affect this cell
        const currentValue = gridData[timeKey][cell.grid_id.toString()] || 0;
        gridData[timeKey][cell.grid_id.toString()] = Math.max(currentValue, interpolatedValue);
      }
    });
    
    processedCells++;
    
    // Report progress periodically
    if (processedCells % 100 === 0 || processedCells === totalCells) {
      const progress = (processedCells / totalCells) * 100;
      self.postMessage({
        type: 'PROGRESS',
        data: {
          progress: progress,
          processedCells: processedCells,
          totalCells: totalCells
        }
      });
    }
  });
  
  // Apply smoothing if enabled
  if (config.enableSmoothing && config.smoothingSigma > 0) {
    applySimpleSmoothing(gridData[timeKey], gridCells, config);
  }
  
  const elapsedTime = performance.now() - startTime;
  
  // Send final result
  self.postMessage({
    type: 'COMPLETE',
    data: {
      gridData: gridData,
      elapsedTime: elapsedTime,
      processedCells: processedCells
    }
  });
}

// Keep the old function for fallback
function processGradient(dongDataArray, dongBoundaries, gridCells, config, timeKey) {
  const startTime = performance.now();
  const dongData = new Map(dongDataArray); // Convert array back to Map
  
  // Initialize result
  const gridData = {};
  gridData[timeKey] = {};
  
  // Initialize all cells to 0
  gridCells.forEach(cell => {
    gridData[timeKey][cell.grid_id.toString()] = 0;
  });
  
  // Process dongs in small batches with delays
  const dongEntries = Array.from(dongData.entries());
  const totalDongs = dongEntries.length;
  let processedDongs = 0;
  
  // Process function with async delay
  async function processBatches() {
    for (let batchStart = 0; batchStart < totalDongs; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, totalDongs);
    const batch = dongEntries.slice(batchStart, batchEnd);
    
    // Process each dong in the batch
    batch.forEach(([admCd, centerValue]) => {
      processSingleDong(
        admCd,
        centerValue,
        dongBoundaries,
        gridCells,
        gridData[timeKey],
        config
      );
      processedDongs++;
    });
    
    // Report progress
    const progress = (processedDongs / totalDongs) * 100;
    self.postMessage({
      type: 'PROGRESS',
      data: {
        progress: progress,
        processedDongs: processedDongs,
        totalDongs: totalDongs
      }
    });
    
    // Delay and garbage collection between batches
    if (batchEnd < totalDongs) {
      // Force garbage collection if available
      if (self.gc) {
        self.gc();
      }
      // Add delay to allow memory cleanup
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  }
  }
  
  // Start async processing
  processBatches().then(() => {
  
    // Apply smoothing if enabled
    if (config.enableSmoothing && config.smoothingSigma > 0) {
      applySimpleSmoothing(gridData[timeKey], gridCells, config);
    }
    
    const elapsedTime = performance.now() - startTime;
    
    // Clean up memory before sending result
    dongData = null;
    dongBoundaries = null;
    
    // Send final result
    self.postMessage({
      type: 'COMPLETE',
      data: {
        gridData: gridData,
        elapsedTime: elapsedTime,
        totalDongs: totalDongs
      }
    });
  }).catch(error => {
    self.postMessage({
      type: 'ERROR',
      data: {
        error: error.message || 'Processing failed'
      }
    });
  });
}

function processSingleDong(admCd, centerValue, dongBoundaries, gridCells, gridDataTime, config) {
  // Find dong boundary
  const dongBoundary = dongBoundaries.find(d => d.adm_cd === admCd);
  if (!dongBoundary || !dongBoundary.geometry) return;
  
  // Calculate centroid
  const centroid = calculateCentroid(dongBoundary.geometry);
  if (!centroid) return;
  
  // Early exit for low values to save memory
  if (centerValue < 1000000) { // Skip dongs with sales < 1M
    return;
  }
  
  // Find cells within dong (with strict distance limit)
  const cellsInDong = [];
  const maxDistanceSq = MAX_DISTANCE_DEGREES * MAX_DISTANCE_DEGREES;
  
  gridCells.forEach(cell => {
    const [x, y] = cell.center;
    
    // Quick distance check (squared to avoid sqrt)
    const dx = centroid[0] - x;
    const dy = centroid[1] - y;
    const distanceSq = dx * dx + dy * dy;
    
    if (distanceSq > maxDistanceSq) return;
    
    // Check if point is inside polygon
    if (isPointInPolygon(cell.center, dongBoundary.geometry)) {
      const distance = Math.sqrt(distanceSq);
      cellsInDong.push({ cell, distance });
    }
  });
  
  if (cellsInDong.length === 0) {
    // Find nearest cell if none inside
    let nearestCell = null;
    let minDist = Infinity;
    
    gridCells.forEach(cell => {
      const dx = centroid[0] - cell.center[0];
      const dy = centroid[1] - cell.center[1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < minDist && dist <= MAX_DISTANCE_DEGREES) {
        minDist = dist;
        nearestCell = cell;
      }
    });
    
    if (nearestCell) {
      cellsInDong.push({ cell: nearestCell, distance: minDist });
    }
  }
  
  // Calculate max distance for normalization
  const maxDistance = Math.max(...cellsInDong.map(c => c.distance));
  if (maxDistance === 0) return;
  
  // Apply gradient interpolation
  cellsInDong.forEach(({ cell, distance }) => {
    const ratio = distance / maxDistance;
    let interpolatedValue;
    
    switch (config.interpolationType) {
      case 'linear':
        interpolatedValue = centerValue + (config.boundaryHeight - centerValue) * ratio;
        break;
      case 'exponential':
        const expRatio = ratio * ratio;
        interpolatedValue = centerValue + (config.boundaryHeight - centerValue) * expRatio;
        break;
      case 'logarithmic':
        const logRatio = Math.sqrt(ratio);
        interpolatedValue = centerValue + (config.boundaryHeight - centerValue) * logRatio;
        break;
      case 'smooth':
      default:
        // Smoothstep function for smooth S-curve
        const smoothRatio = ratio * ratio * (3.0 - 2.0 * ratio);
        interpolatedValue = centerValue + (config.boundaryHeight - centerValue) * smoothRatio;
        break;
    }
    
    if (interpolatedValue > 0) {
      gridDataTime[cell.grid_id.toString()] = interpolatedValue;
    }
  });
}

function calculateCentroid(geometry) {
  if (geometry.type === 'Polygon') {
    const coords = geometry.coordinates[0];
    let x = 0, y = 0;
    const len = coords.length - 1; // Exclude closing point
    
    for (let i = 0; i < len; i++) {
      x += coords[i][0];
      y += coords[i][1];
    }
    
    return [x / len, y / len];
  } else if (geometry.type === 'MultiPolygon') {
    // Use first polygon's centroid
    return calculateCentroid({ type: 'Polygon', coordinates: geometry.coordinates[0] });
  }
  
  return null;
}

function isPointInPolygon(point, geometry) {
  const [x, y] = point;
  
  if (geometry.type === 'Polygon') {
    return isPointInRing(x, y, geometry.coordinates[0]);
  } else if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some(polygon => 
      isPointInRing(x, y, polygon[0])
    );
  }
  
  return false;
}

function isPointInRing(x, y, ring) {
  let inside = false;
  const n = ring.length - 1; // Exclude closing point
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  
  return inside;
}

function applySimpleSmoothing(gridDataTime, gridCells, config) {
  // Simple 3x3 box blur for performance
  const cellMap = new Map();
  gridCells.forEach(cell => {
    cellMap.set(`${cell.row}_${cell.col}`, cell);
  });
  
  const smoothed = {};
  
  gridCells.forEach(cell => {
    const value = gridDataTime[cell.grid_id.toString()] || 0;
    if (value === 0) return;
    
    // Get neighboring cells
    let sum = value * 4; // Center weight
    let count = 4;
    
    const neighbors = [
      [-1, 0], [1, 0], [0, -1], [0, 1], // Direct neighbors
      [-1, -1], [-1, 1], [1, -1], [1, 1] // Diagonal neighbors
    ];
    
    neighbors.forEach(([dr, dc]) => {
      const neighborKey = `${cell.row + dr}_${cell.col + dc}`;
      const neighbor = cellMap.get(neighborKey);
      
      if (neighbor) {
        const neighborValue = gridDataTime[neighbor.grid_id.toString()] || 0;
        sum += neighborValue;
        count++;
      }
    });
    
    smoothed[cell.grid_id.toString()] = sum / count;
  });
  
  // Apply smoothed values
  Object.assign(gridDataTime, smoothed);
}

// Send ready message
self.postMessage({ type: 'READY' });