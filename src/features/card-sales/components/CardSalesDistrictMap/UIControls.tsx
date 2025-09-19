/**
 * UIControls Component
 * 
 * Manages all UI control elements for the map visualization.
 * Includes 3D toggle, layer controls, and other map settings.
 */

import React from 'react'
import UnifiedControls from '../SalesDataControls'

interface UIControlsProps {
  // Layer visibility
  showMeshLayer: boolean
  showBoundary: boolean
  showDistrictLabels: boolean
  showDongLabels: boolean
  onToggleMesh: (show: boolean) => void
  onToggleBoundary: (show: boolean) => void
  onToggleDistrictLabels: (show: boolean) => void
  onToggleDongLabels: (show: boolean) => void

  // Layer configuration
  layerConfig: any
  onLayerConfigChange: (config: any) => void

  className?: string
}

export const UIControls = React.memo(({
  showMeshLayer,
  showBoundary,
  showDistrictLabels,
  showDongLabels,
  onToggleMesh,
  onToggleBoundary,
  onToggleDistrictLabels,
  onToggleDongLabels,
  layerConfig,
  onLayerConfigChange,
  className = ''
}: UIControlsProps) => {

  return (
    <>
      {/* Main controls in top-right corner */}
      <div className={`absolute top-4 right-4 z-40 ${className}`}>
        <UnifiedControls
          // Only valid props from UnifiedControlsProps interface
          heightScale={1}
          onHeightScaleChange={() => {}}
        />
      </div>
    </>
  )
})

UIControls.displayName = 'UIControls'