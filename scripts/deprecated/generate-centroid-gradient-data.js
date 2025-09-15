#!/usr/bin/env node

/**
 * Generate Centroid-based Gaussian Gradient Data
 * Based on grid_0811.py logic for smooth gradient from dong centers
 */

const fs = require('fs')
const path = require('path')
const turf = require('@turf/turf')

// Configuration (based on grid_0811.py parameters)
const CONFIG = {
  GRID_RESOLUTION: 0.0001,    // ~10m grid spacing in degrees
  DISTRIBUTION_METHOD: 'gaussian',  // 'gaussian' or 'inverse_distance'
  DISTRIBUTION_RADIUS: 0.015,  // ~1.5km in degrees
  GAUSSIAN_SIGMA: 0.005,       // σ for gaussian falloff (~500m)
  MIN_HEIGHT_RATIO: 0.01,      // 1% minimum at edges
  OUTPUT_FILE: path.join(__dirname, '../public/data/centroid-gradient.json')
}

console.log('🏗️ Generating centroid-based Gaussian gradient data...')

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

/**
 * Calculate centroid using turf for accuracy
 */
function calculateCentroid(geometry) {
  const feature = turf.feature(geometry)
  const centroid = turf.centroid(feature)
  return centroid.geometry.coordinates
}

/**
 * Get bounding box of a polygon
 */
function getBounds(geometry) {
  const feature = turf.feature(geometry)
  const bbox = turf.bbox(feature)
  return {
    minX: bbox[0],
    minY: bbox[1],
    maxX: bbox[2],
    maxY: bbox[3]
  }
}

/**
 * Check if a point is inside a polygon
 */
function isPointInPolygon(point, geometry) {
  const pt = turf.point(point)
  const poly = turf.feature(geometry)
  return turf.booleanPointInPolygon(pt, poly)
}

/**
 * Calculate Gaussian weight (from grid_0811.py line 201-202)
 */
function gaussianWeight(distance, sigma) {
  return Math.exp(-(distance * distance) / (2 * sigma * sigma))
}

/**
 * Calculate inverse distance weight (from grid_0811.py line 205-206)
 */
function inverseDistanceWeight(distance) {
  return 1.0 / (1.0 + distance)
}

/**
 * Generate grid points with Gaussian weights for a dong
 */
function generateCentroidGradient(dongFeature) {
  const { properties, geometry } = dongFeature
  const centroid = calculateCentroid(geometry)
  const bounds = getBounds(geometry)
  
  const gridPoints = []
  
  // Create dense grid within dong bounds
  for (let x = bounds.minX; x <= bounds.maxX; x += CONFIG.GRID_RESOLUTION) {
    for (let y = bounds.minY; y <= bounds.maxY; y += CONFIG.GRID_RESOLUTION) {
      const point = [x, y]
      
      // Only include points inside the dong polygon
      if (isPointInPolygon(point, geometry)) {
        const dx = centroid[0] - x
        const dy = centroid[1] - y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        // Calculate weight based on method
        let weight = 0
        if (CONFIG.DISTRIBUTION_METHOD === 'gaussian') {
          weight = gaussianWeight(distance, CONFIG.GAUSSIAN_SIGMA)
        } else if (CONFIG.DISTRIBUTION_METHOD === 'inverse_distance') {
          weight = inverseDistanceWeight(distance)
        }
        
        // Normalize distance for color gradient
        const normalizedDistance = Math.min(distance / CONFIG.DISTRIBUTION_RADIUS, 1.0)
        
        // Only include points within distribution radius or with significant weight
        if (weight > CONFIG.MIN_HEIGHT_RATIO) {
          gridPoints.push({
            position: point,
            distanceFromCentroid: distance,
            gaussianWeight: weight,
            normalizedDistance: normalizedDistance
          })
        }
      }
    }
  }
  
  // Sort by weight for better rendering (highest first)
  gridPoints.sort((a, b) => b.gaussianWeight - a.gaussianWeight)
  
  return {
    dongCode: properties.ADM_CD || properties.adm_cd || `unknown_${Date.now()}`,
    dongName: properties.ADM_NM || properties.adm_nm || 'Unknown',
    centroid: centroid,
    bounds: bounds,
    distributionRadius: CONFIG.DISTRIBUTION_RADIUS,
    totalPoints: gridPoints.length,
    gridPoints: gridPoints
  }
}

/**
 * Generate gradient data for all dongs
 */
async function generateAllCentroidGradientData() {
  const dongFeatures = await loadDongGeometry()
  const allGradientData = []
  
  console.log(`🔄 Processing ${dongFeatures.length} administrative dongs...`)
  console.log(`   📏 Grid resolution: ${CONFIG.GRID_RESOLUTION} degrees (~${(CONFIG.GRID_RESOLUTION * 111000).toFixed(1)}m)`)
  console.log(`   📊 Distribution: ${CONFIG.DISTRIBUTION_METHOD}`)
  console.log(`   📍 Radius: ${CONFIG.DISTRIBUTION_RADIUS} degrees (~${(CONFIG.DISTRIBUTION_RADIUS * 111).toFixed(1)}km)`)
  
  dongFeatures.forEach((feature, index) => {
    try {
      const dongData = generateCentroidGradient(feature)
      
      // Limit points per dong to manage file size
      const MAX_POINTS_PER_DONG = 500
      if (dongData.gridPoints.length > MAX_POINTS_PER_DONG) {
        // Sample points with bias towards higher weights
        const step = Math.ceil(dongData.gridPoints.length / MAX_POINTS_PER_DONG)
        dongData.gridPoints = dongData.gridPoints.filter((_, i) => i % step === 0)
        dongData.totalPoints = dongData.gridPoints.length
      }
      
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

/**
 * Save gradient data to JSON
 */
async function saveGradientData(gradientData) {
  try {
    // Ensure output directory exists
    const outputDir = path.dirname(CONFIG.OUTPUT_FILE)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    
    // Calculate statistics
    const totalPoints = gradientData.reduce((sum, dong) => sum + dong.totalPoints, 0)
    const avgPointsPerDong = Math.round(totalPoints / gradientData.length)
    
    // Save data
    fs.writeFileSync(CONFIG.OUTPUT_FILE, JSON.stringify(gradientData, null, 2))
    const fileSize = (fs.statSync(CONFIG.OUTPUT_FILE).size / (1024 * 1024)).toFixed(2)
    
    console.log(`✅ Generated centroid-gradient.json`)
    console.log(`   📊 Statistics:`)
    console.log(`      • Total dongs: ${gradientData.length}`)
    console.log(`      • Total grid points: ${totalPoints.toLocaleString()}`)
    console.log(`      • Average points per dong: ${avgPointsPerDong}`)
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
    console.log(`🚀 Starting centroid-based Gaussian gradient generation...`)
    console.log(`   Method: ${CONFIG.DISTRIBUTION_METHOD}`)
    console.log(`   Sigma: ${CONFIG.GAUSSIAN_SIGMA} (~${(CONFIG.GAUSSIAN_SIGMA * 111000).toFixed(0)}m)`)
    
    const gradientData = await generateAllCentroidGradientData()
    
    if (gradientData.length === 0) {
      throw new Error('No gradient data generated')
    }
    
    const success = await saveGradientData(gradientData)
    
    if (success) {
      console.log(`🎉 Centroid gradient data generation completed successfully!`)
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