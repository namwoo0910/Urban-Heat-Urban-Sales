/**
 * TypeScript-based Seoul Mesh Pre-generation Script
 * Uses the exact same logic as meshGenerator.ts for consistency
 * Generates binary mesh files with line-polygon intersection validation
 */

import * as fs from 'fs'
import * as path from 'path'
import { generateGridMesh, type MeshGeometry, type MeshGeneratorOptions } from '../src/features/card-sales/utils/meshGenerator.js'

// Configuration - Only 120 resolution with line-polygon intersection validation
const RESOLUTION = 120
const HEIGHT_SCALE = 1
const INPUT_FILE = path.join(__dirname, '../public/data/local_economy/local_economy_dong.geojson')
const SALES_FILE = path.join(__dirname, '../public/data/local_economy/monthly/2024-01.json')
const OUTPUT_DIR = path.join(__dirname, '../public/data')
const BINARY_OUTPUT_DIR = path.join(__dirname, '../public/data/binary')

interface SalesData {
  기준일자: string
  행정동코드: number
  총매출액: number
}

/**
 * Get sales-based elevation for a dong using the same logic as district3DUtils.ts
 */
function getSalesElevation(sales: number, salesHeightScale: number = 100000000): number {
  if (!sales || sales <= 0) {
    return 10 // 최소 높이로 바닥에 붙어있게
  }
  
  // 매출액을 높이로 변환 (기존 동적 생성과 동일)
  // salesHeightScale (기본 1억원) = 1500 units 높이로 매핑
  const heightPerWon = 1500 / salesHeightScale
  return Math.max(10, sales * heightPerWon)
}

/**
 * Load and process sales data
 */
function loadSalesData(): Map<number, number> {
  console.log('Loading sales data for 2024-01-01...')
  
  if (!fs.existsSync(SALES_FILE)) {
    throw new Error(`Sales file not found: ${SALES_FILE}`)
  }
  
  const salesData: SalesData[] = JSON.parse(fs.readFileSync(SALES_FILE, 'utf8'))
  
  const dongSalesMap = new Map<number, number>()
  let maxSales = 0
  let minSales = Infinity
  
  salesData
    .filter(d => d.기준일자 === '2024-01-01')
    .forEach(d => {
      const sales = d.총매출액 || 0
      dongSalesMap.set(d.행정동코드, sales)
      maxSales = Math.max(maxSales, sales)
      if (sales > 0) minSales = Math.min(minSales, sales)
    })
  
  console.log(`Found ${dongSalesMap.size} dongs with sales data`)
  console.log(`Sales range: ${minSales.toLocaleString()} - ${maxSales.toLocaleString()} KRW`)
  
  return dongSalesMap
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
 * Save mesh data as JSON
 */
function saveMeshAsJSON(meshData: MeshGeometry, resolution: number) {
  const outputFile = path.join(OUTPUT_DIR, `seoul-mesh-202401.json`)
  
  // Convert TypedArrays to regular arrays for JSON serialization
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
      source: 'generate-mesh.ts with January 2024 sales data and line-polygon intersection validation',
      center: meshData.metadata?.center
    }
  }
  
  fs.writeFileSync(outputFile, JSON.stringify(jsonData, null, 2))
  
  const fileSizeMB = (fs.statSync(outputFile).size / 1024 / 1024).toFixed(2)
  console.log(`✅ Mesh data saved successfully (${fileSizeMB} MB)`)
  console.log(`   - Resolution: ${resolution}x${resolution}`)
  console.log(`   - Vertices: ${jsonData.metadata.vertices}`)
  console.log(`   - Triangles: ${jsonData.metadata.triangles}`)
  
  return outputFile
}

/**
 * Convert JSON mesh to binary format
 */
function convertToBinary(jsonFile: string, resolution: number) {
  const meshData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'))
  
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
  
  // Create header
  const header = {
    format: 'seoul-mesh-binary',
    version: '1.0',
    metadata: {
      resolution,
      vertices: meshData.positions.length / 3,
      triangles: meshData.indices.length / 3,
      bounds: { minX, maxX, minY, maxY },
      center: meshData.metadata.center || { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
      generated: new Date().toISOString(),
      source: 'TypeScript generate-mesh.ts with line-polygon intersection validation'
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
  
  // Convert arrays to typed arrays
  const positionsArray = new Float32Array(meshData.positions)
  const normalsArray = new Float32Array(meshData.normals)
  const texCoordsArray = new Float32Array(meshData.texCoords)
  const colorsArray = meshData.colors ? new Float32Array(meshData.colors) : new Float32Array(0)
  const indicesArray = new Uint32Array(meshData.indices)
  
  // Calculate offsets
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
  
  // Save header
  const headerFile = path.join(BINARY_OUTPUT_DIR, `seoul-mesh-202401.header.json`)
  fs.writeFileSync(headerFile, JSON.stringify(header, null, 2))
  
  // Create binary buffer
  const buffer = Buffer.alloc(header.totalSize)
  let bufferOffset = 0
  
  // Write arrays to buffer
  Buffer.from(positionsArray.buffer).copy(buffer, bufferOffset)
  bufferOffset += positionsArray.byteLength
  
  Buffer.from(normalsArray.buffer).copy(buffer, bufferOffset)
  bufferOffset += normalsArray.byteLength
  
  Buffer.from(texCoordsArray.buffer).copy(buffer, bufferOffset)
  bufferOffset += texCoordsArray.byteLength
  
  Buffer.from(colorsArray.buffer).copy(buffer, bufferOffset)
  bufferOffset += colorsArray.byteLength
  
  Buffer.from(indicesArray.buffer).copy(buffer, bufferOffset)
  
  // Save binary file
  const binaryFile = path.join(BINARY_OUTPUT_DIR, `seoul-mesh-202401.bin`)
  fs.writeFileSync(binaryFile, buffer)
  
  const binarySize = (buffer.length / 1024 / 1024).toFixed(2)
  console.log(`✅ Binary written to ${binaryFile}`)
  console.log(`    Size: ${binarySize} MB`)
  
  return binaryFile
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('========================================')
    console.log('Seoul Mesh Generation with TypeScript')  
    console.log('Using line-polygon intersection validation')
    console.log('========================================')
    
    // Load data
    const dongSalesMap = loadSalesData()
    const districtFeatures = loadDistrictData()
    
    console.log(`\n========================================`)
    console.log(`Generating mesh for resolution ${RESOLUTION}x${RESOLUTION}`)
    console.log(`========================================`)
    
    // Generate mesh using the same logic as meshGenerator.ts
    const options: MeshGeneratorOptions = {
      resolution: RESOLUTION,
      heightScale: HEIGHT_SCALE,
      wireframe: false,
      smoothing: true,
      dongBoundaries: districtFeatures,
      dongSalesMap: dongSalesMap,
      salesHeightScale: 100000000 // 1억원 기준
    }
    
    console.log('Generating mesh with line-polygon intersection validation...')
    const meshData = generateGridMesh(districtFeatures, options)
    
    if (!meshData.positions || meshData.positions.length === 0) {
      throw new Error('Failed to generate mesh - empty geometry')
    }
    
    console.log(`Mesh generated successfully:`)
    console.log(`  - Vertices: ${meshData.positions.length / 3}`)
    console.log(`  - Triangles: ${meshData.indices ? meshData.indices.length / 3 : 0}`)
    
    // Save as JSON
    const jsonFile = saveMeshAsJSON(meshData, RESOLUTION)
    
    // Convert to binary
    console.log('\nConverting to binary format...')
    convertToBinary(jsonFile, RESOLUTION)
    
    console.log('\n========================================')
    console.log('✅ Mesh generation completed successfully!')
    console.log('Line-polygon intersection validation applied')
    console.log('Wire artifacts should be completely eliminated')
    console.log('========================================')
    
  } catch (error) {
    console.error('\n❌ Mesh generation failed:')
    console.error(error)
    process.exit(1)
  }
}

// Execute main function
main()