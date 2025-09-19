/**
 * InteractionHandler Component
 * 
 * Manages all user interactions with the map including hover, click, and drag events.
 * Separates interaction logic from rendering for better performance.
 */

import React, { useCallback, useMemo } from 'react'
import { debounce } from 'lodash-es'
import type { PickingInfo } from '@deck.gl/core'

interface InteractionHandlerProps {
  isDragging: boolean
  onDistrictSelect?: (gu: string | null, dong: string | null) => void
  onHover?: (info: PickingInfo) => void
  onClick?: (info: PickingInfo) => void
  onDragStart?: () => void
  onDragEnd?: () => void
  children: React.ReactElement
}

export const InteractionHandler = React.memo(({ 
  isDragging,
  onDistrictSelect,
  onHover,
  onClick,
  onDragStart,
  onDragEnd,
  children 
}: InteractionHandlerProps) => {
  
  // Debounced hover handler for performance
  const handleHover = useMemo(() => 
    debounce((info: PickingInfo) => {
      // Skip during drag for performance
      if (isDragging) return
      
      if (onHover) {
        onHover(info)
      }
      
      // Extract district information if available
      if (info.object && onDistrictSelect) {
        const properties = info.object.properties || {}
        const guName = properties.guName || properties['자치구'] || properties.SIGUNGU_NM || properties.GU_NM
        const dongName = properties.ADM_DR_NM || properties.dongName || properties['행정동'] || properties.DONG_NM
        
        if (info.layer?.id?.includes('dong') && dongName) {
          // Hovering over dong
          onDistrictSelect(guName, dongName)
        } else if (info.layer?.id?.includes('sgg') && guName) {
          // Hovering over gu
          onDistrictSelect(guName, null)
        }
      }
    }, 50),
    [isDragging, onHover, onDistrictSelect]
  )
  
  // Click handler with district selection
  const handleClick = useCallback((info: PickingInfo) => {
    if (onClick) {
      onClick(info)
    }
    
    // Handle district selection on click
    if (info.object && onDistrictSelect) {
      const properties = info.object.properties || {}
      const guName = properties.guName || properties['자치구'] || properties.SIGUNGU_NM || properties.GU_NM
      const dongName = properties.ADM_DR_NM || properties.dongName || properties['행정동'] || properties.DONG_NM
      
      if (dongName && guName) {
        // Clicked on dong - select both gu and dong
        onDistrictSelect(guName, dongName)
      } else if (guName) {
        // Clicked on gu - select only gu
        onDistrictSelect(guName, null)
      }
    }
  }, [onClick, onDistrictSelect])
  
  // Handle view state changes for drag detection
  const handleViewStateChange = useCallback((params: any) => {
    const { isDragging: dragging, isPanning, isRotating } = params.interactionState || {}
    
    if (dragging || isPanning || isRotating) {
      if (!isDragging && onDragStart) {
        onDragStart()
      }
    } else {
      if (isDragging && onDragEnd) {
        onDragEnd()
      }
    }
    
    // Pass through the original handler if child has one
    const childProps = children.props as any
    if (childProps?.onViewStateChange) {
      childProps.onViewStateChange(params)
    }
  }, [isDragging, onDragStart, onDragEnd, (children.props as any)?.onViewStateChange])
  
  // Clone child element with enhanced props
  return React.cloneElement(children, {
    ...(children.props as any),
    onHover: handleHover,
    onClick: handleClick,
    onViewStateChange: handleViewStateChange
  })
})

InteractionHandler.displayName = 'InteractionHandler'