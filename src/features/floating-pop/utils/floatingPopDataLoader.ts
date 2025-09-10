/**
 * Floating population data loading and processing utilities
 */

import type { 
  FloatingPopulationData, 
  HourlyPopulationData 
} from '../types'
import type { DistrictFilterState } from '@/src/shared/types/district-data'

/**
 * Load floating population data from API or file
 * This is a mock implementation - replace with actual data source
 */
export async function loadFloatingPopulationData(
  filters?: DistrictFilterState
): Promise<any> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // Generate mock data for testing
  // Replace this with actual API call or file loading
  const mockData = generateMockPopulationData()
  
  // Apply filters if provided
  if (filters?.selectedGu) {
    // Filter by district
  }
  if (filters?.selectedDong) {
    // Filter by dong
  }
  
  return mockData
}

/**
 * Process raw population data into structured format
 */
export function processPopulationData(rawData: any): {
  populationData: FloatingPopulationData[]
  hourlyData: HourlyPopulationData[]
} {
  const populationData: FloatingPopulationData[] = []
  const hourlyData: HourlyPopulationData[] = []
  
  // Process raw data into structured format
  // This is where you'd transform API response or file data
  
  // Mock processing
  const dongs = generateDongList()
  
  dongs.forEach(dong => {
    // Create population data for each dong
    const totalPop = Math.floor(Math.random() * 50000) + 10000
    
    populationData.push({
      dongCode: dong.code,
      dongName: dong.name,
      sggName: dong.sggName,
      sggCode: dong.sggCode,
      centroid: dong.centroid,
      totalPopulation: totalPop,
      populationByAge: {
        '10대': Math.floor(totalPop * 0.1),
        '20대': Math.floor(totalPop * 0.25),
        '30대': Math.floor(totalPop * 0.3),
        '40대': Math.floor(totalPop * 0.2),
        '50대': Math.floor(totalPop * 0.1),
        '60대+': Math.floor(totalPop * 0.05)
      },
      populationByGender: {
        male: Math.floor(totalPop * 0.48),
        female: Math.floor(totalPop * 0.52)
      },
      hourlyFlow: Array.from({ length: 24 }, () => 
        Math.floor(Math.random() * 5000) + 1000
      ),
      peakHour: Math.floor(Math.random() * 24),
      avgStayDuration: Math.floor(Math.random() * 120) + 30,
      inflow: Math.floor(Math.random() * 10000),
      outflow: Math.floor(Math.random() * 8000)
    })
    
    // Generate hourly data
    for (let hour = 0; hour < 24; hour++) {
      hourlyData.push({
        hour,
        dongCode: dong.code,
        population: Math.floor(Math.random() * 5000) + 1000,
        inflow: Math.floor(Math.random() * 2000),
        outflow: Math.floor(Math.random() * 1800),
        density: Math.random() * 10000
      })
    }
  })
  
  return { populationData, hourlyData }
}

/**
 * Generate mock dong list for testing
 */
function generateDongList() {
  return [
    { code: 11010, name: '청운효자동', sggName: '종로구', sggCode: 11, centroid: [126.97, 37.58] as [number, number] },
    { code: 11020, name: '사직동', sggName: '종로구', sggCode: 11, centroid: [126.97, 37.57] as [number, number] },
    { code: 11030, name: '삼청동', sggName: '종로구', sggCode: 11, centroid: [126.98, 37.58] as [number, number] },
    { code: 11680, name: '역삼1동', sggName: '강남구', sggCode: 11680, centroid: [127.03, 37.50] as [number, number] },
    { code: 11690, name: '역삼2동', sggName: '강남구', sggCode: 11680, centroid: [127.04, 37.50] as [number, number] },
    { code: 11700, name: '도곡1동', sggName: '강남구', sggCode: 11680, centroid: [127.05, 37.49] as [number, number] },
    // Add more dongs as needed
  ]
}

/**
 * Generate mock population data for testing
 */
function generateMockPopulationData() {
  return {
    timestamp: new Date().toISOString(),
    data: generateDongList().map(dong => ({
      ...dong,
      population: Math.floor(Math.random() * 50000) + 10000
    }))
  }
}

/**
 * Calculate population color based on density
 */
export function getPopulationColor(
  population: number,
  maxPopulation: number
): [number, number, number, number] {
  const ratio = population / maxPopulation
  
  if (ratio > 0.8) return [255, 0, 0, 200]      // Red - very high
  if (ratio > 0.6) return [255, 100, 0, 200]    // Orange - high
  if (ratio > 0.4) return [255, 200, 0, 200]    // Yellow - medium
  if (ratio > 0.2) return [100, 255, 0, 200]    // Light green - low
  return [0, 255, 0, 200]                       // Green - very low
}

/**
 * Calculate population height for 3D visualization
 */
export function getPopulationHeight(
  population: number,
  maxPopulation: number,
  baseHeight: number = 100,
  maxHeight: number = 1000
): number {
  const ratio = population / maxPopulation
  return baseHeight + (maxHeight - baseHeight) * ratio
}