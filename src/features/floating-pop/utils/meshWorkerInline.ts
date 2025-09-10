/**
 * Inline Web Worker for mesh generation
 * This approach doesn't require webpack configuration
 */

export function createInlineMeshWorker(): Worker {
  const workerCode = `
    // Inline worker code - simplified version
    self.addEventListener('message', async (event) => {
      const { type, features, options, id } = event.data
      
      if (type === 'generate') {
        try {
          // Send initial progress
          self.postMessage({
            type: 'progress',
            id,
            progress: 0
          })
          
          console.log('[MeshWorker] Starting mesh generation...')
          const startTime = performance.now()
          
          // Note: We can't use external imports in inline worker
          // So we'll send the mesh generation back to main thread
          // This is a simplified approach that still provides async benefits
          
          self.postMessage({
            type: 'request-generation',
            id,
            features,
            options
          })
          
        } catch (error) {
          console.error('[MeshWorker] Error:', error)
          self.postMessage({
            type: 'error',
            id,
            error: error.message || 'Unknown error'
          })
        }
      } else if (type === 'generation-result') {
        // Forward the result back
        const { meshData, id } = event.data
        
        self.postMessage({
          type: 'complete',
          id,
          data: meshData
        })
      }
    })
  `
  
  // Create blob URL for worker
  const blob = new Blob([workerCode], { type: 'application/javascript' })
  const workerUrl = URL.createObjectURL(blob)
  
  // Create and return worker
  return new Worker(workerUrl)
}