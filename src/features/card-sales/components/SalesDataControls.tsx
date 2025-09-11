"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { 
  MapPin, 
  RefreshCw,
  Loader2,
  BarChart3
} from "lucide-react"
import { Card } from "@/src/shared/components/ui/card"
import { Label } from "@/src/shared/components/ui/label"
import { Slider } from "@/src/shared/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/shared/components/ui/select"
import { Button } from "@/src/shared/components/ui/button"
import { Badge } from "@/src/shared/components/ui/badge"
import { Separator } from "@/src/shared/components/ui/separator"
import { COLOR_PALETTE_INFO, getColorPreviewStyle, type ColorScheme } from "@/src/features/card-sales/utils/premiumColors"
import { Switch } from "@/src/shared/components/ui/switch"
import { setDistrictTheme, getAvailableThemes, getCurrentTheme } from "@/src/shared/utils/districtUtils"
import { COLOR_THEMES } from "@/src/shared/utils/districtColorThemes"

// Map layers removed - using fixed map style


interface UnifiedControlsProps {
  // MapControls props
  onTimeChange: (time: number) => void
  currentTime: number
  showBoundary?: boolean
  showSeoulBase?: boolean
  showDistrictLabels?: boolean
  showDongLabels?: boolean
  onBoundaryToggle?: (show: boolean) => void
  onSeoulBaseToggle?: (show: boolean) => void
  onDistrictLabelsToggle?: (show: boolean) => void
  onDongLabelsToggle?: (show: boolean) => void
  
  // District visibility removed - always visible
  
  // 3D mode props
  is3DMode?: boolean
  onIs3DModeChange?: (enabled: boolean) => void
  
  // Height scale props
  heightScale?: number
  onHeightScaleChange?: (scale: number) => void
  
  // LayerControls props
  visible: boolean
  coverage: number
  upperPercentile: number
  isDataLoading: boolean
  dataError: string | null
  onVisibleChange: (visible: boolean) => void
  onCoverageChange: (coverage: number) => void
  onUpperPercentileChange: (percentile: number) => void
  onReset: () => void
  
  // Color mode props
  colorMode?: 'sales' | 'temperature' | 'temperatureGroup' | 'discomfort' | 'humidity'
  onColorModeChange?: (mode: 'sales' | 'temperature' | 'temperatureGroup' | 'discomfort' | 'humidity') => void
  selectedHour?: number
  onSelectedHourChange?: (hour: number) => void
  
  // Animation props
  animationEnabled?: boolean
  animationSpeed?: number
  waveAmplitude?: number
  isAnimating?: boolean
  onAnimationEnabledChange?: (enabled: boolean) => void
  onAnimationSpeedChange?: (speed: number) => void
  onWaveAmplitudeChange?: (amplitude: number) => void
  onToggleAnimation?: () => void
  
  // Rotation props
  rotationEnabled?: boolean
  rotationSpeed?: number
  rotationDirection?: 'clockwise' | 'counterclockwise'
  isRotating?: boolean
  rotationDirectionText?: string
  bearingDisplay?: string
  onRotationEnabledChange?: (enabled: boolean) => void
  onRotationSpeedChange?: (speed: number) => void
  onRotationDirectionChange?: (direction: 'clockwise' | 'counterclockwise') => void
  onToggleRotation?: () => void
  
  // Timeline animation removed - not needed
  
  // Mesh layer props
  showMeshLayer?: boolean
  onShowMeshLayerChange?: (show: boolean) => void
  // Wireframe removed - always true
  // Mesh resolution removed - using fixed value
  meshColor?: string
  onMeshColorChange?: (color: string) => void
}

// Theme adjustment state interface
interface ThemeAdjustments {
  opacity: number      // 0-100
  brightness: number   // -50 to 50
  saturation: number   // -50 to 50
  contrast: number     // -50 to 50
}

export default function UnifiedControls({
  // MapControls props removed
  
  // LayerControls props
  isDataLoading,
  dataError,
  onReset,
  
  // District visibility removed - always visible
  
  // Text labels props
  showDistrictLabels = true,
  showDongLabels = false,
  onDistrictLabelsToggle,
  onDongLabelsToggle,
  
  // 3D mode props
  is3DMode = false,
  onIs3DModeChange,
  
  // Height scale props
  heightScale = 500000000,
  onHeightScaleChange,
  
  // Timeline animation removed
  
  // Mesh layer props
  showMeshLayer = false,
  onShowMeshLayerChange,
  // Wireframe always true
  // Mesh resolution fixed at 120
  meshColor = '#00FFE1',
  onMeshColorChange,
}: UnifiedControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false) // Start collapsed
  const [showDetailView, setShowDetailView] = useState(false)
  const [isDetailAnimating, setIsDetailAnimating] = useState(false)
  const [currentTheme, setCurrentTheme] = useState<keyof typeof COLOR_THEMES>('modern')
  // Removed: useIndividualColors state - always use theme colors
  
  // Theme adjustment states - brighter initial settings
  const [themeAdjustments, setThemeAdjustments] = useState<ThemeAdjustments>({
    opacity: 100,
    brightness: 20,  // Start with +20 brightness for brighter initial view
    saturation: 0,
    contrast: 0
  })
  
  // Apply theme adjustments to global state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Store adjustments in window for access by color functions
      (window as any).__themeAdjustments = themeAdjustments
      // Trigger re-render of map layers
      window.dispatchEvent(new CustomEvent('themeAdjustmentsChanged', { detail: themeAdjustments }))
    }
  }, [themeAdjustments])

  // Handle detail view transition (toggle between Polygon and Mesh)
  const handleDetailViewClick = () => {
    setIsDetailAnimating(true)
    
    if (!showDetailView) {
      // Switch to Polygon Layer (Detail View)
      setShowDetailView(true)
      
      setTimeout(() => {
        // Activate 3D Polygon Layer
        onIs3DModeChange?.(true)
        // Deactivate Mesh Layer
        if (showMeshLayer) {
          onShowMeshLayerChange?.(false)
        }
      }, 200)
    } else {
      // Switch back to Mesh Layer
      setShowDetailView(false)
      
      setTimeout(() => {
        // Deactivate 3D Polygon Layer
        onIs3DModeChange?.(false)
        // Activate Mesh Layer
        onShowMeshLayerChange?.(true)
      }, 200)
    }
    
    // Complete animation
    setTimeout(() => {
      setIsDetailAnimating(false)
    }, 700)
  }

  return (
    <div className={`fixed bottom-[380px] z-50 transition-all duration-300 left-4`}>
      <Card className={`bg-black/90 backdrop-blur-md border-gray-800/50 shadow-2xl text-gray-200 overflow-hidden ${isExpanded ? 'w-[280px]' : 'w-auto'}`}>
        {/* Header with expand/collapse and detail view button */}
        <div className="flex items-center">
          {/* Expand/Collapse Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-1 flex items-center justify-between p-2 hover:bg-gray-900/50 transition-colors group"
          >
            <div className="flex items-center space-x-2">
              <MapPin size={14} className="text-blue-400" />
              <span className="font-bold text-sm text-gray-200">레이어 컨트롤</span>
            </div>
            <div className="flex items-center space-x-2">
              {isDataLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors" />
              </motion.div>
            </div>
          </button>
          
          {/* Detail View Toggle Button */}
          <div className="relative group">
            <motion.button
              onClick={handleDetailViewClick}
              className={`relative p-2 mx-1 rounded-lg transition-all duration-300 ${
                showDetailView 
                  ? 'bg-blue-500/30 border border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.5)]' 
                  : 'bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={isDetailAnimating ? {
                boxShadow: [
                  '0 0 20px rgba(59,130,246,0.5)',
                  '0 0 40px rgba(59,130,246,0.8)',
                  '0 0 20px rgba(59,130,246,0.5)',
                ],
              } : {}}
              transition={{ duration: 0.5, repeat: isDetailAnimating ? Infinity : 0 }}
            >
              <BarChart3 size={16} className="text-blue-400" />
              <span className="sr-only">{showDetailView ? '메쉬 뷰로 전환' : '데이터 상세보기'}</span>
              {showDetailView && (
                <motion.div
                  className="absolute inset-0 rounded-lg bg-blue-500/20"
                  initial={{ scale: 1 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                />
              )}
            </motion.button>
            
            {/* Tooltip */}
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {showDetailView ? '메쉬 뷰로 전환' : '데이터 상세보기'}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-700" />
            </div>
          </div>
        </div>

        {/* Collapsible Content */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ 
                duration: 0.3,
                ease: "easeInOut"
              }}
              style={{ overflow: "hidden" }}
            >
              {/* Reset Button */}
              <div className="px-2 pt-1 pb-2 border-b border-gray-800/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onReset}
                  className="text-gray-200 hover:bg-gray-900/50 w-full justify-center h-7 text-xs"
                  title="설정 초기화"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  설정 초기화
                </Button>
              </div>

              {/* 오류 표시 */}
              {dataError && (
                <div className="mx-2 mt-2 p-2 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <div className="text-xs text-red-200">
                    <strong>오류:</strong> {dataError}
                  </div>
                </div>
              )}

              <div className="p-2 space-y-3 max-h-96 overflow-y-auto">

            {/* 3D Polygon Layer 토글 - with slide up animation */}
            <AnimatePresence>
              {(showDetailView || is3DMode) && (
                <motion.div
                  className="space-y-2"
                  initial={showDetailView ? { y: 20, opacity: 0, scale: 0.95 } : false}
                  animate={{ 
                    y: 0, 
                    opacity: 1, 
                    scale: 1,
                    transition: {
                      type: "spring",
                      damping: 20,
                      stiffness: 300,
                      delay: showDetailView ? 0.2 : 0
                    }
                  }}
                  exit={{ y: 20, opacity: 0, scale: 0.95 }}
                >
                  <motion.div 
                    className={`rounded-lg p-2 ${showDetailView && isDetailAnimating ? 'bg-blue-500/10 border border-blue-500/30' : ''}`}
                    animate={showDetailView && isDetailAnimating ? {
                      borderColor: ['rgba(59, 130, 246, 0.3)', 'rgba(59, 130, 246, 0.6)', 'rgba(59, 130, 246, 0.3)'],
                    } : {}}
                    transition={{ duration: 1, repeat: showDetailView && isDetailAnimating ? 2 : 0 }}
                  >
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-200 text-xs font-semibold">3D Polygon Layer</Label>
                      <Switch
                        checked={is3DMode}
                        onCheckedChange={(checked) => {
                          onIs3DModeChange?.(checked)
                          // Turn off mesh layer when polygon layer is turned on
                          if (checked && showMeshLayer) {
                            onShowMeshLayerChange?.(false)
                          }
                          // Reset detail view if turning off
                          if (!checked && showDetailView) {
                            setShowDetailView(false)
                          }
                        }}
                        className="scale-75"
                        disabled={isDataLoading}
                      />
                    </div>
                    <p className="text-xs text-gray-400">
                      {is3DMode ? '행정구역이 입체적으로 표현됩니다' : '평면 지도로 표시됩니다'}
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <Separator className="bg-gray-800/50" />
            
            {/* Height Scale Slider - only show when mesh layer is active */}
            {showMeshLayer && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-gray-200 text-xs font-semibold">메쉬 높이 스케일</Label>
                  <span className="text-xs text-gray-400">
                    {heightScale >= 1000000000 ? 
                      `${(heightScale / 1000000000).toFixed(1)}B` : 
                      `${(heightScale / 1000000).toFixed(0)}M`}
                  </span>
                </div>
                <Slider
                  value={[heightScale]}
                  onValueChange={(value) => onHeightScaleChange?.(value[0])}
                  min={100000000}  // 100M (1억원)
                  max={1000000000} // 1B (10억원)
                  step={50000000}  // 50M (5천만원)
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>높음</span>
                  <span>낮음</span>
                </div>
                <p className="text-xs text-gray-400">
                  값이 클수록 높이가 낮아집니다 (역비례)
                </p>
              </div>
            )}
            
            {showMeshLayer && <Separator className="bg-gray-800/50" />}
            
            {/* 3D Mesh Layer 토글 - moved to top */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-gray-200 text-xs font-semibold">3D Mesh Layer</Label>
                <Switch
                  checked={showMeshLayer}
                  onCheckedChange={(checked) => {
                    onShowMeshLayerChange?.(checked)
                    // Turn off polygon layer when mesh layer is turned on
                    if (checked && is3DMode) {
                      onIs3DModeChange?.(false)
                    }
                  }}
                  className="scale-75"
                  disabled={isDataLoading}
                />
              </div>
              {showMeshLayer && (
                <div className="space-y-3 pl-2">
                  {/* Wireframe always enabled - removed toggle */}
                  {/* Mesh Color Picker */}
                  <div className="space-y-2">
                    <Label className="text-gray-200 text-xs">Mesh Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={meshColor || '#00FFE1'}
                        onChange={(e) => onMeshColorChange?.(e.target.value)}
                        className="w-8 h-8 border border-gray-600 rounded cursor-pointer"
                        title="Choose mesh color"
                      />
                      <span className="text-xs text-gray-400">
                        {meshColor || '#00FFE1'}
                      </span>
                      <button
                        onClick={() => onMeshColorChange?.('#00FFE1')}
                        className="text-xs text-gray-400 hover:text-gray-200 ml-auto"
                      >
                        Reset
                      </button>
                    </div>
                    {/* Preset colors */}
                    <div className="flex gap-1">
                      {[
                        { color: '#00FFE1', name: 'Cyan' },
                        { color: '#00FF94', name: 'Mint' },
                        { color: '#FF00FF', name: 'Magenta' },
                        { color: '#FFE100', name: 'Yellow' },
                        { color: '#FF6B00', name: 'Orange' },
                        { color: '#B100FF', name: 'Purple' },
                      ].map(({ color, name }) => (
                        <button
                          key={color}
                          onClick={() => onMeshColorChange?.(color)}
                          className="w-6 h-6 rounded border border-gray-600 hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                          title={name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-400">
                {showMeshLayer ? 
                  '서울시 전체를 덮는 메쉬 레이어가 표시됩니다' : 
                  '3D 메쉬 레이어를 활성화합니다'}
              </p>
            </div>

            <Separator className="bg-gray-800/50" />

            {/* 자치구 테마 선택 */}
            <div className="space-y-2">
              <Label className="text-gray-200 text-xs font-semibold">자치구 테마</Label>
              <Select
                value={currentTheme}
                onValueChange={(value: keyof typeof COLOR_THEMES) => {
                  setCurrentTheme(value)
                  setDistrictTheme(value)
                }}
              >
                <SelectTrigger className="bg-gray-900/50 border-gray-700/50 text-gray-200 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black/95 border-gray-800/50 max-h-96 overflow-y-auto">
                  {/* Modern Themes */}
                  <div className="px-2 py-1">
                    <div className="text-xs font-semibold text-gray-400 mb-1">현대적 테마</div>
                  </div>
                  <SelectItem value="modern" className="text-gray-200 hover:bg-gray-900/50">
                    <div className="flex flex-col">
                      <span className="font-medium">🎨 Modern</span>
                      <span className="text-xs text-white/60">구별 그라디언트 테마</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="modern-dark" className="text-gray-200 hover:bg-gray-900/50">
                    <div className="flex flex-col">
                      <span className="font-medium">🌙 Modern Dark</span>
                      <span className="text-xs text-white/60">어두운 현대적 테마</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="modern-light" className="text-gray-200 hover:bg-gray-900/50">
                    <div className="flex flex-col">
                      <span className="font-medium">☀️ Modern Light</span>
                      <span className="text-xs text-white/60">밝은 파스텔 테마</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="modern-neon" className="text-gray-200 hover:bg-gray-900/50">
                    <div className="flex flex-col">
                      <span className="font-medium">💡 Modern Neon</span>
                      <span className="text-xs text-white/60">사이버펌크 네온</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="modern-earth" className="text-gray-200 hover:bg-gray-900/50">
                    <div className="flex flex-col">
                      <span className="font-medium">🌍 Modern Earth</span>
                      <span className="text-xs text-white/60">자연스러운 흙 색상</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="modern-ocean" className="text-gray-200 hover:bg-gray-900/50">
                    <div className="flex flex-col">
                      <span className="font-medium">🌊 Modern Ocean</span>
                      <span className="text-xs text-white/60">바다 영감 테마</span>
                    </div>
                  </SelectItem>
                  
                  {/* Special Theme */}
                  <div className="px-2 py-1 mt-2">
                    <div className="text-xs font-semibold text-gray-400 mb-1">특별 테마</div>
                  </div>
                  <SelectItem value="adjacent" className="text-gray-200 hover:bg-gray-900/50">
                    <div className="flex flex-col">
                      <span className="font-medium">🎨 Adjacent Districts</span>
                      <span className="text-xs text-white/60">인접구 차별화 (4색)</span>
                    </div>
                  </SelectItem>
                  
                  {/* Classic Themes */}
                  <div className="px-2 py-1 mt-2">
                    <div className="text-xs font-semibold text-gray-400 mb-1">클래식 테마</div>
                  </div>
                  <SelectItem value="blue" className="text-gray-200 hover:bg-gray-900/50">
                    <div className="flex flex-col">
                      <span className="font-medium">Ocean Blue</span>
                      <span className="text-xs text-white/60">파란색 계열</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="green" className="text-gray-200 hover:bg-gray-900/50">
                    <div className="flex flex-col">
                      <span className="font-medium">Forest Green</span>
                      <span className="text-xs text-white/60">초록색 계열</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="purple" className="text-gray-200 hover:bg-gray-900/50">
                    <div className="flex flex-col">
                      <span className="font-medium">Royal Purple</span>
                      <span className="text-xs text-white/60">보라색 계열</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="orange" className="text-gray-200 hover:bg-gray-900/50">
                    <div className="flex flex-col">
                      <span className="font-medium">Sunset Orange</span>
                      <span className="text-xs text-white/60">주황색 계열</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="mono" className="text-gray-200 hover:bg-gray-900/50">
                    <div className="flex flex-col">
                      <span className="font-medium">Monochrome</span>
                      <span className="text-xs text-white/60">회색 계열</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator className="bg-gray-800/50" />
            
            {/* 테마 시각 조정 컨트롤 */}
            <div className="space-y-3">
              <Label className="text-gray-200 text-xs font-semibold">테마 시각 조정</Label>
              
              {/* 투명도 조절 */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label className="text-gray-300 text-xs">투명도</Label>
                  <span className="text-xs text-gray-400">{themeAdjustments.opacity}%</span>
                </div>
                <Slider
                  value={[themeAdjustments.opacity]}
                  onValueChange={(value) => setThemeAdjustments(prev => ({ ...prev, opacity: value[0] }))}
                  min={20}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>투명</span>
                  <span>불투명</span>
                </div>
              </div>
              
              {/* 밝기 조절 */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label className="text-gray-300 text-xs">밝기</Label>
                  <span className="text-xs text-gray-400">{themeAdjustments.brightness > 0 ? '+' : ''}{themeAdjustments.brightness}</span>
                </div>
                <Slider
                  value={[themeAdjustments.brightness]}
                  onValueChange={(value) => setThemeAdjustments(prev => ({ ...prev, brightness: value[0] }))}
                  min={-50}
                  max={50}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>어둡게</span>
                  <span>밝게</span>
                </div>
              </div>
              
              {/* 채도 조절 */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label className="text-gray-300 text-xs">채도</Label>
                  <span className="text-xs text-gray-400">{themeAdjustments.saturation > 0 ? '+' : ''}{themeAdjustments.saturation}</span>
                </div>
                <Slider
                  value={[themeAdjustments.saturation]}
                  onValueChange={(value) => setThemeAdjustments(prev => ({ ...prev, saturation: value[0] }))}
                  min={-50}
                  max={50}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>흑백</span>
                  <span>선명</span>
                </div>
              </div>
              
              {/* 대비 조절 */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label className="text-gray-300 text-xs">대비</Label>
                  <span className="text-xs text-gray-400">{themeAdjustments.contrast > 0 ? '+' : ''}{themeAdjustments.contrast}</span>
                </div>
                <Slider
                  value={[themeAdjustments.contrast]}
                  onValueChange={(value) => setThemeAdjustments(prev => ({ ...prev, contrast: value[0] }))}
                  min={-50}
                  max={50}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>낮음</span>
                  <span>높음</span>
                </div>
              </div>
              
              {/* 조정값 초기화 버튼 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setThemeAdjustments({ opacity: 100, brightness: 0, saturation: 0, contrast: 0 })}
                className="text-gray-400 hover:bg-gray-900/50 w-full justify-center h-6 text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                시각 조정 초기화
              </Button>
            </div>

            <Separator className="bg-gray-800/50" />


            
            {/* 텍스트 라벨 표시 토글 */}
            <div className="space-y-2">
              <Label className="text-gray-200 text-xs font-semibold">텍스트 라벨</Label>
              <div className="space-y-2">
                {/* 자치구 라벨 표시 */}
                <div className="flex items-center justify-between">
                  <Label className="text-gray-300 text-xs">자치구 이름</Label>
                  <Switch
                    checked={showDistrictLabels}
                    onCheckedChange={onDistrictLabelsToggle}
                    className="scale-75"
                    disabled={isDataLoading}
                  />
                </div>
                {/* 행정동 라벨 표시 */}
                <div className="flex items-center justify-between">
                  <Label className="text-gray-300 text-xs">행정동 이름</Label>
                  <Switch
                    checked={showDongLabels}
                    onCheckedChange={onDongLabelsToggle}
                    className="scale-75"
                    disabled={isDataLoading}
                  />
                </div>
              </div>
            </div>

            <Separator className="bg-gray-800/50" />
            
            {/* 3D mode and mesh layer sections moved to top */}




              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  )
}