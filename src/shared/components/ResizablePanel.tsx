"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'

interface ResizablePanelProps {
  children: React.ReactNode
  initialWidth?: number
  minWidth?: number
  maxWidth?: number
  onResize?: (width: number) => void
  className?: string
}

export function ResizablePanel({
  children,
  initialWidth = 600,
  minWidth = 300,
  maxWidth,
  onResize,
  className = ''
}: ResizablePanelProps) {
  const [width, setWidth] = useState(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('chartPanelWidth')
        if (saved) {
          const parsed = parseInt(saved, 10)
          const max = maxWidth || window.innerWidth * 0.6
          if (!isNaN(parsed) && parsed >= minWidth && parsed <= max) {
            return parsed
          }
        }
      } catch (e) {
        console.warn('Failed to load saved width:', e)
      }
    }
    return initialWidth
  })
  
  const [isResizing, setIsResizing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  // Calculate max width based on viewport
  const getMaxWidth = useCallback(() => {
    return maxWidth || (typeof window !== 'undefined' ? window.innerWidth * 0.6 : 800)
  }, [maxWidth])

  // Handle mouse down on drag handle
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    startXRef.current = e.clientX
    startWidthRef.current = width
    
    // Add cursor style to body during resize
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
  }, [width])

  // Mouse move handler - memoized
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return
    
    e.preventDefault()
    const deltaX = startXRef.current - e.clientX // Reverse for left-side handle
    const newWidth = Math.min(
      Math.max(startWidthRef.current + deltaX, minWidth),
      getMaxWidth()
    )
    
    setWidth(newWidth)
    onResize?.(newWidth)
  }, [isResizing, minWidth, getMaxWidth, onResize])

  // Mouse up handler - memoized
  const handleMouseUp = useCallback(() => {
    if (!isResizing) return
    
    setIsResizing(false)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    
    // Save to localStorage
    try {
      localStorage.setItem('chartPanelWidth', width.toString())
    } catch (e) {
      console.warn('Failed to save width:', e)
    }
  }, [isResizing, width])

  // Add/remove global event listeners
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      // Also listen for mouse leave to handle edge cases
      document.addEventListener('mouseleave', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('mouseleave', handleMouseUp)
      }
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  // Handle window resize
  useEffect(() => {
    const handleWindowResize = () => {
      const maxW = getMaxWidth()
      if (width > maxW) {
        setWidth(maxW)
        onResize?.(maxW)
      }
    }

    window.addEventListener('resize', handleWindowResize)
    return () => window.removeEventListener('resize', handleWindowResize)
  }, [width, getMaxWidth, onResize])

  // Notify parent on mount with current width
  useEffect(() => {
    onResize?.(width)
  }, []) // Only on mount

  return (
    <div 
      ref={panelRef}
      className={`relative ${className}`}
      style={{ width: `${width}px` }}
    >
      {/* Drag Handle */}
      <div
        className={`absolute left-0 top-0 h-full cursor-ew-resize z-30 group select-none`}
        onMouseDown={handleMouseDown}
      >
        {/* Wider hit area for easier dragging */}
        <div className="absolute inset-y-0 -left-3 w-6">
          {/* Invisible handle - only for dragging functionality */}
          <div className="w-1 h-full bg-transparent" />
        </div>
      </div>

      {/* Panel Content */}
      <div className="h-full pl-2">
        {children}
      </div>
    </div>
  )
}

export default ResizablePanel