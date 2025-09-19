#!/usr/bin/env ts-node

/**
 * Build daily/monthly average temperature index for fast HUD/color updates.
 * Input: public/data/local_economy/monthly/2024-MM.json (12 files)
 * Output: public/data/indices/daily-avg-temp-2024.json
 *
 * Structure:
 * {
 *   year: 2024,
 *   unit: "C",
 *   daily: { "20240101": 0.0, ... },
 *   monthly: { "202401": 0.0, ... }
 * }
 */

import * as fs from 'fs'
import * as path from 'path'

const YEAR = 2024
const MONTHLY_DIR = path.join(__dirname, '../public/data/local_economy/monthly')
const OUT_DIR = path.join(__dirname, '../public/data/indices')
const OUT_FILE = path.join(OUT_DIR, `daily-avg-temp-${YEAR}.json`)

interface RawItem {
  기준일자: string
  일평균기온?: number
}

function listMonthlyFiles(dir: string, year: number): string[] {
  const files = fs.readdirSync(dir)
  return files
    .filter(f => f.startsWith(`${year}-`) && f.endsWith('.json'))
    .sort()
}

function buildIndex(): { daily: Record<string, number>; monthly: Record<string, number> } {
  const daily: Record<string, number> = {}
  const dailyCount: Record<string, number> = {}
  const monthly: Record<string, number> = {}
  const monthlyCount: Record<string, number> = {}

  const files = listMonthlyFiles(MONTHLY_DIR, YEAR)
  if (files.length === 0) {
    throw new Error(`No monthly files found in ${MONTHLY_DIR}`)
  }

  for (const file of files) {
    const ym = file.replace('.json', '') // e.g., 2024-01
    const ymKey = ym.replace('-', '') // 202401
    const fp = path.join(MONTHLY_DIR, file)
    const arr: RawItem[] = JSON.parse(fs.readFileSync(fp, 'utf8'))

    // Monthly aggregate
    let mSum = 0
    let mCnt = 0

    for (const item of arr) {
      const date = item.기준일자 // YYYY-MM-DD
      if (!date || date.length !== 10) continue
      const t = typeof item.일평균기온 === 'number' ? item.일평균기온 : null
      if (t === null || isNaN(t)) continue

      // Daily aggregate
      const dKey = date.replace(/-/g, '') // YYYYMMDD
      daily[dKey] = (daily[dKey] || 0) + t
      dailyCount[dKey] = (dailyCount[dKey] || 0) + 1

      // Monthly aggregate
      mSum += t
      mCnt += 1
    }

    if (mCnt > 0) {
      monthly[ymKey] = mSum / mCnt
      monthlyCount[ymKey] = mCnt
    }
  }

  // Finalize daily averages
  Object.keys(daily).forEach(dKey => {
    const cnt = dailyCount[dKey] || 1
    daily[dKey] = daily[dKey] / cnt
  })

  return { daily, monthly }
}

function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })
  const idx = buildIndex()
  const out = {
    year: YEAR,
    unit: 'C',
    daily: idx.daily,
    monthly: idx.monthly
  }
  fs.writeFileSync(OUT_FILE, JSON.stringify(out))
  console.log(`✅ Temperature index written: ${OUT_FILE}`)
}

main()

