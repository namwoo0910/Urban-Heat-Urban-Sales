#!/usr/bin/env ts-node

/**
 * Automated Daily Seoul Mesh Generator (YYYY-01-01 .. YYYY-12-31)
 * - Reads monthly sales JSON files per month and generates a daily mesh per day
 * - Uses generateGridMesh (same logic as runtime) to ensure consistency
 * - Outputs binary (.bin) + header (.header.json). JSON export optional via flag
 */

import * as fs from 'fs'
import * as path from 'path'
import { generateGridMesh, type MeshGeometry, type MeshGeneratorOptions } from '../src/features/card-sales/utils/meshGenerator'

// Defaults
const DEFAULT_RESOLUTION = 120
const DEFAULT_HEIGHT_SCALE = 1
const INPUT_FILE = path.join(__dirname, '../public/data/local_economy/local_economy_dong.geojson')
const MONTHLY_DIR = path.join(__dirname, '../public/data/local_economy/monthly')
const OUTPUT_DIR = path.join(__dirname, '../public/data')
const BINARY_OUTPUT_DIR = path.join(__dirname, '../public/data/binary')

interface SalesData {
  기준일자: string
  행정동코드: number
  총매출액: number
}

interface CLIOptions {
  year: number
  resolution: number
  heightScale: number
  binaryOnly: boolean
  onlyMonth?: string // e.g., '2024-01'
  onlyDate?: string  // e.g., '2024-01-15'
}

function parseArgs(argv: string[]): CLIOptions {
  const opts: CLIOptions = {
    year: 2024,
    resolution: DEFAULT_RESOLUTION,
    heightScale: DEFAULT_HEIGHT_SCALE,
    binaryOnly: true
  }
  argv.forEach((arg, i) => {
    if (arg === '--year') opts.year = parseInt(argv[i + 1])
    if (arg === '--resolution') opts.resolution = parseInt(argv[i + 1])
    if (arg === '--heightScale') opts.heightScale = parseFloat(argv[i + 1])
    if (arg === '--binaryOnly') opts.binaryOnly = argv[i + 1] !== 'false'
    if (arg === '--onlyMonth') opts.onlyMonth = argv[i + 1]
    if (arg === '--onlyDate') opts.onlyDate = argv[i + 1]
  })
  return opts
}

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

function loadMonthlySales(month: string): SalesData[] {
  const monthFile = path.join(MONTHLY_DIR, `${month}.json`) // e.g., 2024-03.json
  if (!fs.existsSync(monthFile)) {
    throw new Error(`Sales file not found: ${monthFile}`)
  }
  return JSON.parse(fs.readFileSync(monthFile, 'utf8'))
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate() // month: 1-12
}

function toDateCode(year: number, month: number, day: number): string {
  const mm = month.toString().padStart(2, '0')
  const dd = day.toString().padStart(2, '0')
  return `${year}${mm}${dd}`
}

function toMonthCode(year: number, month: number): string {
  const mm = month.toString().padStart(2, '0')
  return `${year}-${mm}`
}

function saveMeshAsJSON(meshData: MeshGeometry, dateCode: string, resolution: number): string {
  const outputFile = path.join(OUTPUT_DIR, `seoul-mesh-${dateCode}.json`)
  const jsonData = {
    positions: Array.from(meshData.positions),
    normals: Array.from(meshData.normals),
    texCoords: Array.from(meshData.texCoords),
    colors: meshData.colors ? Array.from(meshData.colors) : null,
    indices: meshData.indices ? Array.from(meshData.indices) : null,
    metadata: {
      resolution,
      vertices: meshData.positions.length / 3,
      triangles: meshData.indices ? meshData.indices.length / 3 : 0,
      generated: new Date().toISOString(),
      source: `generate-all-days.ts for ${dateCode}`,
      center: meshData.metadata?.center
    }
  }
  fs.writeFileSync(outputFile, JSON.stringify(jsonData, null, 2))
  const sizeMB = (JSON.stringify(jsonData).length / 1024 / 1024).toFixed(2)
  console.log(`✅ JSON written: ${outputFile} (${sizeMB} MB)\n   - Vertices: ${jsonData.metadata.vertices}\n   - Triangles: ${jsonData.metadata.triangles}`)
  return outputFile
}

function saveMeshAsBinary(meshData: MeshGeometry, dateCode: string, resolution: number): string {
  if (!fs.existsSync(BINARY_OUTPUT_DIR)) {
    fs.mkdirSync(BINARY_OUTPUT_DIR, { recursive: true })
  }

  // Calculate bounds from positions
  const positions = meshData.positions
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (let i = 0; i < positions.length; i += 3) {
    minX = Math.min(minX, positions[i])
    maxX = Math.max(maxX, positions[i])
    minY = Math.min(minY, positions[i + 1])
    maxY = Math.max(maxY, positions[i + 1])
  }

  const header = {
    format: 'seoul-mesh-binary',
    version: '1.0',
    metadata: {
      resolution,
      vertices: meshData.positions.length / 3,
      triangles: meshData.indices ? meshData.indices.length / 3 : 0,
      bounds: { minX, maxX, minY, maxY },
      center: meshData.metadata?.center || { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
      generated: new Date().toISOString(),
      source: `generate-all-days.ts for ${dateCode}`
    },
    offsets: {
      positions: { offset: 0, length: 0, type: 'Float32', itemSize: 3, count: 0 },
      normals: { offset: 0, length: 0, type: 'Float32', itemSize: 3, count: 0 },
      texCoords: { offset: 0, length: 0, type: 'Float32', itemSize: 2, count: 0 },
      colors: { offset: 0, length: 0, type: 'Float32', itemSize: 4, count: 0 },
      indices: { offset: 0, length: 0, type: 'Uint32', itemSize: 1, count: 0 }
    },
    totalSize: 0,
    compressed: false
  }

  const positionsArray = new Float32Array(meshData.positions)
  const normalsArray = new Float32Array(meshData.normals)
  const texCoordsArray = new Float32Array(meshData.texCoords)
  const colorsArray = meshData.colors ? new Float32Array(meshData.colors) : new Float32Array(0)
  const indicesArray = meshData.indices ? new Uint32Array(meshData.indices) : new Uint32Array(0)

  let offset = 0
  header.offsets.positions.offset = offset
  header.offsets.positions.length = positionsArray.byteLength
  header.offsets.positions.count = positionsArray.length / 3
  offset += positionsArray.byteLength

  header.offsets.normals.offset = offset
  header.offsets.normals.length = normalsArray.byteLength
  header.offsets.normals.count = normalsArray.length / 3
  offset += normalsArray.byteLength

  header.offsets.texCoords.offset = offset
  header.offsets.texCoords.length = texCoordsArray.byteLength
  header.offsets.texCoords.count = texCoordsArray.length / 2
  offset += texCoordsArray.byteLength

  header.offsets.colors.offset = offset
  header.offsets.colors.length = colorsArray.byteLength
  header.offsets.colors.count = colorsArray.length / 4
  offset += colorsArray.byteLength

  header.offsets.indices.offset = offset
  header.offsets.indices.length = indicesArray.byteLength
  header.offsets.indices.count = indicesArray.length
  offset += indicesArray.byteLength

  header.totalSize = offset

  const headerFile = path.join(BINARY_OUTPUT_DIR, `seoul-mesh-${dateCode}.header.json`)
  fs.writeFileSync(headerFile, JSON.stringify(header, null, 2))

  const buffer = Buffer.alloc(header.totalSize)
  let bufferOffset = 0
  Buffer.from(positionsArray.buffer).copy(buffer, bufferOffset); bufferOffset += positionsArray.byteLength
  Buffer.from(normalsArray.buffer).copy(buffer, bufferOffset); bufferOffset += normalsArray.byteLength
  Buffer.from(texCoordsArray.buffer).copy(buffer, bufferOffset); bufferOffset += texCoordsArray.byteLength
  Buffer.from(colorsArray.buffer).copy(buffer, bufferOffset); bufferOffset += colorsArray.byteLength
  Buffer.from(indicesArray.buffer).copy(buffer, bufferOffset)

  const binaryFile = path.join(BINARY_OUTPUT_DIR, `seoul-mesh-${dateCode}.bin`)
  fs.writeFileSync(binaryFile, buffer)
  const binarySize = (buffer.length / 1024 / 1024).toFixed(2)
  console.log(`✅ Binary written: ${binaryFile} (${binarySize} MB)`) 
  return binaryFile
}

async function generateMeshForDate(
  districtFeatures: any[],
  salesData: SalesData[],
  year: number,
  month: number,
  day: number,
  resolution: number,
  heightScale: number,
  binaryOnly: boolean
): Promise<{ ok: boolean; dateCode: string; error?: any }> {
  const mm = month.toString().padStart(2, '0')
  const dd = day.toString().padStart(2, '0')
  const targetDate = `${year}-${mm}-${dd}`
  const dateCode = `${year}${mm}${dd}`
  try {
    const dongSalesMap = new Map<number, number>()
    salesData
      .filter(d => d.기준일자 === targetDate)
      .forEach(d => {
        dongSalesMap.set(d.행정동코드, d.총매출액 || 0)
      })

    console.log(`\n[${targetDate}] Dongs with sales: ${dongSalesMap.size}`)

    const options: MeshGeneratorOptions = {
      resolution,
      heightScale,
      wireframe: false,
      smoothing: true,
      dongBoundaries: districtFeatures,
      dongSalesMap,
      salesHeightScale: 100000000
    }

    const meshData = generateGridMesh(districtFeatures, options)
    if (!meshData.positions || meshData.positions.length === 0) {
      throw new Error('Empty mesh geometry')
    }

    if (!binaryOnly) {
      saveMeshAsJSON(meshData, dateCode, resolution)
    }
    saveMeshAsBinary(meshData, dateCode, resolution)
    return { ok: true, dateCode }
  } catch (error) {
    console.error(`❌ Failed for ${targetDate}:`, error)
    return { ok: false, dateCode, error }
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  console.log('========================================')
  console.log(`Seoul Daily Mesh Generation (Year=${opts.year})`)
  console.log(`Resolution=${opts.resolution}, HeightScale=${opts.heightScale}, BinaryOnly=${opts.binaryOnly}`)
  if (opts.onlyMonth) console.log(`OnlyMonth=${opts.onlyMonth}`)
  if (opts.onlyDate) console.log(`OnlyDate=${opts.onlyDate}`)
  console.log('========================================')

  const districtFeatures = loadDistrictData()
  const generatedDates: string[] = []
  let successCount = 0
  let failCount = 0

  // If onlyDate provided, generate just that one day
  if (opts.onlyDate) {
    const [Y, M, D] = opts.onlyDate.split('-').map(x => parseInt(x, 10))
    const monthCode = toMonthCode(Y, M)
    let salesData: SalesData[] = []
    try {
      salesData = loadMonthlySales(monthCode)
    } catch (e) {
      console.warn(`⚠️ Skip date ${opts.onlyDate}: ${e}`)
    }
    const result = await generateMeshForDate(
      districtFeatures,
      salesData,
      Y,
      M,
      D,
      opts.resolution,
      opts.heightScale,
      opts.binaryOnly
    )
    if (result.ok) {
      successCount++
      generatedDates.push(result.dateCode)
    } else {
      failCount++
    }
  } else {
  for (let m = 1; m <= 12; m++) {
    if (opts.onlyMonth && toMonthCode(opts.year, m) !== opts.onlyMonth) {
      continue
    }
    const monthCode = toMonthCode(opts.year, m)
    console.log(`\n===== Month ${monthCode} =====`)
    let salesData: SalesData[] = []
    try {
      salesData = loadMonthlySales(monthCode)
    } catch (e) {
      console.warn(`⚠️ Skip month ${monthCode}: ${e}`)
      continue
    }
    const days = getDaysInMonth(opts.year, m)
    for (let d = 1; d <= days; d++) {
      const result = await generateMeshForDate(
        districtFeatures,
        salesData,
        opts.year,
        m,
        d,
        opts.resolution,
        opts.heightScale,
        opts.binaryOnly
      )
      if (result.ok) {
        successCount++
        generatedDates.push(result.dateCode)
      } else {
        failCount++
      }
    }
  } }

  // Write available dates index
  try {
    if (!fs.existsSync(BINARY_OUTPUT_DIR)) fs.mkdirSync(BINARY_OUTPUT_DIR, { recursive: true })
    const indexFile = path.join(BINARY_OUTPUT_DIR, 'available-dates.json')
    const indexData = {
      year: opts.year,
      dates: generatedDates,
      version: '1.0',
      generatedAt: new Date().toISOString()
    }
    fs.writeFileSync(indexFile, JSON.stringify(indexData, null, 2))
    console.log(`\n🗂️ Index written: ${indexFile} (dates=${generatedDates.length})`)
  } catch (e) {
    console.warn('Failed to write available-dates index:', e)
  }

  console.log('\n========================================')
  console.log('🎉 Daily Generation Summary')
  console.log('========================================')
  console.log(`✅ Success: ${successCount} days`)
  console.log(`❌ Failed: ${failCount} days`)
  console.log('========================================')
}

// Execute
main().catch(err => {
  console.error('❌ Batch generation failed:', err)
  process.exit(1)
})
