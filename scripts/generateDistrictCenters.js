const fs = require('fs');
const path = require('path');

// Calculate center point of a GeoJSON feature
function calculateFeatureCenter(feature) {
  if (!feature?.geometry) return null;
  
  const { geometry } = feature;
  let coordinates = [];
  
  // Extract coordinates based on geometry type
  if (geometry.type === 'Polygon') {
    coordinates = geometry.coordinates[0];
  } else if (geometry.type === 'MultiPolygon') {
    // Flatten all polygons
    geometry.coordinates.forEach((polygon) => {
      coordinates = [...coordinates, ...polygon[0]];
    });
  }
  
  if (coordinates.length === 0) return null;
  
  // Calculate average of all points
  const sumLon = coordinates.reduce((sum, coord) => sum + coord[0], 0);
  const sumLat = coordinates.reduce((sum, coord) => sum + coord[1], 0);
  
  return [
    parseFloat((sumLon / coordinates.length).toFixed(6)),
    parseFloat((sumLat / coordinates.length).toFixed(6))
  ];
}

// Process GeoJSON file and extract centers
function processGeoJSON(filePath, nameFields) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const centers = {};
    
    if (!data.features) {
      console.error(`No features found in ${filePath}`);
      return centers;
    }
    
    data.features.forEach(feature => {
      // Try different name fields
      let name = null;
      for (const field of nameFields) {
        if (feature.properties?.[field]) {
          name = feature.properties[field];
          break;
        }
      }
      
      if (!name) {
        console.warn('No name found for feature:', feature.properties);
        return;
      }
      
      const center = calculateFeatureCenter(feature);
      if (center) {
        centers[name] = center;
      }
    });
    
    return centers;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return {};
  }
}

// Main function
async function generateDistrictCenters() {
  console.log('Generating district centers...');
  
  // Paths to GeoJSON files
  const guPath = path.join(__dirname, '../public/data/eda/gu.geojson');
  const dongPath = path.join(__dirname, '../public/data/eda/dong.geojson');
  
  // Process 구 (districts)
  console.log('Processing 구 data...');
  const guCenters = processGeoJSON(guPath, ['SIGUNGU_NM', 'SIG_KOR_NM', 'GU_NM', 'nm']);
  console.log(`Found ${Object.keys(guCenters).length} 구 centers`);
  
  // Process 동 (neighborhoods)
  console.log('Processing 동 data...');
  const dongCenters = processGeoJSON(dongPath, ['ADM_NM', 'H_DONG_NM', 'DONG_NM', 'ADM_DR_NM', 'nm']);
  console.log(`Found ${Object.keys(dongCenters).length} 동 centers`);
  
  // Generate TypeScript file content
  const tsContent = `// Auto-generated district center coordinates
// Generated on: ${new Date().toISOString()}
// Do not edit manually - regenerate using scripts/generateDistrictCenters.js

export interface DistrictCenters {
  구: Record<string, [number, number]>;
  동: Record<string, [number, number]>;
}

export const DISTRICT_CENTERS: DistrictCenters = {
  구: ${JSON.stringify(guCenters, null, 4).replace(/"/g, '"')},
  동: ${JSON.stringify(dongCenters, null, 4).replace(/"/g, '"')}
};

// Helper function to get district center
export function getDistrictCenter(type: '구' | '동', name: string): [number, number] | null {
  return DISTRICT_CENTERS[type][name] || null;
}

// Get all district names
export function getAllDistrictNames(type: '구' | '동'): string[] {
  return Object.keys(DISTRICT_CENTERS[type]);
}
`;
  
  // Write to file
  const outputPath = path.join(__dirname, '../src/features/card-sales/data/districtCenters.ts');
  const outputDir = path.dirname(outputPath);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, tsContent);
  console.log(`\nDistrict centers saved to: ${outputPath}`);
  console.log(`Total: ${Object.keys(guCenters).length} 구, ${Object.keys(dongCenters).length} 동`);
  
  // Print sample for verification
  console.log('\nSample centers:');
  const guSample = Object.entries(guCenters).slice(0, 3);
  guSample.forEach(([name, center]) => {
    console.log(`  구: ${name} -> [${center[0]}, ${center[1]}]`);
  });
  const dongSample = Object.entries(dongCenters).slice(0, 3);
  dongSample.forEach(([name, center]) => {
    console.log(`  동: ${name} -> [${center[0]}, ${center[1]}]`);
  });
}

// Run the script
generateDistrictCenters().catch(console.error);