#!/usr/bin/env node

/**
 * Generate 3D gradient bar data for administrative dong boundaries
 * Creates smooth gradient bars from dong centers to boundaries
 */

const fs = require('fs')
const path = require('path')

// Configuration
const CONFIG = {
  RADIAL_DIRECTIONS: 72,      // 5-degree intervals for smoother coverage
  POINTS_PER_DIRECTION: 20,   // More points for smoother gradient
  MIN_HEIGHT_RATIO: 0.05,     // 5% height at boundary
  GRADIENT_POWER: 2,          // Quadratic falloff
  OUTPUT_FILE: path.join(__dirname, '../public/data/dong-gradient-bars.json')
}

console.log('🏗️ Generating administrative dong gradient data...')

async function loadDongGeometry() {
  try {
    const dongPath = path.join(__dirname, '../public/data/eda/dong.geojson')
    if (!fs.existsSync(dongPath)) {
      throw new Error(`Dong geometry file not found: ${dongPath}`)
    }
    
    const dongData = JSON.parse(fs.readFileSync(dongPath, 'utf8'))
    console.log(`✅ Loaded ${dongData.features.length} dong geometries`)
    return dongData.features
  } catch (error) {
    console.error('❌ Error loading dong geometry:', error.message)
    process.exit(1)
  }
}

function calculatePolygonCentroid(coordinates) {
  // Handle MultiPolygon and Polygon
  let coords = coordinates
  if (coordinates[0][0][0] && Array.isArray(coordinates[0][0][0])) {
    // MultiPolygon - use first polygon
    coords = coordinates[0][0]
  } else if (coordinates[0][0] && Array.isArray(coordinates[0][0])) {
    // Polygon
    coords = coordinates[0]
  } else {
    coords = coordinates
  }
  
  let x = 0, y = 0, area = 0
  const n = coords.length
  
  for (let i = 0; i < n - 1; i++) {
    const xi = coords[i][0]
    const yi = coords[i][1]
    const xi1 = coords[i + 1][0]
    const yi1 = coords[i + 1][1]
    
    const a = xi * yi1 - xi1 * yi
    area += a
    x += (xi + xi1) * a
    y += (yi + yi1) * a
  }
  
  area *= 0.5
  x /= (6 * area)
  y /= (6 * area)
  
  return [x, y]
}

function calculateMaxDistanceFromCenter(center, coordinates) {
  let coords = coordinates
  if (coordinates[0][0][0] && Array.isArray(coordinates[0][0][0])) {
    coords = coordinates[0][0]
  } else if (coordinates[0][0] && Array.isArray(coordinates[0][0])) {
    coords = coordinates[0]
  }
  
  let maxDistance = 0
  
  coords.forEach(point => {
    const dx = point[0] - center[0]
    const dy = point[1] - center[1]
    const distance = Math.sqrt(dx * dx + dy * dy)
    maxDistance = Math.max(maxDistance, distance)
  })
  
  return maxDistance
}

function generateGradientBars(dongFeature) {
  const { properties, geometry } = dongFeature
  const center = calculatePolygonCentroid(geometry.coordinates)
  const maxDistance = calculateMaxDistanceFromCenter(center, geometry.coordinates)
  
  const gradientBars = []
  const angleStep = (2 * Math.PI) / CONFIG.RADIAL_DIRECTIONS
  
  // Generate bars in all directions
  for (let angleIndex = 0; angleIndex < CONFIG.RADIAL_DIRECTIONS; angleIndex++) {
    const angle = angleIndex * angleStep
    const cosAngle = Math.cos(angle)
    const sinAngle = Math.sin(angle)
    
    // Generate points from center to boundary (starting from 0 for connection)
    for (let distanceIndex = 0; distanceIndex <= CONFIG.POINTS_PER_DIRECTION; distanceIndex++) {
      const distanceRatio = distanceIndex / CONFIG.POINTS_PER_DIRECTION
      const actualDistance = maxDistance * distanceRatio
      
      // Calculate position
      const position = [
        center[0] + cosAngle * actualDistance,
        center[1] + sinAngle * actualDistance
      ]
      
      // Calculate height with quadratic falloff
      const heightRatio = Math.max(
        CONFIG.MIN_HEIGHT_RATIO,
        1 - Math.pow(distanceRatio, CONFIG.GRADIENT_POWER)
      )
      
      gradientBars.push({
        position: position,
        heightRatio: heightRatio,
        normalizedDistance: distanceRatio,
        angle: angle
      })
    }
  }
  
  return {
    dongCode: properties.adm_cd || properties.DONG_CD || `unknown_${Date.now()}`,
    dongName: properties.adm_nm || properties.DONG_NM || 'Unknown',
    center: center,
    maxDistance: maxDistance,
    totalBars: gradientBars.length,
    gradientBars: gradientBars
  }
}

async function generateAllDongGradientData() {
  const dongFeatures = await loadDongGeometry()
  const allGradientData = []
  
  console.log(`🔄 Processing ${dongFeatures.length} administrative dongs...`)
  
  dongFeatures.forEach((feature, index) => {
    try {
      const dongData = generateGradientBars(feature)
      allGradientData.push(dongData)
      
      if ((index + 1) % 50 === 0) {
        console.log(`   Processed ${index + 1}/${dongFeatures.length} dongs`)
      }
    } catch (error) {
      console.warn(`⚠️ Failed to process dong ${index}:`, error.message)
    }
  })
  
  return allGradientData
}

async function saveGradientData(gradientData) {
  try {
    // Ensure output directory exists
    const outputDir = path.dirname(CONFIG.OUTPUT_FILE)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    
    // Calculate statistics
    const totalBars = gradientData.reduce((sum, dong) => sum + dong.totalBars, 0)
    const avgBarsPerDong = Math.round(totalBars / gradientData.length)
    
    // Save data
    fs.writeFileSync(CONFIG.OUTPUT_FILE, JSON.stringify(gradientData, null, 2))
    const fileSize = (fs.statSync(CONFIG.OUTPUT_FILE).size / (1024 * 1024)).toFixed(2)
    
    console.log(`✅ Generated dong-gradient-bars.json`)
    console.log(`   📊 Statistics:`)
    console.log(`      • Total dongs: ${gradientData.length}`)
    console.log(`      • Total gradient bars: ${totalBars.toLocaleString()}`)
    console.log(`      • Average bars per dong: ${avgBarsPerDong}`)
    console.log(`      • File size: ${fileSize} MB`)
    
    return true
  } catch (error) {
    console.error('❌ Error saving gradient data:', error.message)
    return false
  }
}

// Main execution
async function main() {
  try {
    console.log(`🚀 Starting dong gradient data generation...`)
    console.log(`   Config: ${CONFIG.RADIAL_DIRECTIONS} directions × ${CONFIG.POINTS_PER_DIRECTION} points`)
    
    const gradientData = await generateAllDongGradientData()
    
    if (gradientData.length === 0) {
      throw new Error('No gradient data generated')
    }
    
    const success = await saveGradientData(gradientData)
    
    if (success) {
      console.log(`🎉 Dong gradient data generation completed successfully!`)
      console.log(`📁 Output: ${CONFIG.OUTPUT_FILE}`)
    } else {
      process.exit(1)
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = { main, CONFIG }