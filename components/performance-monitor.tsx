"use client"

import { useEffect, useState, useRef } from 'react'

interface PerformanceConfig {
  particleCount: number
  connectionCount: number
  fps: number
  glowLayers: number
}

interface PerformanceMonitorProps {
  performanceLevel: string
  config: PerformanceConfig
  particleCount: number
  animatedDataCount: number
  connectionsCount: number
}

interface MemoryInfo {
  usedJSHeapSize?: number
  totalJSHeapSize?: number
  jsHeapSizeLimit?: number
}

export function PerformanceMonitor({
  performanceLevel,
  config,
  particleCount,
  animatedDataCount,
  connectionsCount
}: PerformanceMonitorProps) {
  const [fps, setFps] = useState(0)
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo>({})
  const frameCount = useRef(0)
  const lastTime = useRef(performance.now())
  
  // FPS monitoring
  useEffect(() => {
    const updateFPS = () => {
      frameCount.current++
      const currentTime = performance.now()
      
      if (currentTime - lastTime.current >= 1000) {
        setFps(Math.round((frameCount.current * 1000) / (currentTime - lastTime.current)))
        frameCount.current = 0
        lastTime.current = currentTime
      }
      
      requestAnimationFrame(updateFPS)
    }
    
    const animationId = requestAnimationFrame(updateFPS)
    return () => cancelAnimationFrame(animationId)
  }, [])
  
  // Memory monitoring
  useEffect(() => {
    const updateMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        setMemoryInfo({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        })
      }
    }
    
    updateMemory()
    const interval = setInterval(updateMemory, 2000)
    return () => clearInterval(interval)
  }, [])
  
  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }
  
  const getPerformanceColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-400'
      case 'medium': return 'text-yellow-400'
      case 'low': return 'text-red-400'
      default: return 'text-white'
    }
  }
  
  const getFPSColor = (fps: number) => {
    if (fps >= 50) return 'text-green-400'
    if (fps >= 30) return 'text-yellow-400'
    return 'text-red-400'
  }
  
  return (
    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded px-3 py-2 text-xs text-white/80 font-mono min-w-[200px]">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 border-b border-white/20 pb-1 mb-1">
          <span className="text-white/60">Performance Monitor</span>
        </div>
        
        <div>Level:</div>
        <div className={getPerformanceColor(performanceLevel)}>
          {performanceLevel.toUpperCase()}
        </div>
        
        <div>FPS:</div>
        <div className={getFPSColor(fps)}>
          {fps} / {config.fps}
        </div>
        
        <div>Particles:</div>
        <div>{particleCount.toLocaleString()}</div>
        
        <div>Animated:</div>
        <div>{animatedDataCount.toLocaleString()}</div>
        
        <div>Connections:</div>
        <div>{connectionsCount.toLocaleString()}</div>
        
        {memoryInfo.usedJSHeapSize && (
          <>
            <div>JS Heap:</div>
            <div>
              {formatBytes(memoryInfo.usedJSHeapSize)} / {formatBytes(memoryInfo.totalJSHeapSize)}
            </div>
          </>
        )}
        
        <div className="col-span-2 border-t border-white/20 pt-1 mt-1">
          <div className="text-white/40 text-[10px]">
            Memory usage: {memoryInfo.usedJSHeapSize && memoryInfo.totalJSHeapSize 
              ? Math.round((memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize) * 100) 
              : 0}%
          </div>
        </div>
      </div>
    </div>
  )
}