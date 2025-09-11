#!/usr/bin/env ts-node

/**
 * Automated Monthly Seoul Mesh Generator
 * Generates mesh layers for all months (2024-01 through 2024-12)
 * Uses the same logic as generate-mesh.ts but with automated month iteration
 */

import * as fs from 'fs'
import * as path from 'path'
import { generateGridMesh, type MeshGeometry, type MeshGeneratorOptions } from '../src/features/card-sales/utils/meshGenerator.js'

// Configuration
const RESOLUTION = 120
const HEIGHT_SCALE = 1
const INPUT_FILE = path.join(__dirname, '../public/data/local_economy/local_economy_dong.geojson')
const OUTPUT_DIR = path.join(__dirname, '../public/data')
const BINARY_OUTPUT_DIR = path.join(__dirname, '../public/data/binary')

// All months to generate (skip 01 and 02 as they're already generated)
const MONTHS_TO_GENERATE = [
  '2024-03', '2024-04', '2024-05', '2024-06',
  '2024-07', '2024-08', '2024-09', '2024-10', 
  '2024-11', '2024-12'
]

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
 * Load and process sales data for a specific month
 */
function loadSalesDataForMonth(month: string): Map<number, number> {
  const monthFormatted = month.replace('-', '') // '2024-03' -> '202403'
  const salesFile = path.join(__dirname, `../public/data/local_economy/monthly/${month}.json`)
  const targetDate = `${month}-01` // e.g., '2024-03-01'
  
  console.log(`Loading sales data for ${targetDate}...`)
  
  if (!fs.existsSync(salesFile)) {
    throw new Error(`Sales file not found: ${salesFile}`)
  }
  
  const salesData: SalesData[] = JSON.parse(fs.readFileSync(salesFile, 'utf8'))
  
  const dongSalesMap = new Map<number, number>()
  let maxSales = 0
  let minSales = Infinity
  
  salesData
    .filter(d => d.기준일자 === targetDate)
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
function saveMeshAsJSON(meshData: MeshGeometry, month: string) {
  const monthFormatted = month.replace('-', '') // '2024-03' -> '202403'
  const outputFile = path.join(OUTPUT_DIR, `seoul-mesh-${monthFormatted}.json`)
  
  // Convert TypedArrays to regular arrays for JSON serialization
  const jsonData = {
    positions: Array.from(meshData.positions),
    normals: Array.from(meshData.normals),
    texCoords: Array.from(meshData.texCoords),
    colors: meshData.colors ? Array.from(meshData.colors) : null,
    indices: meshData.indices ? Array.from(meshData.indices) : null,
    metadata: {
      resolution: RESOLUTION,
      vertices: meshData.positions.length / 3,
      triangles: meshData.indices ? meshData.indices.length / 3 : 0,
      generated: new Date().toISOString(),
      source: `generate-all-months.ts with ${month} sales data and line-polygon intersection validation`,
      center: meshData.metadata?.center
    }
  }
  
  fs.writeFileSync(outputFile, JSON.stringify(jsonData, null, 2))
  
  const fileSizeMB = (fs.statSync(outputFile).size / 1024 / 1024).toFixed(2)
  console.log(`✅ Mesh data saved successfully (${fileSizeMB} MB)`)
  console.log(`   - Resolution: ${RESOLUTION}x${RESOLUTION}`)
  console.log(`   - Vertices: ${jsonData.metadata.vertices}`)
  console.log(`   - Triangles: ${jsonData.metadata.triangles}`)
  
  return outputFile
}

/**
 * Convert JSON mesh to binary format
 */
function convertToBinary(jsonFile: string, month: string) {
  const meshData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'))
  const monthFormatted = month.replace('-', '') // '2024-03' -> '202403'
  
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
      resolution: RESOLUTION,
      vertices: meshData.positions.length / 3,
      triangles: meshData.indices.length / 3,
      bounds: { minX, maxX, minY, maxY },
      center: meshData.metadata.center || { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
      generated: new Date().toISOString(),
      source: `generate-all-months.ts with ${month} sales data and line-polygon intersection validation`
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
  const headerFile = path.join(BINARY_OUTPUT_DIR, `seoul-mesh-${monthFormatted}.header.json`)
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
  const binaryFile = path.join(BINARY_OUTPUT_DIR, `seoul-mesh-${monthFormatted}.bin`)
  fs.writeFileSync(binaryFile, buffer)
  
  const binarySize = (buffer.length / 1024 / 1024).toFixed(2)
  console.log(`✅ Binary written to ${binaryFile}`)
  console.log(`    Size: ${binarySize} MB`)
  
  return binaryFile
}

/**
 * Generate mesh for a specific month
 */
async function generateMeshForMonth(month: string): Promise<void> {
  console.log(`\n========================================`)
  console.log(`Seoul Mesh Generation for ${month}`)
  console.log(`Using line-polygon intersection validation`)
  console.log(`========================================`)
  
  try {
    // Load data
    const dongSalesMap = loadSalesDataForMonth(month)
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
    const jsonFile = saveMeshAsJSON(meshData, month)
    
    // Convert to binary
    console.log('\nConverting to binary format...')
    convertToBinary(jsonFile, month)
    
    console.log(`\n✅ Mesh generation completed for ${month}!`)
    
  } catch (error) {
    console.error(`\n❌ Mesh generation failed for ${month}:`)
    console.error(error)
    throw error
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('========================================')
  console.log('Seoul Monthly Mesh Generation (Automated)')  
  console.log('Using line-polygon intersection validation')
  console.log(`Generating ${MONTHS_TO_GENERATE.length} months: ${MONTHS_TO_GENERATE.join(', ')}`)
  console.log('========================================')
  
  let successCount = 0
  let failCount = 0
  
  for (const month of MONTHS_TO_GENERATE) {
    try {
      await generateMeshForMonth(month)
      successCount++
    } catch (error) {
      console.error(`Failed to generate mesh for ${month}:`, error)
      failCount++
    }
  }
  
  console.log('\n========================================')
  console.log('🎉 Batch Generation Summary')
  console.log('========================================')
  console.log(`✅ Success: ${successCount}/${MONTHS_TO_GENERATE.length} months`)
  console.log(`❌ Failed: ${failCount}/${MONTHS_TO_GENERATE.length} months`)
  
  if (failCount === 0) {
    console.log('🎉 All monthly meshes generated successfully!')
    console.log('Line-polygon intersection validation applied to all')
    console.log('Wire artifacts should be completely eliminated')
  } else {
    console.log('⚠️ Some meshes failed to generate. Check error logs above.')
  }
  
  console.log('========================================')
}

// Execute main function
main().catch(error => {
  console.error('❌ Batch generation failed:', error)
  process.exit(1)
})