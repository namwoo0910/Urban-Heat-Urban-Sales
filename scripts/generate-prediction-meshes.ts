#!/usr/bin/env ts-node

/**
 * AI Prediction Mesh Generator
 * Generates binary mesh files for temperature scenario predictions
 * Creates separate files for each day and temperature scenario
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

// Temperature scenarios
const TEMPERATURE_SCENARIOS = [
  { key: 't001', field: '총매출액_(T=0.1)', label: 'T+0.1°C' },
  { key: 't005', field: '총매출액_(T=0.5)', label: 'T+0.5°C' },
  { key: 't010', field: '총매출액_(T=1)', label: 'T+1.0°C' },
  { key: 't100', field: '총매출액_(T=10)', label: 'T+10°C' }
]

interface PredictionData {
  자치구: string
  자치구코드: number
  행정동: string
  행정동코드: number
  기준일자: string
  일평균기온: number
  총매출액: number
  '총매출액_(T=0.1)': number
  '총매출액_(T=0.5)': number
  '총매출액_(T=1)': number
  '총매출액_(T=10)': number
}

/**
 * Get sales-based elevation for predictions
 */
function getSalesElevation(sales: number, salesHeightScale: number = 100000000): number {
  if (!sales || sales <= 0) {
    return 10 // Minimum height
  }

  // Convert sales to height (same as existing logic)
  const heightPerWon = 1500 / salesHeightScale
  return Math.max(10, sales * heightPerWon)
}

/**
 * Load district GeoJSON data
 */
function loadDistrictData(): any[] {
  console.log('Loading GeoJSON data...')

  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(`District file not found: ${INPUT_FILE}`)
  }

  const geoJsonData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'))

  if (!geoJsonData.features || !Array.isArray(geoJsonData.features)) {
    throw new Error('Invalid GeoJSON format - missing features array')
  }

  console.log(`Loaded ${geoJsonData.features.length} features`)

  return geoJsonData.features
}

/**
 * Load prediction data for a specific date and temperature scenario
 */
function loadPredictionDataForDate(
  predictions: PredictionData[],
  date: string,
  temperatureField: string
): Map<number, number> {
  const dongSalesMap = new Map<number, number>()
  let maxSales = 0
  let minSales = Infinity
  let totalRecords = 0

  predictions
    .filter(d => d.기준일자 === date)
    .forEach(d => {
      const sales = d[temperatureField as keyof PredictionData] as number || 0
      dongSalesMap.set(d.행정동코드, sales)
      maxSales = Math.max(maxSales, sales)
      if (sales > 0) minSales = Math.min(minSales, sales)
      totalRecords++
    })

  console.log(`  Date: ${date}, Scenario: ${temperatureField}`)
  console.log(`  Found ${dongSalesMap.size} dongs with ${totalRecords} records`)
  console.log(`  Sales range: ${minSales.toLocaleString()} - ${maxSales.toLocaleString()} KRW`)

  return dongSalesMap
}

/**
 * Convert JSON mesh to binary format
 */
function convertToBinary(
  meshData: MeshGeometry,
  dateCode: string,
  scenario: string,
  metadata: any
): string {
  // Create binary directory if it doesn't exist
  if (!fs.existsSync(BINARY_OUTPUT_DIR)) {
    fs.mkdirSync(BINARY_OUTPUT_DIR, { recursive: true })
  }

  // Calculate bounds for metadata
  const positions = meshData.positions
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  for (let i = 0; i < positions.length; i += 3) {
    minX = Math.min(minX, positions[i])
    maxX = Math.max(maxX, positions[i])
    minY = Math.min(minY, positions[i + 1])
    maxY = Math.max(maxY, positions[i + 1])
  }

  // Create header (now includes colors)
  const header = {
    format: 'seoul-mesh-binary',
    version: '1.1',
    type: 'prediction',
    scenario: scenario,
    date: dateCode,
    resolution: RESOLUTION,
    vertices: meshData.positions.length / 3,
    triangles: meshData.indices ? meshData.indices.length / 3 : 0,
    positionsBytes: meshData.positions.byteLength,
    normalsBytes: meshData.normals.byteLength,
    texCoordsBytes: meshData.texCoords.byteLength,
    colorsBytes: meshData.colors?.byteLength || 0,  // Add colors byte length
    indicesBytes: meshData.indices?.byteLength || 0,
    bounds: {
      minX: minX,
      minY: minY,
      maxX: maxX,
      maxY: maxY
    },
    center: meshData.metadata?.center,
    generated: new Date().toISOString(),
    ...metadata
  }

  // Save header as separate JSON file
  const outputFile = path.join(BINARY_OUTPUT_DIR, `seoul-mesh-pred-${dateCode}-${scenario}.bin`)
  const headerFile = path.join(BINARY_OUTPUT_DIR, `seoul-mesh-pred-${dateCode}-${scenario}.header.json`)

  fs.writeFileSync(headerFile, JSON.stringify(header, null, 2))

  // Create binary buffer (now includes colors)
  const totalSize =
    meshData.positions.byteLength +
    meshData.normals.byteLength +
    meshData.texCoords.byteLength +
    (meshData.colors?.byteLength || 0) +  // Include colors in total size
    (meshData.indices?.byteLength || 0)

  const buffer = Buffer.allocUnsafe(totalSize)
  let offset = 0

  // Write positions
  Buffer.from(meshData.positions.buffer).copy(buffer, offset)
  offset += meshData.positions.byteLength

  // Write normals
  Buffer.from(meshData.normals.buffer).copy(buffer, offset)
  offset += meshData.normals.byteLength

  // Write texCoords
  Buffer.from(meshData.texCoords.buffer).copy(buffer, offset)
  offset += meshData.texCoords.byteLength

  // Write colors
  if (meshData.colors) {
    Buffer.from(meshData.colors.buffer).copy(buffer, offset)
    offset += meshData.colors.byteLength
  }

  // Write indices
  if (meshData.indices) {
    Buffer.from(meshData.indices.buffer).copy(buffer, offset)
  }

  // Write binary file
  fs.writeFileSync(outputFile, buffer)

  const fileSizeMB = (buffer.byteLength / 1024 / 1024).toFixed(2)
  console.log(`  ✅ Binary saved: ${path.basename(outputFile)} (${fileSizeMB} MB)`)

  return outputFile
}

/**
 * Generate mesh for a specific date and temperature scenario
 */
function generatePredictionMesh(
  districtFeatures: any[],
  dongSalesMap: Map<number, number>,
  dateCode: string,
  scenarioKey: string,
  scenarioLabel: string
): void {
  console.log(`\nGenerating mesh for ${dateCode} - ${scenarioLabel}`)

  const options: MeshGeneratorOptions = {
    resolution: RESOLUTION,
    heightScale: HEIGHT_SCALE,
    wireframe: false,
    smoothing: false,
    dongBoundaries: districtFeatures,
    dongSalesMap: dongSalesMap,
    salesHeightScale: 100000000
  }

  const meshData = generateGridMesh(districtFeatures, options)

  if (!meshData) {
    console.error('Failed to generate mesh')
    return
  }

  // Calculate average sales and impact
  let totalSales = 0
  let count = 0
  dongSalesMap.forEach(sales => {
    if (sales > 0) {
      totalSales += sales
      count++
    }
  })
  const averageSales = count > 0 ? totalSales / count : 0

  // Convert to binary and save
  convertToBinary(meshData, dateCode, scenarioKey, {
    temperatureScenario: scenarioLabel,
    averageSales: averageSales,
    totalDongs: dongSalesMap.size
  })
}

/**
 * Process weekly predictions (7 days)
 */
async function processWeeklyPredictions(districtFeatures: any[]): Promise<void> {
  console.log('\n========================================')
  console.log('Processing WEEKLY Predictions (7 days)')
  console.log('========================================')

  const weeklyFile = path.join(PREDICTION_DIR, '2024-07_simulated_week.json')

  if (!fs.existsSync(weeklyFile)) {
    console.error(`Weekly prediction file not found: ${weeklyFile}`)
    return
  }

  const predictions: PredictionData[] = JSON.parse(fs.readFileSync(weeklyFile, 'utf8'))
  console.log(`Loaded ${predictions.length} weekly prediction records`)

  // Get unique dates
  const dates = [...new Set(predictions.map(p => p.기준일자))].sort()
  console.log(`Found ${dates.length} unique dates: ${dates.join(', ')}`)

  let generatedCount = 0

  // Process each date
  for (const date of dates) {
    const dateCode = date.replace(/-/g, '') // 2024-07-01 -> 20240701

    // Process each temperature scenario
    for (const scenario of TEMPERATURE_SCENARIOS) {
      const dongSalesMap = loadPredictionDataForDate(predictions, date, scenario.field)
      generatePredictionMesh(
        districtFeatures,
        dongSalesMap,
        dateCode,
        scenario.key,
        scenario.label
      )
      generatedCount++
    }
  }

  console.log(`\n✅ Weekly: Generated ${generatedCount} binary files (${dates.length} days × ${TEMPERATURE_SCENARIOS.length} scenarios)`)
}

/**
 * Process monthly predictions (31 days)
 */
async function processMonthlyPredictions(districtFeatures: any[]): Promise<void> {
  console.log('\n========================================')
  console.log('Processing MONTHLY Predictions (31 days)')
  console.log('========================================')

  const monthlyFile = path.join(PREDICTION_DIR, '2024-07_simulated.json')

  if (!fs.existsSync(monthlyFile)) {
    console.error(`Monthly prediction file not found: ${monthlyFile}`)
    return
  }

  const predictions: PredictionData[] = JSON.parse(fs.readFileSync(monthlyFile, 'utf8'))
  console.log(`Loaded ${predictions.length} monthly prediction records`)

  // Get unique dates
  const dates = [...new Set(predictions.map(p => p.기준일자))].sort()
  console.log(`Found ${dates.length} unique dates`)

  let generatedCount = 0

  // Process each date
  for (const date of dates) {
    const dateCode = date.replace(/-/g, '') // 2024-07-01 -> 20240701
    console.log(`\nProcessing ${date}...`)

    // Process each temperature scenario
    for (const scenario of TEMPERATURE_SCENARIOS) {
      const dongSalesMap = loadPredictionDataForDate(predictions, date, scenario.field)
      generatePredictionMesh(
        districtFeatures,
        dongSalesMap,
        dateCode,
        scenario.key,
        scenario.label
      )
      generatedCount++
    }
  }

  console.log(`\n✅ Monthly: Generated ${generatedCount} binary files (${dates.length} days × ${TEMPERATURE_SCENARIOS.length} scenarios)`)
}

/**
 * Main execution
 */
async function main() {
  console.log('===========================================')
  console.log('AI Prediction Mesh Generator')
  console.log('===========================================')
  console.log(`Resolution: ${RESOLUTION}x${RESOLUTION}`)
  console.log(`Output directory: ${BINARY_OUTPUT_DIR}`)
  console.log(`Temperature scenarios: ${TEMPERATURE_SCENARIOS.map(s => s.label).join(', ')}`)

  try {
    // Load district boundaries
    const districtFeatures = loadDistrictData()

    // Process both weekly and monthly predictions
    await processWeeklyPredictions(districtFeatures)
    await processMonthlyPredictions(districtFeatures)

    console.log('\n===========================================')
    console.log('✅ All prediction meshes generated successfully!')
    console.log('===========================================')

    // Summary
    const totalFiles = 28 + 124 // 7 days × 4 scenarios + 31 days × 4 scenarios
    console.log(`\nSummary:`)
    console.log(`- Weekly: 28 files (7 days × 4 scenarios)`)
    console.log(`- Monthly: 124 files (31 days × 4 scenarios)`)
    console.log(`- Total: ${totalFiles} binary mesh files`)
    console.log(`- Output: ${BINARY_OUTPUT_DIR}`)

  } catch (error) {
    console.error('Error generating prediction meshes:', error)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}