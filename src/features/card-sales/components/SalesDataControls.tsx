"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { 
  MapPin, 
  RefreshCw,
  Loader2,
  Play,
  Pause,
  Calendar
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
import { setDistrictTheme, getAvailableThemes, getCurrentTheme, setUseIndividualDistrictColors, getUseIndividualDistrictColors } from "@/src/shared/utils/districtUtils"
import { COLOR_THEMES } from "@/src/shared/utils/districtColorThemes"

// 지도 레이어 정의 (Mapbox 스타일)
const mapLayers = [
  // 검정색 배경 (맵박스 없음)
  { id: "black", name: "🌑 검정 배경", description: "순수 검정색 배경" },
  { id: "very-dark", name: "⚫ 매우 어두운", description: "거의 검정에 가까운 어두운 배경" },
  
  // 기본 스타일
  { id: "mapbox://styles/mapbox/streets-v12", name: "거리 지도", description: "기본 거리 지도" },
  { id: "mapbox://styles/mapbox/outdoors-v12", name: "야외 지도", description: "등고선과 자연 지형" },
  { id: "mapbox://styles/mapbox/light-v11", name: "밝은 지도", description: "밝은 테마" },
  { id: "mapbox://styles/mapbox/dark-v11", name: "어두운 지도", description: "어두운 테마" },
  { id: "mapbox://styles/mapbox/satellite-v9", name: "위성 지도", description: "위성 이미지" },
  { id: "mapbox://styles/mapbox/satellite-streets-v12", name: "위성+거리", description: "위성 이미지와 라벨" },
  { id: "mapbox://styles/mapbox/navigation-day-v1", name: "내비게이션(주간)", description: "운전용 내비게이션" },
  { id: "mapbox://styles/mapbox/navigation-night-v1", name: "내비게이션(야간)", description: "야간 운전용" },
  
  // 특수 스타일
  { id: "mapbox://styles/mapbox/standard", name: "표준 지도", description: "Mapbox 표준 스타일" },
  { id: "mapbox://styles/mapbox/standard-satellite", name: "표준 위성", description: "표준 위성 스타일" },
  
  // 추가 커스텀 스타일 (실제 사용 가능한 스타일)
  { id: "mapbox://styles/mapbox/twilight-v2", name: "황혼", description: "황혼 테마" },
  { id: "mapbox://styles/mapbox/blueprint-v1", name: "블루프린트", description: "청사진 스타일" },
  { id: "mapbox://styles/mapbox/decimal-v1", name: "데시멀", description: "미니멀 스타일" },
  { id: "mapbox://styles/mapbox/minimo-v1", name: "미니모", description: "최소한의 디자인" },
  { id: "mapbox://styles/mapbox/frank-v1", name: "프랭크", description: "대비가 높은 스타일" },
]


interface UnifiedControlsProps {
  // MapControls props
  onLayerChange: (layer: string) => void
  onTimeChange: (time: number) => void
  currentLayer: string
  currentTime: number
  showBoundary?: boolean
  showSeoulBase?: boolean
  showDistrictLabels?: boolean
  showDongLabels?: boolean
  onBoundaryToggle?: (show: boolean) => void
  onSeoulBaseToggle?: (show: boolean) => void
  onDistrictLabelsToggle?: (show: boolean) => void
  onDongLabelsToggle?: (show: boolean) => void
  
  // District visibility props
  sggVisible?: boolean
  dongVisible?: boolean
  onSggVisibleChange?: (visible: boolean) => void
  onDongVisibleChange?: (visible: boolean) => void
  
  // 3D mode props
  is3DMode?: boolean
  onIs3DModeChange?: (enabled: boolean) => void
  
  // Height scale props (for 3D mode sales visualization)
  heightScale?: number
  onHeightScaleChange?: (scale: number) => void
  
  // LayerControls props
  visible: boolean
  radius: number
  elevationScale: number
  coverage: number
  upperPercentile: number
  colorScheme: ColorScheme
  isDataLoading: boolean
  dataError: string | null
  onVisibleChange: (visible: boolean) => void
  onRadiusChange: (radius: number) => void
  onElevationScaleChange: (scale: number) => void
  onCoverageChange: (coverage: number) => void
  onUpperPercentileChange: (percentile: number) => void
  onColorSchemeChange: (scheme: ColorScheme) => void
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
  
  // Timeline animation props
  timelineAnimationEnabled?: boolean
  isTimelinePlaying?: boolean
  timelineSpeed?: number
  currentMonthIndex?: number
  monthlyDates?: string[]
  onTimelineAnimationEnabledChange?: (enabled: boolean) => void
  onIsTimelinePlayingChange?: (playing: boolean) => void
  onTimelineSpeedChange?: (speed: number) => void
  onToggleTimelineAnimation?: () => void
  
  // Mesh layer props
  showMeshLayer?: boolean
  onShowMeshLayerChange?: (show: boolean) => void
  meshWireframe?: boolean
  onMeshWireframeChange?: (wireframe: boolean) => void
  meshResolution?: number
  onMeshResolutionChange?: (resolution: number) => void
}

// Theme adjustment state interface
interface ThemeAdjustments {
  opacity: number      // 0-100
  brightness: number   // -50 to 50
  saturation: number   // -50 to 50
  contrast: number     // -50 to 50
}

export default function UnifiedControls({
  // MapControls props
  onLayerChange,
  currentLayer,
  
  // LayerControls props
  radius,
  elevationScale,
  colorScheme,
  isDataLoading,
  dataError,
  onRadiusChange,
  onElevationScaleChange,
  onColorSchemeChange,
  onReset,
  
  // District visibility props
  sggVisible = true,
  dongVisible = true,
  onSggVisibleChange,
  onDongVisibleChange,
  
  // Text labels props
  showDistrictLabels = true,
  showDongLabels = false,
  onDistrictLabelsToggle,
  onDongLabelsToggle,
  
  // 3D mode props
  is3DMode = false,
  onIs3DModeChange,
  
  // Height scale props
  heightScale = 10000000,
  onHeightScaleChange,
  
  // Timeline animation props
  timelineAnimationEnabled = false,
  isTimelinePlaying = false,
  timelineSpeed = 2000,
  currentMonthIndex = 0,
  monthlyDates = [],
  onTimelineAnimationEnabledChange,
  onIsTimelinePlayingChange,
  onTimelineSpeedChange,
  onToggleTimelineAnimation,
  
  // Mesh layer props
  showMeshLayer = false,
  onShowMeshLayerChange,
  meshWireframe = true,
  onMeshWireframeChange,
  meshResolution = 30,  // Reduced default for better performance
  onMeshResolutionChange,
}: UnifiedControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false) // Start collapsed
  const [currentTheme, setCurrentTheme] = useState<keyof typeof COLOR_THEMES>('modern')
  const [useIndividualColors, setUseIndividualColors] = useState(getUseIndividualDistrictColors())
  
  // Theme adjustment states
  const [themeAdjustments, setThemeAdjustments] = useState<ThemeAdjustments>({
    opacity: 100,
    brightness: 0,
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

  return (
    <div className={`fixed bottom-[380px] z-50 transition-all duration-300 left-4`}>
      <Card className={`bg-black/90 backdrop-blur-md border-gray-800/50 shadow-2xl text-gray-200 overflow-hidden ${isExpanded ? 'w-[280px]' : 'w-auto'}`}>
        {/* Clickable Header to expand/collapse */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-2 hover:bg-gray-900/50 transition-colors group"
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
            {/* 맵박스 레이어 선택 */}
            <div className="space-y-2">
              <Label className="text-gray-200 text-xs font-semibold">지도 스타일</Label>
              <Select
                value={currentLayer}
                onValueChange={onLayerChange}
                disabled={isDataLoading}
              >
                <SelectTrigger className="bg-gray-900/50 border-gray-700/50 text-gray-200 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black/95 border-gray-800/50 max-h-64 overflow-y-auto">
                  {mapLayers.map((layer) => (
                    <SelectItem 
                      key={layer.id} 
                      value={layer.id} 
                      className="text-gray-200 hover:bg-gray-900/50"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{layer.name}</span>
                        <span className="text-xs text-white/60">{layer.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            {/* 자치구 색상 모드 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-gray-200 text-xs font-semibold">자치구별 색상</Label>
                <Switch
                  checked={useIndividualColors}
                  onCheckedChange={(checked) => {
                    setUseIndividualColors(checked)
                    setUseIndividualDistrictColors(checked)
                  }}
                  className="scale-75"
                />
              </div>
              <p className="text-xs text-gray-400">
                {useIndividualColors ? '각 자치구마다 다른 색상 적용' : '모든 자치구에 동일한 테마 색상 적용'}
              </p>
            </div>

            <Separator className="bg-gray-800/50" />

            {/* 행정구역 표시 토글 */}
            <div className="space-y-2">
              <Label className="text-gray-200 text-xs font-semibold">행정구역 표시</Label>
              <div className="space-y-2">
                {/* 자치구 표시 */}
                <div className="flex items-center justify-between">
                  <Label className="text-gray-300 text-xs">자치구 경계</Label>
                  <Switch
                    checked={sggVisible}
                    onCheckedChange={onSggVisibleChange}
                    className="scale-75"
                    disabled={isDataLoading}
                  />
                </div>
                {/* 행정동 표시 */}
                <div className="flex items-center justify-between">
                  <Label className="text-gray-300 text-xs">행정동 경계</Label>
                  <Switch
                    checked={dongVisible}
                    onCheckedChange={onDongVisibleChange}
                    className="scale-75"
                    disabled={isDataLoading}
                  />
                </div>
              </div>
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
            
            {/* 3D 모드 토글 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-gray-200 text-xs font-semibold">3D 지도 모드</Label>
                <Switch
                  checked={is3DMode}
                  onCheckedChange={onIs3DModeChange}
                  className="scale-75"
                  disabled={isDataLoading}
                />
              </div>
              <p className="text-xs text-gray-400">
                {is3DMode ? '행정구역이 입체적으로 표현됩니다' : '평면 지도로 표시됩니다'}
              </p>
            </div>

            <Separator className="bg-gray-800/50" />
            
            {/* Seoul Mesh Layer 토글 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-gray-200 text-xs font-semibold">Seoul Mesh Layer</Label>
                <Switch
                  checked={showMeshLayer}
                  onCheckedChange={onShowMeshLayerChange}
                  className="scale-75"
                  disabled={isDataLoading}
                />
              </div>
              {showMeshLayer && (
                <div className="space-y-3 pl-2">
                  {/* Wireframe 모드 토글 */}
                  <div className="flex items-center justify-between">
                    <Label className="text-gray-200 text-xs">Wireframe</Label>
                    <Switch
                      checked={meshWireframe}
                      onCheckedChange={onMeshWireframeChange}
                      className="scale-75"
                    />
                  </div>
                  
                  {/* Mesh Resolution 슬라이더 */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <Label className="text-gray-200 text-xs">
                        Resolution: {meshResolution}x{meshResolution}
                        {meshResolution > 40 && (
                          <span className="text-orange-400 ml-1">(slow)</span>
                        )}
                      </Label>
                    </div>
                    <Slider
                      value={[meshResolution]}
                      onValueChange={(value) => onMeshResolutionChange?.(value[0])}
                      min={20}
                      max={60}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>20 (Fast)</span>
                      <span>60 (Detailed)</span>
                    </div>
                    {meshResolution > 40 && (
                      <p className="text-xs text-orange-400 mt-1">
                        ⚠️ High resolution may cause slow loading
                      </p>
                    )}
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-400">
                {showMeshLayer ? 'Triangulated mesh surface visualization' : 'Enable to show mesh terrain'}
              </p>
            </div>

            <Separator className="bg-gray-800/50" />
            
            {/* 시계열 애니메이션 토글 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-gray-200 text-xs font-semibold">
                  <Calendar className="inline w-3 h-3 mr-1" />
                  시계열 애니메이션
                </Label>
                <Switch
                  checked={timelineAnimationEnabled}
                  onCheckedChange={onTimelineAnimationEnabledChange}
                  className="scale-75"
                  disabled={isDataLoading}
                />
              </div>
              {timelineAnimationEnabled && (
                <div className="space-y-2 pl-2">
                  {/* 재생/일시정지 버튼과 현재 월 표시 */}
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onToggleTimelineAnimation}
                      className="text-gray-200 hover:bg-gray-900/50 h-6 px-2"
                    >
                      {isTimelinePlaying ? (
                        <><Pause className="w-3 h-3 mr-1" /> 일시정지</>
                      ) : (
                        <><Play className="w-3 h-3 mr-1" /> 재생</>
                      )}
                    </Button>
                    <span className="text-xs text-gray-400">
                      {monthlyDates && monthlyDates[currentMonthIndex] ? 
                        new Date(monthlyDates[currentMonthIndex]).toLocaleDateString('ko-KR', { 
                          year: 'numeric', 
                          month: 'long' 
                        }) : 
                        '2024년 1월'}
                    </span>
                  </div>
                  
                  {/* 속도 조절 */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <Label className="text-gray-300 text-xs">속도</Label>
                      <span className="text-xs text-gray-400">{(timelineSpeed / 1000).toFixed(1)}초</span>
                    </div>
                    <Slider
                      value={[timelineSpeed]}
                      onValueChange={(value) => onTimelineSpeedChange?.(value[0])}
                      min={500}
                      max={5000}
                      step={500}
                      disabled={isDataLoading}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>빠름</span>
                      <span>느림</span>
                    </div>
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-400">
                {timelineAnimationEnabled ? 
                  '매월 1일 데이터를 자동으로 순환합니다' : 
                  '시계열 데이터를 월별로 재생합니다'}
              </p>
            </div>

            <Separator className="bg-gray-800/50" />
            
            {/* 3D 높이 스케일 조정 (3D 모드일 때만 표시) */}
            {is3DMode && (
              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <Label className="text-gray-200 text-xs font-semibold">3D 높이 스케일</Label>
                  </div>
                  <div className="space-y-2">
                    <Slider
                      value={[Math.log10(heightScale)]}
                      onValueChange={(value) => {
                        const newScale = Math.pow(10, value[0])
                        onHeightScaleChange?.(newScale)
                      }}
                      min={6}  // 10^6 = 백만원
                      max={8}  // 10^8 = 1억원
                      step={0.1}
                      disabled={isDataLoading}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>낮음</span>
                      <span className="text-gray-300">
                        {heightScale < 10000000 ? '5백만원 = 600 높이' : 
                         heightScale === 10000000 ? '1천만원 = 300 높이' : 
                         heightScale < 50000000 ? '2천만원 = 150 높이' :
                         heightScale < 100000000 ? '5천만원 = 60 높이' : '1억원 = 30 높이'}
                      </span>
                      <span>높음</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    매출액을 높이로 변환하는 비율을 조정합니다 (3배 강화된 스케일)
                  </p>
                </div>
              </div>
            )}

            <Separator className="bg-gray-800/50" />

            {/* 형태 설정 */}
            <div className="space-y-3">

              {/* 반지름 */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label className="text-gray-200 text-xs">반지름: {radius}m</Label>
                </div>
                <Slider
                  value={[radius]}
                  onValueChange={(value) => onRadiusChange(value[0])}
                  min={100}
                  max={3000}
                  step={100}
                  disabled={isDataLoading}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>100m</span>
                  <span>3000m</span>
                </div>
              </div>

              {/* 높이 스케일 */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label className="text-gray-200 text-xs">높이 스케일: {elevationScale}x</Label>
                </div>
                <Slider
                  value={[elevationScale]}
                  onValueChange={(value) => onElevationScaleChange(value[0])}
                  min={0.1}
                  max={5}
                  step={0.1}
                  disabled={isDataLoading}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0.1x</span>
                  <span>5x</span>
                </div>
              </div>

            </div>

            <Separator className="bg-gray-800/50" />

            {/* 시각 설정 */}
            <div className="space-y-3">

              {/* 색상 스킴 */}
              <div className="space-y-1">
                <Label className="text-gray-200 text-xs">색상 스킴</Label>
                <Select
                  value={colorScheme}
                  onValueChange={(value: ColorScheme) => onColorSchemeChange(value)}
                  disabled={isDataLoading}
                >
                  <SelectTrigger className="bg-gray-900/50 border-gray-700/50 text-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-white/20 max-h-96">
                    {Object.entries(COLOR_PALETTE_INFO).map(([key, info]) => (
                      <SelectItem key={key} value={key} className="text-gray-200 hover:bg-gray-900/50">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-4 h-4 rounded"
                            style={getColorPreviewStyle(key as ColorScheme)}
                          ></div>
                          <span>{info.name}</span>
                          {info.category === 'premium' && (
                            <Badge variant="secondary" className="text-xs ml-1">Premium</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>


              {/* 색상 미리보기 */}
              <div className="space-y-1">
                <Label className="text-gray-200 text-xs">색상 미리보기</Label>
                <div 
                  className="h-6 rounded-lg"
                  style={getColorPreviewStyle(colorScheme)}
                ></div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>낮음</span>
                  <span>높음</span>
                </div>
                <div className="text-xs text-gray-600">
                  {COLOR_PALETTE_INFO[colorScheme]?.description}
                </div>
              </div>

            </div>


              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  )
}