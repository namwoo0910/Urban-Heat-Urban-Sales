#!/usr/bin/env ts-node

/**
 * Verify generated prediction mesh files
 */

import * as fs from 'fs'
import * as path from 'path'

const PREDICTION_DIR = path.join(__dirname, '../public/data/binary/prediction')

interface HeaderData {
  format: string
  version: string
  type: string
  scenario: string
  date: string
  resolution: number
  vertices: number
  triangles: number
  bounds: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  }
}

function verifyPredictions(): void {
  console.log('===========================================')
  console.log('Prediction Mesh Verification')
  console.log('===========================================')

  if (!fs.existsSync(PREDICTION_DIR)) {
    console.error(`❌ Prediction directory not found: ${PREDICTION_DIR}`)
    return
  }

  // Get all binary files
  const binFiles = fs.readdirSync(PREDICTION_DIR)
    .filter(f => f.endsWith('.bin'))
    .sort()

  console.log(`Found ${binFiles.length} binary files\n`)

  // Expected files
  const expectedWeekly = 28  // 7 days × 4 scenarios
  const expectedMonthly = 124 // 31 days × 4 scenarios
  const expectedTotal = expectedWeekly + expectedMonthly

  // Group by date and scenario
  const dateGroups = new Map<string, Set<string>>()
  const scenarioGroups = new Map<string, number>()

  binFiles.forEach(file => {
    // Parse filename: seoul-mesh-pred-YYYYMMDD-tXXX.bin
    const match = file.match(/seoul-mesh-pred-(\d{8})-t(\d{3})\.bin/)
    if (match) {
      const date = match[1]
      const scenario = `t${match[2]}`

      if (!dateGroups.has(date)) {
        dateGroups.set(date, new Set())
      }
      dateGroups.get(date)!.add(scenario)

      scenarioGroups.set(scenario, (scenarioGroups.get(scenario) || 0) + 1)
    }
  })

  // Verify weekly (first 7 days of July)
  console.log('📅 Weekly Coverage (July 1-7):')
  for (let day = 1; day <= 7; day++) {
    const date = `202407${day.toString().padStart(2, '0')}`
    const scenarios = dateGroups.get(date)
    if (scenarios) {
      console.log(`  ${date}: ${scenarios.size}/4 scenarios ${scenarios.size === 4 ? '✅' : '❌'}`)
    } else {
      console.log(`  ${date}: 0/4 scenarios ❌`)
    }
  }

  // Verify monthly (all 31 days)
  console.log('\n📅 Monthly Coverage Summary:')
  let fullyCoveredDays = 0
  for (let day = 1; day <= 31; day++) {
    const date = `202407${day.toString().padStart(2, '0')}`
    const scenarios = dateGroups.get(date)
    if (scenarios && scenarios.size === 4) {
      fullyCoveredDays++
    }
  }
  console.log(`  Days with all 4 scenarios: ${fullyCoveredDays}/31 ${fullyCoveredDays === 31 ? '✅' : '⏳'}`)

  // Scenario distribution
  console.log('\n🌡️ Temperature Scenario Distribution:')
  console.log(`  T+0.1°C (t001): ${scenarioGroups.get('t001') || 0} files`)
  console.log(`  T+0.5°C (t005): ${scenarioGroups.get('t005') || 0} files`)
  console.log(`  T+1.0°C (t010): ${scenarioGroups.get('t010') || 0} files`)
  console.log(`  T+10°C  (t100): ${scenarioGroups.get('t100') || 0} files`)

  // Verify file integrity
  console.log('\n📁 File Integrity Check:')
  let validFiles = 0
  let totalSize = 0

  for (const binFile of binFiles.slice(0, 5)) { // Check first 5 files
    const binPath = path.join(PREDICTION_DIR, binFile)
    const headerFile = binFile.replace('.bin', '.header.json')
    const headerPath = path.join(PREDICTION_DIR, headerFile)

    if (fs.existsSync(headerPath)) {
      const header: HeaderData = JSON.parse(fs.readFileSync(headerPath, 'utf8'))
      const binSize = fs.statSync(binPath).size
      totalSize += binSize

      console.log(`  ${binFile}:`)
      console.log(`    - Size: ${(binSize / 1024 / 1024).toFixed(2)} MB`)
      console.log(`    - Vertices: ${header.vertices.toLocaleString()}`)
      console.log(`    - Triangles: ${header.triangles.toLocaleString()}`)
      console.log(`    - Scenario: ${header.scenario}`)
      validFiles++
    }
  }

  // Summary
  console.log('\n===========================================')
  console.log('Summary:')
  console.log(`  Total files generated: ${binFiles.length}/${expectedTotal}`)
  console.log(`  Weekly files: ${Math.min(expectedWeekly, binFiles.length)}/28`)
  console.log(`  Monthly files: ${Math.max(0, binFiles.length - expectedWeekly)}/124`)
  console.log(`  Average file size: ${(totalSize / Math.min(5, validFiles) / 1024 / 1024).toFixed(2)} MB`)

  if (binFiles.length === expectedTotal) {
    console.log('\n✅ All prediction meshes generated successfully!')
  } else {
    console.log(`\n⏳ Generation in progress... (${((binFiles.length / expectedTotal) * 100).toFixed(1)}% complete)`)
  }
  console.log('===========================================')
}

// Run verification
verifyPredictions()