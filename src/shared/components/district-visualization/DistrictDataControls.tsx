"use client"

import React from 'react'
import { Card } from '@/src/shared/components/ui/card'
import { Slider } from '@/src/shared/components/ui/slider'
import { Switch } from '@/src/shared/components/ui/switch'
import { Label } from '@/src/shared/components/ui/label'
import { Button } from '@/src/shared/components/ui/button'
import { 
  Eye, 
  EyeOff, 
  Box, 
  Layers, 
  BarChart3,
  RefreshCw,
  Settings
} from 'lucide-react'
import type { LayerConfig } from '@/src/shared/types/district-data'

interface DistrictDataControlsProps {
  layerConfig: LayerConfig
  is3DMode: boolean
  currentLayer: string
  showBoundary: boolean
  showChartPanel: boolean
  
  // Layer control callbacks
  setLayerVisible: (visible: boolean) => void
  setLayerCoverage?: (coverage: number) => void
  setLayerUpperPercentile?: (percentile: number) => void
  setIs3DMode: (mode: boolean) => void
  setCurrentLayer: (layer: string) => void
  setShowBoundary: (show: boolean) => void
  setShowChartPanel: (show: boolean) => void
  resetConfig: () => void
  
  // Optional mesh layer controls
  showMeshLayer?: boolean
  meshResolution?: number
  meshColor?: string
  onShowMeshLayerChange?: (show: boolean) => void
  onMeshResolutionChange?: (resolution: number) => void
  onMeshColorChange?: (color: string) => void
  
  // Additional custom controls slot
  children?: React.ReactNode
}

const MAP_STYLES = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'streets', label: 'Streets' },
  { value: 'satellite', label: 'Satellite' }
]

const MESH_RESOLUTIONS = [
  { value: 30, label: 'Low' },
  { value: 60, label: 'Medium' },
  { value: 120, label: 'High' },
  { value: 200, label: 'Ultra' }
]

/**
 * Reusable data visualization controls for district maps
 */
export function DistrictDataControls({
  layerConfig,
  is3DMode,
  currentLayer,
  showBoundary,
  showChartPanel,
  setLayerVisible,
  setLayerCoverage,
  setLayerUpperPercentile,
  setIs3DMode,
  setCurrentLayer,
  setShowBoundary,
  setShowChartPanel,
  resetConfig,
  showMeshLayer,
  meshResolution = 60,
  meshColor = '#FFFFFF',
  onShowMeshLayerChange,
  onMeshResolutionChange,
  onMeshColorChange,
  children
}: DistrictDataControlsProps) {
  return (
    <Card className="absolute top-4 right-4 z-20 bg-gray-900/90 backdrop-blur-sm border-gray-800 w-80">
      <div className="p-4 space-y-4">
        <div className="text-white font-semibold flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Visualization Controls
        </div>

        {/* 3D Mode Toggle */}
        <div className="flex items-center justify-between">
          <Label className="text-gray-300 flex items-center gap-2">
            <Box className="w-4 h-4" />
            3D Mode
          </Label>
          <Switch
            checked={is3DMode}
            onCheckedChange={setIs3DMode}
          />
        </div>

        {/* Layer Visibility */}
        <div className="flex items-center justify-between">
          <Label className="text-gray-300 flex items-center gap-2">
            {layerConfig.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            Layer Visible
          </Label>
          <Switch
            checked={layerConfig.visible}
            onCheckedChange={setLayerVisible}
          />
        </div>

        {/* Coverage Control */}
        {setLayerCoverage && layerConfig.coverage !== undefined && (
          <div className="space-y-2">
            <Label className="text-gray-300 text-sm">
              Coverage: {Math.round(layerConfig.coverage * 100)}%
            </Label>
            <Slider
              value={[layerConfig.coverage]}
              onValueChange={([value]) => setLayerCoverage(value)}
              min={0}
              max={1}
              step={0.05}
              className="w-full"
            />
          </div>
        )}

        {/* Upper Percentile Control */}
        {setLayerUpperPercentile && layerConfig.upperPercentile !== undefined && (
          <div className="space-y-2">
            <Label className="text-gray-300 text-sm">
              Upper Percentile: {layerConfig.upperPercentile}%
            </Label>
            <Slider
              value={[layerConfig.upperPercentile]}
              onValueChange={([value]) => setLayerUpperPercentile(value)}
              min={90}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        )}

        {/* Map Style Selector */}
        <div className="space-y-2">
          <Label className="text-gray-300 text-sm">Map Style</Label>
          <select
            value={currentLayer}
            onChange={(e) => setCurrentLayer(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm"
          >
            {MAP_STYLES.map(style => (
              <option key={style.value} value={style.value}>
                {style.label}
              </option>
            ))}
          </select>
        </div>

        {/* Boundary Toggle */}
        <div className="flex items-center justify-between">
          <Label className="text-gray-300 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Show Boundaries
          </Label>
          <Switch
            checked={showBoundary}
            onCheckedChange={setShowBoundary}
          />
        </div>

        {/* Mesh Layer Controls */}
        {onShowMeshLayerChange && (
          <>
            <div className="flex items-center justify-between">
              <Label className="text-gray-300 text-sm">Mesh Layer</Label>
              <Switch
                checked={showMeshLayer}
                onCheckedChange={onShowMeshLayerChange}
              />
            </div>

            {showMeshLayer && (
              <>
                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">Mesh Resolution</Label>
                  <select
                    value={meshResolution}
                    onChange={(e) => onMeshResolutionChange?.(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm"
                  >
                    {MESH_RESOLUTIONS.map(res => (
                      <option key={res.value} value={res.value}>
                        {res.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">Mesh Color</Label>
                  <input
                    type="color"
                    value={meshColor}
                    onChange={(e) => onMeshColorChange?.(e.target.value)}
                    className="w-full h-10 bg-gray-800 border border-gray-700 rounded-md cursor-pointer"
                  />
                </div>
              </>
            )}
          </>
        )}

        {/* Chart Panel Toggle */}
        <div className="flex items-center justify-between">
          <Label className="text-gray-300 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Show Charts
          </Label>
          <Switch
            checked={showChartPanel}
            onCheckedChange={setShowChartPanel}
          />
        </div>

        {/* Additional custom controls */}
        {children}

        {/* Reset Button */}
        <Button
          onClick={resetConfig}
          variant="outline"
          size="sm"
          className="w-full bg-gray-800 hover:bg-gray-700 border-gray-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Reset Settings
        </Button>
      </div>
    </Card>
  )
}