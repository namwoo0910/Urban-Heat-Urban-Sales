/**
 * Web Worker for mesh generation
 * Offloads heavy mesh generation computation to a separate thread
 */

import { generateGridMesh, MeshGeneratorOptions } from '@features/card-sales/utils/meshGenerator'

export interface WorkerMessage {
  type: 'generate'
  key: string
  data: {
    districtData: any[]
    dongBoundaries?: any[]
    dongSalesMap?: Map<number, number>
    salesHeightScale?: number
  }
  options: {
    resolution: number
    progressive?: boolean
    priority?: 'high' | 'low'
  }
}

export interface WorkerResponse {
  type: 'complete' | 'progress' | 'error'
  key: string
  geometry?: {
    positions: Float32Array
    normals: Float32Array
    texCoords: Float32Array
    indices: Uint32Array
  }
  progress?: number
  error?: string
}

// Handle messages from main thread
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { type, key, data, options } = event.data
  
  if (type === 'generate') {
    try {
      // Send initial progress
      self.postMessage({
        type: 'progress',
        key,
        progress: 0
      } as WorkerResponse)
      
      // Generate mesh
      console.log(`[MeshWorker] Starting mesh generation for ${key} at resolution ${options.resolution}...`)
      const startTime = performance.now()
      
      // Prepare mesh generator options
      const meshOptions: MeshGeneratorOptions = {
        resolution: options.resolution,
        heightScale: 1,
        smoothing: true,
        dongBoundaries: data.dongBoundaries,
        dongSalesMap: data.dongSalesMap,
        salesHeightScale: data.salesHeightScale || 100000000
      }
      
      // Simulate progress updates for longer generation times
      let progressInterval: NodeJS.Timeout | null = null
      if (options.resolution > 60) {
        progressInterval = setInterval(() => {
          const elapsed = performance.now() - startTime
          const estimatedTime = (options.resolution * options.resolution) / 50 // Rough estimate
          const estimatedProgress = Math.min(90, (elapsed / estimatedTime) * 100)
          self.postMessage({
            type: 'progress',
            key,
            progress: estimatedProgress
          } as WorkerResponse)
        }, 100)
      }
      
      // Generate the mesh
      const meshGeometry = generateGridMesh(data.districtData, meshOptions)
      
      if (progressInterval) {
        clearInterval(progressInterval)
      }
      
      // Send final progress
      self.postMessage({
        type: 'progress',
        key,
        progress: 95
      } as WorkerResponse)
      
      // Prepare response with the generated geometry
      const response: WorkerResponse = {
        type: 'complete',
        key,
        geometry: {
          positions: meshGeometry.positions,
          normals: meshGeometry.normals,
          texCoords: meshGeometry.texCoords,
          indices: meshGeometry.indices || new Uint32Array(0)
        }
      }
      
      const duration = performance.now() - startTime
      console.log(`[MeshWorker] Mesh generation complete for ${key} in ${duration.toFixed(0)}ms (resolution: ${options.resolution})`)
      
      // Send completion message
      self.postMessage(response)
      
    } catch (error) {
      console.error(`[MeshWorker] Error generating mesh for ${key}:`, error)
      self.postMessage({
        type: 'error',
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      } as WorkerResponse)
    }
  }
})

// Export dummy for TypeScript
export default null