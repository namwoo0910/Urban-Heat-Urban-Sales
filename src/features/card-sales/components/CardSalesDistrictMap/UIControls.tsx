/**
 * UIControls Component
 * 
 * Manages all UI control elements for the map visualization.
 * Includes 3D toggle, layer controls, and other map settings.
 */

import React from 'react'
import UnifiedControls from '../SalesDataControls'
import LocalEconomyFilterPanel from '../LocalEconomyFilterPanel'
import type { FilterState } from '../LocalEconomyFilterPanel'
import { RotateCcw } from 'lucide-react'

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
  
  // Filter state
  selectedGu: string | null
  selectedDong: string | null
  selectedBusinessType: string | null
  selectedDate: string | null
  onFilterChange: (filters: FilterState) => void
  
  // Sales info
  dongSalesMap?: Map<number, number>
  dongSalesByTypeMap?: Map<number, Map<string, number>>
  
  // Other controls
  onReset?: () => void
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
  selectedGu,
  selectedDong,
  selectedBusinessType,
  selectedDate,
  onFilterChange,
  dongSalesMap,
  dongSalesByTypeMap,
  onReset,
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
      
      {/* Filter panel in top-left corner */}
      <div className="absolute top-20 left-4 z-30">
        <LocalEconomyFilterPanel
          onFilterChange={onFilterChange}
          externalSelectedGu={selectedGu}
          externalSelectedDong={selectedDong}
          externalSelectedBusinessType={selectedBusinessType}
        />
      </div>
      
      {/* Sales info panel - removed SelectedAreaSalesInfo component */}
      
      {/* Reset button */}
      {onReset && (selectedGu || selectedDong) && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30">
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800/80 hover:bg-gray-700/80 text-white rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>전체 보기</span>
          </button>
        </div>
      )}
    </>
  )
})

UIControls.displayName = 'UIControls'