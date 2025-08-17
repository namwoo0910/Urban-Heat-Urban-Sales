/**
 * React hook for using the particle generation Web Worker
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import type { ParticleData } from '../utils/particleGenerator'

interface WorkerState {
  isGenerating: boolean
  progress: number
  error: string | null
}

export function useParticleWorker() {
  const workerRef = useRef<Worker | null>(null)
  const [state, setState] = useState<WorkerState>({
    isGenerating: false,
    progress: 0,
    error: null
  })

  useEffect(() => {
    // Create worker instance
    workerRef.current = new Worker(
      new URL('@/src/workers/particleWorker.ts', import.meta.url)
    )

    // Setup message handler
    workerRef.current.onmessage = (e: MessageEvent) => {
      const { type, payload } = e.data

      if (type === 'progress' && payload?.progress !== undefined) {
        setState(prev => ({ ...prev, progress: payload.progress }))
      } else if (type === 'complete') {
        setState(prev => ({ 
          ...prev, 
          isGenerating: false, 
          progress: 100 
        }))
      } else if (type === 'error') {
        setState(prev => ({ 
          ...prev, 
          isGenerating: false, 
          error: payload?.error || 'Unknown error' 
        }))
      }
    }

    workerRef.current.onerror = (error) => {
      console.error('[ParticleWorker] Error:', error)
      setState(prev => ({ 
        ...prev, 
        isGenerating: false, 
        error: 'Worker error' 
      }))
    }

    return () => {
      workerRef.current?.terminate()
    }
  }, [])

  const generateParticles = useCallback(
    (
      count: number,
      gridData: any,
      colorTheme: string,
      highDensityAreas: any[]
    ): Promise<ParticleData[]> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error('Worker not initialized'))
          return
        }

        setState({
          isGenerating: true,
          progress: 0,
          error: null
        })

        // Setup one-time message handler for this generation
        const handleMessage = (e: MessageEvent) => {
          const { type, payload } = e.data

          if (type === 'complete' && payload?.particles) {
            workerRef.current?.removeEventListener('message', handleMessage)
            resolve(payload.particles)
          } else if (type === 'error') {
            workerRef.current?.removeEventListener('message', handleMessage)
            reject(new Error(payload?.error || 'Generation failed'))
          }
        }

        workerRef.current.addEventListener('message', handleMessage)

        // Send generation request to worker
        workerRef.current.postMessage({
          type: 'generate',
          payload: {
            count,
            gridData,
            colorTheme,
            highDensityAreas
          }
        })
      })
    },
    []
  )

  const cancelGeneration = useCallback(() => {
    if (workerRef.current && state.isGenerating) {
      workerRef.current.postMessage({ type: 'cancel' })
      setState(prev => ({ 
        ...prev, 
        isGenerating: false,
        progress: 0 
      }))
    }
  }, [state.isGenerating])

  return {
    generateParticles,
    cancelGeneration,
    isGenerating: state.isGenerating,
    progress: state.progress,
    error: state.error
  }
}

export default useParticleWorker