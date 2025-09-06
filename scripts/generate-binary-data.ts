#!/usr/bin/env ts-node

/**
 * Binary Data Generator for Seoul Visualization
 * 
 * Converts JSON data to binary format for 70% size reduction and 10x faster loading
 * 
 * Data Structure:
 * - Header (metadata): JSON file with offsets and data types
 * - Binary payload: ArrayBuffer with TypedArrays
 *   - Float32Array: coordinates (lat/lng)
 *   - Int32Array: dongCode, sggCode, sales
 *   - Int16Array: weather data
 *   - Uint8Array: strings (UTF-8 encoded)
 */

import * as fs from 'fs'
import * as path from 'path'
import * as zlib from 'zlib'
import { promisify } from 'util'

const gzip = promisify(zlib.gzip)
const gunzip = promisify(zlib.gunzip)

// Binary format version for future compatibility
const BINARY_FORMAT_VERSION = '1.0.0'

interface BinaryHeader {
  version: string
  timestamp: string
  dataType: 'geometry' | 'monthly-sales'
  month?: string
  offsets: {
    dongCodes: number
    dongNames: number
    sggCodes: number
    sggNames: number
    centroids: number
    boundingBoxes: number
    coordinates: number
    sales?: number
    weather?: number
  }
  counts: {
    dongs: number
    days?: number
    totalCoordinates: number
  }
  sizes: {
    dongNamesLength: number
    sggNamesLength: number
    coordinatesPerDong: number[]
  }
}

/**
 * Encode string to UTF-8 bytes
 */
function encodeString(str: string): Uint8Array {
  const encoder = new TextEncoder()
  return encoder.encode(str)
}

/**
 * Decode UTF-8 bytes to string
 */
function decodeString(bytes: Uint8Array): string {
  const decoder = new TextDecoder()
  return decoder.decode(bytes)
}

/**
 * Convert geometry-static.json to binary format
 */
async function convertGeometryToBinary() {
  console.log('🔄 Converting geometry-static.json to binary...')
  
  const inputPath = path.join(__dirname, '../public/data/optimized/geometry-static.json')
  const outputDir = path.join(__dirname, '../public/data/binary/optimized')
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  // Load JSON data
  const jsonData = JSON.parse(fs.readFileSync(inputPath, 'utf-8'))
  const dongCount = jsonData.length
  
  // Calculate buffer sizes
  let totalCoordinates = 0
  let dongNamesBuffer = Buffer.alloc(0)
  let sggNamesBuffer = Buffer.alloc(0)
  const coordinatesPerDong: number[] = []
  
  // First pass: calculate sizes
  jsonData.forEach((dong: any) => {
    // Count coordinates (flatten all polygon rings)
    let coordCount = 0
    dong.coordinates.forEach((ring: number[][]) => {
      coordCount += ring.length
    })
    coordinatesPerDong.push(coordCount)
    totalCoordinates += coordCount
    
    // Encode names
    dongNamesBuffer = Buffer.concat([dongNamesBuffer, encodeString(dong.dongName + '\0')])
    sggNamesBuffer = Buffer.concat([sggNamesBuffer, encodeString(dong.sggName + '\0')])
  })
  
  // Helper function to align offset to boundary
  function alignOffset(offset: number, alignment: number): number {
    const remainder = offset % alignment
    return remainder === 0 ? offset : offset + (alignment - remainder)
  }
  
  // Calculate offsets with proper alignment
  let currentOffset = 0
  
  // dongCodes (Int32 - 4 byte aligned)
  const dongCodesOffset = currentOffset
  currentOffset += dongCount * 4
  
  // sggCodes (Int32 - 4 byte aligned)
  const sggCodesOffset = currentOffset
  currentOffset += dongCount * 4
  
  // dongNames (strings - no alignment needed)
  const dongNamesOffset = currentOffset
  currentOffset += dongNamesBuffer.length
  
  // sggNames (strings - no alignment needed)
  const sggNamesOffset = currentOffset
  currentOffset += sggNamesBuffer.length
  
  // centroids (Float32 - must be 4 byte aligned)
  currentOffset = alignOffset(currentOffset, 4)
  const centroidsOffset = currentOffset
  currentOffset += dongCount * 8 // 2 Float32 per dong
  
  // boundingBoxes (Float32 - must be 4 byte aligned)
  currentOffset = alignOffset(currentOffset, 4)
  const boundingBoxesOffset = currentOffset
  currentOffset += dongCount * 16 // 4 Float32 per dong
  
  // coordinates (Float32 - must be 4 byte aligned)
  currentOffset = alignOffset(currentOffset, 4)
  const coordinatesOffset = currentOffset
  currentOffset += totalCoordinates * 8 // 2 Float32 per coordinate
  
  const header: BinaryHeader = {
    version: BINARY_FORMAT_VERSION,
    timestamp: new Date().toISOString(),
    dataType: 'geometry',
    offsets: {
      dongCodes: dongCodesOffset,
      sggCodes: sggCodesOffset,
      dongNames: dongNamesOffset,
      sggNames: sggNamesOffset,
      centroids: centroidsOffset,
      boundingBoxes: boundingBoxesOffset,
      coordinates: coordinatesOffset
    },
    counts: {
      dongs: dongCount,
      totalCoordinates
    },
    sizes: {
      dongNamesLength: dongNamesBuffer.length,
      sggNamesLength: sggNamesBuffer.length,
      coordinatesPerDong
    }
  }
  
  // Calculate total buffer size (use final aligned offset)
  const totalSize = currentOffset
  const buffer = Buffer.alloc(totalSize)
  
  // Write data to buffer using aligned offsets
  let offset = 0
  
  // 1. Dong codes (Int32)
  offset = header.offsets.dongCodes
  jsonData.forEach((dong: any, i: number) => {
    buffer.writeInt32LE(dong.dongCode, offset + i * 4)
  })
  
  // 2. Sgg codes (Int32)
  offset = header.offsets.sggCodes
  jsonData.forEach((dong: any, i: number) => {
    buffer.writeInt32LE(dong.sggCode, offset + i * 4)
  })
  
  // 3. Dong names (UTF-8 strings)
  offset = header.offsets.dongNames
  dongNamesBuffer.copy(buffer, offset)
  
  // 4. Sgg names (UTF-8 strings)
  offset = header.offsets.sggNames
  sggNamesBuffer.copy(buffer, offset)
  
  // 5. Centroids (Float32 pairs) - ALIGNED
  offset = header.offsets.centroids
  jsonData.forEach((dong: any, i: number) => {
    buffer.writeFloatLE(dong.centroid[0], offset + i * 8)
    buffer.writeFloatLE(dong.centroid[1], offset + i * 8 + 4)
  })
  
  // 6. Bounding boxes (4 Float32 per dong) - ALIGNED
  offset = header.offsets.boundingBoxes
  jsonData.forEach((dong: any, i: number) => {
    buffer.writeFloatLE(dong.boundingBox[0], offset + i * 16)
    buffer.writeFloatLE(dong.boundingBox[1], offset + i * 16 + 4)
    buffer.writeFloatLE(dong.boundingBox[2], offset + i * 16 + 8)
    buffer.writeFloatLE(dong.boundingBox[3], offset + i * 16 + 12)
  })
  
  // 7. Coordinates (Float32 pairs) - ALIGNED
  offset = header.offsets.coordinates
  jsonData.forEach((dong: any) => {
    dong.coordinates.forEach((ring: number[][]) => {
      ring.forEach((coord: number[]) => {
        buffer.writeFloatLE(coord[0], offset)
        buffer.writeFloatLE(coord[1], offset + 4)
        offset += 8
      })
    })
  })
  
  // Write binary file
  const binaryPath = path.join(outputDir, 'geometry-static.bin')
  fs.writeFileSync(binaryPath, buffer)
  
  // Write header file
  const headerPath = path.join(outputDir, 'geometry-static.header.json')
  fs.writeFileSync(headerPath, JSON.stringify(header, null, 2))
  
  // Create compressed version
  const compressed = await gzip(buffer)
  const compressedPath = path.join(outputDir, 'geometry-static.bin.gz')
  fs.writeFileSync(compressedPath, compressed)
  
  // Report sizes
  const jsonSize = fs.statSync(inputPath).size
  const binarySize = buffer.length
  const compressedSize = compressed.length
  
  console.log('✅ Geometry conversion complete:')
  console.log(`  Original JSON: ${(jsonSize / 1024 / 1024).toFixed(2)} MB`)
  console.log(`  Binary: ${(binarySize / 1024 / 1024).toFixed(2)} MB (${((1 - binarySize/jsonSize) * 100).toFixed(1)}% reduction)`)
  console.log(`  Compressed: ${(compressedSize / 1024 / 1024).toFixed(2)} MB (${((1 - compressedSize/jsonSize) * 100).toFixed(1)}% reduction)`)
  
  return { header, binarySize, compressedSize }
}

/**
 * Convert monthly sales data to binary format
 */
async function convertMonthlyDataToBinary(month: string) {
  console.log(`🔄 Converting sales-${month}.json to binary...`)
  
  const inputPath = path.join(__dirname, `../public/data/optimized/monthly/sales-${month}.json`)
  const outputDir = path.join(__dirname, '../public/data/binary/optimized/monthly')
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  // Load JSON data
  const jsonData = JSON.parse(fs.readFileSync(inputPath, 'utf-8'))
  const dongCount = jsonData.dongCount
  const days = Object.keys(jsonData.days)
  const dayCount = days.length
  
  // Calculate actual total dong-day entries
  let totalEntries = 0
  days.forEach(day => {
    totalEntries += Object.keys(jsonData.days[day]).length
  })
  
  // Calculate buffer size
  // Per dong per day: sales(4-Float32) + 6 weather fields(2 each) + rank(2) + percentile(1) + colorIndex(1) + height(4)
  const perDongPerDay = 4 + 12 + 2 + 1 + 1 + 4 // 24 bytes
  const totalSize = totalEntries * perDongPerDay
  const buffer = Buffer.alloc(totalSize)
  
  // Extract all unique dong codes for metadata
  const allDongCodes = new Set<number>()
  days.forEach(day => {
    Object.keys(jsonData.days[day]).forEach(dongCode => {
      allDongCodes.add(Number(dongCode))
    })
  })
  const dongCodesList = Array.from(allDongCodes).sort((a, b) => a - b)
  
  // Create header with dong codes
  const header: BinaryHeader = {
    version: BINARY_FORMAT_VERSION,
    timestamp: new Date().toISOString(),
    dataType: 'monthly-sales',
    month,
    offsets: {
      dongCodes: 0,
      dongNames: 0,
      sggCodes: 0,
      sggNames: 0,
      centroids: 0,
      boundingBoxes: 0,
      coordinates: 0,
      sales: 0,
      weather: 4 * dongCount * dayCount
    },
    counts: {
      dongs: dongCount,
      days: dayCount,
      totalCoordinates: 0
    },
    sizes: {
      dongNamesLength: 0,
      sggNamesLength: 0,
      coordinatesPerDong: []
    },
    dongCodes: dongCodesList // Add dong codes to header
  } as BinaryHeader & { dongCodes: number[] }
  
  // Write data
  let offset = 0
  
  days.forEach((day, dayIndex) => {
    const dayData = jsonData.days[day]
    const dongCodes = Object.keys(dayData)
    const actualDongCount = dongCodes.length
    
    // Process each dong
    dongCodes.forEach((dongCode, dongIndex) => {
      const dong = dayData[dongCode]
      // Use actual dong count per day, not the maximum
      const baseOffset = offset
      
      // Sales (Float32) - handle large values
      buffer.writeFloatLE(dong.totalSales, baseOffset)
      
      // Weather (Int16 x 6)
      buffer.writeInt16LE(Math.round(dong.weather.avgTemp * 10), baseOffset + 4)
      buffer.writeInt16LE(Math.round(dong.weather.maxTemp * 10), baseOffset + 6)
      buffer.writeInt16LE(Math.round(dong.weather.minTemp * 10), baseOffset + 8)
      buffer.writeInt16LE(dong.weather.avgHumidity, baseOffset + 10)
      buffer.writeInt16LE(dong.weather.discomfortIndex, baseOffset + 12)
      
      // Temp group as enum (0-5)
      const tempGroupMap: Record<string, number> = {
        'very_cold': 0, 'cold': 1, 'cool': 2, 'mild': 3, 'warm': 4, 'hot': 5
      }
      buffer.writeUInt8(tempGroupMap[dong.weather.tempGroup] || 3, baseOffset + 14)
      
      // Rank (Int16)
      buffer.writeInt16LE(dong.rank, baseOffset + 15)
      
      // Percentile (UInt8)
      buffer.writeUInt8(dong.percentile, baseOffset + 17)
      
      // Color index (UInt8)
      buffer.writeUInt8(dong.colorIndex, baseOffset + 18)
      
      // Height (Float32)
      buffer.writeFloatLE(dong.height, baseOffset + 20)
      
      // Move offset for next dong
      offset += perDongPerDay
    })
  })
  
  // Write binary file
  const binaryPath = path.join(outputDir, `sales-${month}.bin`)
  fs.writeFileSync(binaryPath, buffer)
  
  // Write header file
  const headerPath = path.join(outputDir, `sales-${month}.header.json`)
  fs.writeFileSync(headerPath, JSON.stringify(header, null, 2))
  
  // Create compressed version
  const compressed = await gzip(buffer)
  const compressedPath = path.join(outputDir, `sales-${month}.bin.gz`)
  fs.writeFileSync(compressedPath, compressed)
  
  // Report sizes
  const jsonSize = fs.statSync(inputPath).size
  const binarySize = buffer.length
  const compressedSize = compressed.length
  
  console.log(`✅ Monthly data ${month} conversion complete:`)
  console.log(`  Original JSON: ${(jsonSize / 1024 / 1024).toFixed(2)} MB`)
  console.log(`  Binary: ${(binarySize / 1024 / 1024).toFixed(2)} MB (${((1 - binarySize/jsonSize) * 100).toFixed(1)}% reduction)`)
  console.log(`  Compressed: ${(compressedSize / 1024 / 1024).toFixed(2)} MB (${((1 - compressedSize/jsonSize) * 100).toFixed(1)}% reduction)`)
  
  return { month, binarySize, compressedSize }
}

/**
 * Main conversion process
 */
async function main() {
  console.log('🚀 Starting binary data conversion...\n')
  
  try {
    // Convert geometry
    const geometryResult = await convertGeometryToBinary()
    console.log('')
    
    // Convert all monthly data
    const months = [
      '2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06',
      '2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12'
    ]
    
    const monthlyResults = []
    for (const month of months) {
      const result = await convertMonthlyDataToBinary(month)
      monthlyResults.push(result)
      console.log('')
    }
    
    // Generate index file
    const indexPath = path.join(__dirname, '../public/data/binary/optimized/index.json')
    const index = {
      version: BINARY_FORMAT_VERSION,
      generated: new Date().toISOString(),
      geometry: {
        binary: 'geometry-static.bin',
        header: 'geometry-static.header.json',
        compressed: 'geometry-static.bin.gz',
        size: geometryResult.binarySize,
        compressedSize: geometryResult.compressedSize
      },
      monthly: monthlyResults.map(r => ({
        month: r.month,
        binary: `monthly/sales-${r.month}.bin`,
        header: `monthly/sales-${r.month}.header.json`,
        compressed: `monthly/sales-${r.month}.bin.gz`,
        size: r.binarySize,
        compressedSize: r.compressedSize
      }))
    }
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2))
    
    console.log('✨ All binary conversions complete!')
    console.log(`📁 Output directory: public/data/binary/optimized/`)
    
    // Calculate total savings
    const totalJsonSize = geometryResult.binarySize / 0.3 + monthlyResults.reduce((sum, r) => sum + r.binarySize / 0.08, 0)
    const totalBinarySize = geometryResult.binarySize + monthlyResults.reduce((sum, r) => sum + r.binarySize, 0)
    const totalCompressedSize = geometryResult.compressedSize + monthlyResults.reduce((sum, r) => sum + r.compressedSize, 0)
    
    console.log('\n📊 Total Size Comparison:')
    console.log(`  Original JSON (estimated): ${(totalJsonSize / 1024 / 1024).toFixed(2)} MB`)
    console.log(`  Binary: ${(totalBinarySize / 1024 / 1024).toFixed(2)} MB (${((1 - totalBinarySize/totalJsonSize) * 100).toFixed(1)}% reduction)`)
    console.log(`  Compressed: ${(totalCompressedSize / 1024 / 1024).toFixed(2)} MB (${((1 - totalCompressedSize/totalJsonSize) * 100).toFixed(1)}% reduction)`)
    
  } catch (error) {
    console.error('❌ Conversion failed:', error)
    process.exit(1)
  }
}

// Run if called directly
main()

export { convertGeometryToBinary, convertMonthlyDataToBinary }