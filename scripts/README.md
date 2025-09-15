# Scripts Directory

## Active Scripts

### Data Generation Scripts

#### `generate-mesh.ts`
Main mesh generation script for Seoul district visualization.
- Generates 3D mesh data from GeoJSON boundaries
- Creates both JSON and binary formats
- Usage: `tsx scripts/generate-mesh.ts`

#### `generate-all-months.ts`
Generates mesh data for all months in a year.
- Processes monthly card sales data
- Creates mesh files for each month (seoul-mesh-YYYYMM.json)
- Usage: `tsx scripts/generate-all-months.ts --year 2024`

#### `generate-all-days.ts`
Generates daily mesh data for visualization.
- Processes daily card sales data
- Creates binary format for efficient loading
- Usage: `tsx scripts/generate-all-days.ts --year 2024 --binaryOnly true`

### Utility Scripts

#### `convertMeshToBinary.js`
Converts JSON mesh files to binary format for improved performance.
- Reduces file size by ~70%
- Creates .bin and .header.json files
- Usage: `node scripts/convertMeshToBinary.js <input.json>`

#### `build-temperature-index.ts`
Builds temperature index for weather-based visualizations.
- Processes temperature data for color mapping
- Creates index for quick temperature lookups
- Usage: `tsx scripts/build-temperature-index.ts`

## Deprecated Scripts

Unused and duplicate scripts have been moved to `deprecated/` folder for archival purposes.
These scripts were used during initial development but are no longer needed:

- One-time data generation scripts (district centers, code mappings)
- Previous versions of mesh generation scripts (v1, v2, balanced)
- Obsolete optimization scripts

## Notes

- All active scripts use TypeScript for better type safety
- Binary format is preferred for production due to performance benefits
- Run scripts from the project root directory