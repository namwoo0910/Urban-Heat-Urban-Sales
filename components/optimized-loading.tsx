/**
 * Optimized Loading Components
 * High-performance loading states with minimal resource usage
 */

"use client"

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface LoadingProgress {
  progress: number
  stage: string
  details?: string
}

/**
 * Minimal loading spinner with optimized animations
 */
export function MinimalLoadingSpinner({ 
  size = 40, 
  color = '#ffffff',
  className = '' 
}: {
  size?: number
  color?: string
  className?: string
}) {
  return (
    <div 
      className={`inline-block ${className}`}
      style={{ 
        width: size, 
        height: size,
        borderRadius: '50%',
        border: `2px solid transparent`,
        borderTop: `2px solid ${color}`,
        animation: 'spin 1s linear infinite'
      }}
    >
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

/**
 * Progressive loading bar with stage indicators
 */
export function ProgressiveLoadingBar({ 
  progress, 
  stage, 
  details,
  className = ''
}: LoadingProgress & { className?: string }) {
  const progressRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (progressRef.current) {
      progressRef.current.style.width = `${Math.min(100, Math.max(0, progress * 100))}%`
    }
  }, [progress])
  
  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      {/* Progress bar */}
      <div className="w-full bg-gray-800 rounded-full h-2 mb-4">
        <div 
          ref={progressRef}
          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: '0%' }}
        />
      </div>
      
      {/* Stage information */}
      <div className="text-center text-white">
        <div className="text-sm font-medium mb-1">{stage}</div>
        {details && (
          <div className="text-xs text-gray-400">{details}</div>
        )}
        <div className="text-xs text-gray-500 mt-1">
          {Math.round(progress * 100)}%
        </div>
      </div>
    </div>
  )
}

/**
 * Data loading component with chunked progress
 */
export function DataLoadingIndicator({
  totalChunks,
  loadedChunks,
  currentChunk,
  dataType = 'data',
  className = ''
}: {
  totalChunks: number
  loadedChunks: number
  currentChunk?: string
  dataType?: string
  className?: string
}) {
  const progress = totalChunks > 0 ? loadedChunks / totalChunks : 0
  
  return (
    <div className={`text-center text-white ${className}`}>
      <div className="mb-4">
        <MinimalLoadingSpinner size={32} />
      </div>
      
      <div className="text-sm font-medium mb-2">
        Loading {dataType}...
      </div>
      
      <div className="text-xs text-gray-400 mb-4">
        {loadedChunks} of {totalChunks} chunks loaded
      </div>
      
      {currentChunk && (
        <div className="text-xs text-gray-500">
          Current: {currentChunk}
        </div>
      )}
      
      <div className="w-32 bg-gray-800 rounded-full h-1 mx-auto mt-2">
        <div 
          className="bg-blue-500 h-1 rounded-full transition-all duration-200"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  )
}

/**
 * Map loading component with adaptive performance
 */
export function MapLoadingPlaceholder({
  performanceLevel = 'medium',
  className = ''
}: {
  performanceLevel?: 'low' | 'medium' | 'high'
  className?: string
}) {
  const animationComplexity = {
    low: 1,
    medium: 2,
    high: 3
  }[performanceLevel]
  
  return (
    <div className={`absolute inset-0 bg-black flex items-center justify-center ${className}`}>
      {/* Background grid pattern */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />
      
      {/* Loading content */}
      <div className="relative z-10 text-center">
        {/* Animated rings for higher performance levels */}
        {animationComplexity >= 2 && (
          <div className="relative w-16 h-16 mx-auto mb-4">
            {Array.from({ length: animationComplexity }).map((_, i) => (
              <div
                key={i}
                className="absolute inset-0 rounded-full border-2 opacity-30"
                style={{
                  borderColor: ['#8b5cf6', '#06b6d4', '#10b981'][i % 3],
                  animation: `ping 2s infinite ${i * 0.3}s`,
                  animationDelay: `${i * 0.3}s`
                }}
              />
            ))}
          </div>
        )}
        
        {/* Simple spinner for low performance */}
        {animationComplexity === 1 && (
          <div className="mb-4">
            <MinimalLoadingSpinner size={32} />
          </div>
        )}
        
        <div className="text-white text-sm font-medium">
          Loading Map Visualization
        </div>
        <div className="text-gray-400 text-xs mt-1">
          Preparing particle system...
        </div>
      </div>
      
      <style jsx>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}

/**
 * Component loading skeleton
 */
export function ComponentSkeleton({
  height = 400,
  className = ''
}: {
  height?: number
  className?: string
}) {
  return (
    <div 
      className={`bg-gray-900 rounded-lg overflow-hidden ${className}`}
      style={{ height }}
    >
      <div className="animate-pulse">
        {/* Header skeleton */}
        <div className="h-16 bg-gray-800 mb-4" />
        
        {/* Content skeleton */}
        <div className="p-4 space-y-4">
          <div className="h-4 bg-gray-800 rounded w-3/4" />
          <div className="h-4 bg-gray-800 rounded w-1/2" />
          <div className="h-32 bg-gray-800 rounded" />
          <div className="flex space-x-4">
            <div className="h-4 bg-gray-800 rounded flex-1" />
            <div className="h-4 bg-gray-800 rounded flex-1" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Error boundary loading state
 */
export function ErrorFallback({
  error,
  retry,
  className = ''
}: {
  error?: Error
  retry?: () => void
  className?: string
}) {
  return (
    <div className={`text-center text-white p-8 ${className}`}>
      <div className="text-red-500 text-4xl mb-4">⚠️</div>
      <div className="text-lg font-medium mb-2">
        Something went wrong
      </div>
      <div className="text-sm text-gray-400 mb-4">
        {error?.message || 'An unexpected error occurred'}
      </div>
      {retry && (
        <button
          onClick={retry}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  )
}

/**
 * Intelligent loading component that adapts based on content type
 */
export function AdaptiveLoader({
  type = 'default',
  progress,
  stage,
  details,
  performanceLevel = 'medium',
  error,
  retry,
  className = ''
}: {
  type?: 'default' | 'map' | 'data' | 'component'
  progress?: number
  stage?: string
  details?: string
  performanceLevel?: 'low' | 'medium' | 'high'
  error?: Error
  retry?: () => void
  className?: string
}) {
  // Show error state if error exists
  if (error) {
    return <ErrorFallback error={error} retry={retry} className={className} />
  }
  
  // Show appropriate loader based on type
  switch (type) {
    case 'map':
      return (
        <MapLoadingPlaceholder 
          performanceLevel={performanceLevel}
          className={className}
        />
      )
      
    case 'data':
      if (typeof progress === 'number' && stage) {
        return (
          <div className={`flex items-center justify-center min-h-[200px] ${className}`}>
            <ProgressiveLoadingBar
              progress={progress}
              stage={stage}
              details={details}
            />
          </div>
        )
      }
      return (
        <div className={`flex items-center justify-center min-h-[200px] ${className}`}>
          <DataLoadingIndicator
            totalChunks={10}
            loadedChunks={Math.floor((progress || 0) * 10)}
            dataType="visualization data"
          />
        </div>
      )
      
    case 'component':
      return <ComponentSkeleton className={className} />
      
    default:
      return (
        <div className={`flex items-center justify-center min-h-[200px] ${className}`}>
          <div className="text-center">
            <MinimalLoadingSpinner size={40} className="mb-4" />
            <div className="text-white text-sm">
              {stage || 'Loading...'}
            </div>
            {details && (
              <div className="text-gray-400 text-xs mt-1">
                {details}
              </div>
            )}
          </div>
        </div>
      )
  }
}

export default AdaptiveLoader