// Web Worker for GeoJSON parsing
// This file will be used as a worker script

interface WorkerMessage {
  type: 'parse' | 'filter' | 'simplify';
  data: any;
  id: string;
}

interface WorkerResponse {
  type: 'result' | 'error';
  data: any;
  id: string;
}

// Parse large GeoJSON in chunks to avoid blocking
function parseGeoJSON(jsonString: string): any {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error(`Failed to parse GeoJSON: ${error}`);
  }
}

// Filter features based on viewport bounds
function filterByBounds(geojson: any, bounds: [[number, number], [number, number]]): any {
  if (!geojson.features) return geojson;
  
  const [minLng, minLat] = bounds[0];
  const [maxLng, maxLat] = bounds[1];
  
  const filtered = {
    ...geojson,
    features: geojson.features.filter((feature: any) => {
      if (!feature.geometry || !feature.geometry.coordinates) return false;
      
      // Simple bounding box check (can be optimized further)
      const coords = feature.geometry.coordinates;
      return checkCoordinatesInBounds(coords, minLng, minLat, maxLng, maxLat);
    })
  };
  
  return filtered;
}

function checkCoordinatesInBounds(
  coords: any,
  minLng: number,
  minLat: number,
  maxLng: number,
  maxLat: number
): boolean {
  if (Array.isArray(coords[0])) {
    // Nested coordinates
    return coords.some((c: any) => checkCoordinatesInBounds(c, minLng, minLat, maxLng, maxLat));
  } else if (coords.length === 2) {
    // Single coordinate pair
    const [lng, lat] = coords;
    return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
  }
  return false;
}

// Handle messages from main thread
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { type, data, id } = event.data;
  
  try {
    let result;
    
    switch (type) {
      case 'parse':
        result = parseGeoJSON(data);
        break;
        
      case 'filter':
        result = filterByBounds(data.geojson, data.bounds);
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
    
    const response: WorkerResponse = {
      type: 'result',
      data: result,
      id
    };
    
    self.postMessage(response);
  } catch (error) {
    const response: WorkerResponse = {
      type: 'error',
      data: error instanceof Error ? error.message : 'Unknown error',
      id
    };
    
    self.postMessage(response);
  }
});

export {};