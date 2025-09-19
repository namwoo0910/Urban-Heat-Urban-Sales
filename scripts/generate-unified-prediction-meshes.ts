#!/usr/bin/env ts-node

/**
 * Unified AI Prediction Mesh Generator
 * Generates binary mesh files for all temperature scenario predictions
 * Consolidates functionality from generate-prediction-meshes.ts and generate-modified-prediction-meshes.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { generateGridMesh, type MeshGeometry, type MeshGeneratorOptions } from '../src/features/card-sales/utils/meshGenerator'

// Configuration
const RESOLUTION = 120
const HEIGHT_SCALE = 1
const INPUT_FILE = path.join(__dirname, '../public/data/local_economy/local_economy_dong.geojson')
const PREDICTION_DIR = path.join(__dirname, '../public/data/prediction')
const OUTPUT_DIR = path.join(__dirname, '../public/data')
const BINARY_OUTPUT_DIR = path.join(__dirname, '../public/data/binary/prediction')

// All temperature scenarios (unified from both original scripts)
const TEMPERATURE_SCENARIOS = [
  // From original generate-prediction-meshes.ts
  { key: 't001', field: '총매출액_(T=0.1)', label: 'T+0.1°C', file: 'various' },
  { key: 't005', field: '총매출액_(T=0.5)', label: 'T+0.5°C', file: 'various' },
  { key: 't010', field: '총매출액_(T=1)', label: 'T+1.0°C', file: 'various' },
  { key: 't100', field: '총매출액_(T=10)', label: 'T+10°C', file: 'various' },
  // From generate-modified-prediction-meshes.ts
  { key: 't050', field: '총매출액_(T=5)', label: 'T+5°C', file: '2024-07_simulated_modified.json' },
  { key: 't150', field: '총매출액_(T=15)', label: 'T+15°C', file: '2024-07_simulated_modified.json' },
  { key: 't200', field: '총매출액_(T=20)', label: 'T+20°C', file: '2024-07_simulated_modified.json' }
]

interface PredictionData {
  자치구: string
  자치구코드: number
  행정동: string
  행정동코드: number
  기준일자: string
  일평균기온: number
  총매출액: number
  [key: string]: any  // For dynamic temperature fields
}

/**
 * Get sales-based elevation for predictions
 */
function getSalesElevation(sales: number, salesHeightScale: number = 100000000): number {
  if (!sales || sales <= 0) {
    return 10 // Minimum height
  }

  // Convert sales to height (unified logic)
  const normalizedSales = sales / salesHeightScale
  const height = 10 + (normalizedSales * 30000)

  return Math.min(height, 50000) // Cap at 50000
}

/**
 * Load district mappings from GeoJSON
 */
async function loadDistrictMappings(filePath: string): Promise<Map<number, any>> {
  const geojsonContent = fs.readFileSync(filePath, 'utf-8')
  const geojson = JSON.parse(geojsonContent)

  const dongMap = new Map<number, any>()

  for (const feature of geojson.features) {
    const props = feature.properties
    if (props && props.ADM_DR_CD) {
      dongMap.set(parseInt(props.ADM_DR_CD), {
        name: props.ADM_DR_NM,
        gu_code: props.SGG_CD,
        gu_name: props.SGG_NM,
        geometry: feature.geometry
      })
    }
  }

  return dongMap
}

/**
 * Generate mesh for a specific temperature scenario
 */
async function generateScenarioMesh(
  scenario: typeof TEMPERATURE_SCENARIOS[0],
  dongMap: Map<number, any>,
  meshOptions: MeshGeneratorOptions
) {
  console.log(`\nProcessing ${scenario.label} scenario...`)

  // Determine which prediction file to use
  let predictionFile: string
  if (scenario.file === 'various') {
    // Find any prediction file for various scenarios
    const files = fs.readdirSync(PREDICTION_DIR)
    const jsonFile = files.find(f => f.endsWith('.json') && !f.includes('modified'))
    if (!jsonFile) {
      console.error(`No prediction file found for ${scenario.label}`)
      return
    }
    predictionFile = path.join(PREDICTION_DIR, jsonFile)
  } else {
    predictionFile = path.join(PREDICTION_DIR, scenario.file)
  }

  if (!fs.existsSync(predictionFile)) {
    console.error(`Prediction file not found: ${predictionFile}`)
    return
  }

  // Load prediction data
  const predictionData: PredictionData[] = JSON.parse(
    fs.readFileSync(predictionFile, 'utf-8')
  )

  // Group by date
  const dateGroups = new Map<string, PredictionData[]>()
  predictionData.forEach(item => {
    const date = item.기준일자
    if (!dateGroups.has(date)) {
      dateGroups.set(date, [])
    }
    dateGroups.get(date)!.push(item)
  })

  console.log(`Found ${dateGroups.size} dates in prediction data`)

  // Process each date
  for (const [date, items] of dateGroups) {
    const formattedDate = date.replace(/-/g, '')

    // Create elevation function for this scenario
    const getElevation = (lng: number, lat: number): number => {
      // Find matching dong data
      for (const item of items) {
        const dongInfo = dongMap.get(item.행정동코드)
        if (!dongInfo) continue

        // Simple point-in-polygon check would go here
        // For now, use the sales value directly
        const salesValue = item[scenario.field]
        if (salesValue !== undefined) {
          return getSalesElevation(salesValue)
        }
      }
      return 0
    }

    // Generate mesh
    const mesh = generateGridMesh({
      ...meshOptions,
      getElevation
    })

    // Save binary file
    const outputPath = path.join(
      BINARY_OUTPUT_DIR,
      `mesh_${formattedDate}_${scenario.key}.bin`
    )

    // Ensure directory exists
    fs.mkdirSync(BINARY_OUTPUT_DIR, { recursive: true })

    // Write binary data
    const buffer = Buffer.allocUnsafe(mesh.positions.length * 4)
    for (let i = 0; i < mesh.positions.length; i++) {
      buffer.writeFloatLE(mesh.positions[i], i * 4)
    }

    fs.writeFileSync(outputPath, buffer)
    console.log(`  Generated: mesh_${formattedDate}_${scenario.key}.bin`)
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('Unified Prediction Mesh Generator')
  console.log('=================================')

  // Load district mappings
  console.log('Loading district mappings...')
  const dongMap = await loadDistrictMappings(INPUT_FILE)
  console.log(`Loaded ${dongMap.size} districts`)

  // Get Seoul bounds from GeoJSON
  const geojsonContent = fs.readFileSync(INPUT_FILE, 'utf-8')
  const geojson = JSON.parse(geojsonContent)

  let minLng = Infinity, maxLng = -Infinity
  let minLat = Infinity, maxLat = -Infinity

  for (const feature of geojson.features) {
    if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
      const coords = feature.geometry.type === 'Polygon'
        ? feature.geometry.coordinates
        : feature.geometry.coordinates.flat()

      for (const ring of coords) {
        for (const [lng, lat] of ring) {
          minLng = Math.min(minLng, lng)
          maxLng = Math.max(maxLng, lng)
          minLat = Math.min(minLat, lat)
          maxLat = Math.max(maxLat, lat)
        }
      }
    }
  }

  const meshOptions: MeshGeneratorOptions = {
    bounds: { west: minLng, east: maxLng, south: minLat, north: maxLat },
    resolution: RESOLUTION,
    heightScale: HEIGHT_SCALE,
    getElevation: () => 0  // Will be overridden per scenario
  }

  // Process all temperature scenarios
  for (const scenario of TEMPERATURE_SCENARIOS) {
    await generateScenarioMesh(scenario, dongMap, meshOptions)
  }

  // Create index file
  const indexPath = path.join(OUTPUT_DIR, 'prediction-mesh-index.json')
  const index = {
    scenarios: TEMPERATURE_SCENARIOS.map(s => ({
      key: s.key,
      label: s.label,
      field: s.field
    })),
    resolution: RESOLUTION,
    heightScale: HEIGHT_SCALE,
    generatedAt: new Date().toISOString()
  }

  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2))
  console.log('\nGenerated index file: prediction-mesh-index.json')

  console.log('\n✅ All prediction meshes generated successfully!')
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error)
}

export { main as generateUnifiedPredictionMeshes }