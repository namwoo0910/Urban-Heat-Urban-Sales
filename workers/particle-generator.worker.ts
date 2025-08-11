/**
 * Web Worker for parallel particle generation
 * Offloads heavy computation from the main thread
 */

// Import types only (Web Workers have limited module support)
interface WorkerMessage {
  type: 'generate' | 'cancel'
  payload?: {
    count: number
    gridData: any
    colorTheme: string
    highDensityAreas: any[]
  }
}

interface WorkerResponse {
  type: 'progress' | 'complete' | 'error'
  payload?: {
    progress?: number
    particles?: any[]
    error?: string
  }
}

// Constants
const TWO_PI = Math.PI * 2

// Color themes (duplicated here since we can't import)
const COLOR_THEMES: Record<string, number[][]> = {
  current: [
    [138, 43, 226],   // 보라색
    [65, 105, 225],   // 로열 블루
    [0, 191, 255],    // 딥 스카이 블루
    [72, 209, 204],   // 청록색
    [147, 112, 219],  // 미디엄 퍼플
    [100, 149, 237],  // 콘플라워 블루
    [176, 224, 230],  // 파우더 블루
    [255, 105, 180],  // 핫 핑크
    [221, 160, 221],  // 자두색
  ],
  ocean: [
    [0, 119, 190],
    [0, 180, 216],
    [144, 224, 239],
    [72, 202, 228],
    [0, 150, 199],
    [3, 169, 244],
    [129, 212, 250],
    [0, 96, 100],
    [0, 188, 212],
  ],
  sunset: [
    [255, 94, 77],
    [255, 154, 0],
    [255, 206, 84],
    [237, 117, 57],
    [255, 171, 64],
    [255, 87, 51],
    [251, 140, 90],
    [255, 193, 7],
    [255, 111, 97],
  ],
}

let isGenerating = false

// Message handler
self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, payload } = e.data

  if (type === 'cancel') {
    isGenerating = false
    return
  }

  if (type === 'generate' && payload) {
    isGenerating = true
    
    try {
      const particles = await generateParticlesInWorker(
        payload.count,
        payload.gridData,
        payload.colorTheme,
        payload.highDensityAreas
      )
      
      if (isGenerating) {
        const response: WorkerResponse = {
          type: 'complete',
          payload: { particles }
        }
        self.postMessage(response)
      }
    } catch (error) {
      const response: WorkerResponse = {
        type: 'error',
        payload: { 
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
      self.postMessage(response)
    }
  }
}

async function generateParticlesInWorker(
  count: number,
  gridData: any,
  colorTheme: string,
  highDensityAreas: any[]
): Promise<any[]> {
  const particles = []
  const selectedPalette = COLOR_THEMES[colorTheme] || COLOR_THEMES.current
  const colorCount = selectedPalette.length
  
  // Generate stratified points
  const points = generateStratifiedPointsWorker(count * 1.5, gridData)
  
  let validCount = 0
  let lastProgress = 0
  
  for (let i = 0; i < points.length && validCount < count; i++) {
    if (!isGenerating) break
    
    const point = points[i]
    const density = getAreaDensityWorker(point.lng, point.lat, highDensityAreas)
    
    // Apply density-based filtering
    if (Math.random() > density * 0.7) continue
    
    const colorIndex = (Math.random() * colorCount) | 0
    const color = selectedPalette[colorIndex]
    const sizeFactor = 0.7 + density * 0.3
    const baseSize = 30 + Math.random() * 80
    
    particles.push({
      position: [point.lng, point.lat],
      color: color,
      size: baseSize * sizeFactor,
      speed: 0.0002 + Math.random() * 0.0005,
      phase: Math.random() * TWO_PI,
      amplitude: 0.001 + Math.random() * 0.002,
      district: point.district
    })
    
    validCount++
    
    // Report progress
    const progress = Math.floor((validCount / count) * 100)
    if (progress > lastProgress + 5) {
      lastProgress = progress
      const response: WorkerResponse = {
        type: 'progress',
        payload: { progress }
      }
      self.postMessage(response)
    }
  }
  
  return particles
}

function generateStratifiedPointsWorker(
  count: number,
  gridData: any
): any[] {
  const points = []
  const { grid, districtGrid, districtNames, bounds, cellWidth, cellHeight } = gridData
  const gridResolution = Math.sqrt(grid.length)
  
  // Find valid cells
  const validCells = []
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] === 1) {
      validCells.push(i)
    }
  }
  
  if (validCells.length === 0) return points
  
  const pointsPerCell = Math.max(1, Math.floor(count / validCells.length))
  const extraPoints = count - (pointsPerCell * validCells.length)
  
  for (let i = 0; i < validCells.length && points.length < count; i++) {
    const cellIndex = validCells[i]
    const row = Math.floor(cellIndex / gridResolution)
    const col = cellIndex % gridResolution
    
    const cellPoints = i < extraPoints ? pointsPerCell + 1 : pointsPerCell
    
    for (let j = 0; j < cellPoints && points.length < count; j++) {
      const lng = bounds.minLng + (col + Math.random()) * cellWidth
      const lat = bounds.minLat + (row + Math.random()) * cellHeight
      
      const districtIndex = districtGrid[cellIndex]
      const district = districtNames[districtIndex] || null
      
      points.push({ lng, lat, district })
    }
  }
  
  return points
}

function getAreaDensityWorker(
  lng: number, 
  lat: number, 
  highDensityAreas: any[]
): number {
  let maxDensity = 0.5
  
  for (const area of highDensityAreas) {
    const dx = lng - area.center[0]
    const dy = lat - area.center[1]
    const distSq = dx * dx + dy * dy
    const radiusSq = area.radius * area.radius
    
    if (distSq < radiusSq) {
      const factor = 1 - (distSq / radiusSq)
      const density = area.density * factor
      maxDensity = Math.max(maxDensity, density)
    }
  }
  
  return maxDensity
}

// Export for TypeScript
export {}