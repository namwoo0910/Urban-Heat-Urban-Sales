"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { 
  Layers, 
  Calendar, 
  MapPin, 
  Map, 
  Eye, 
  EyeOff,
  Settings,
  Palette,
  RefreshCw,
  Loader2,
  Minimize2,
  Maximize2,
  RotateCw,
  RotateCcw,
  Compass,
  Flame
} from "lucide-react"
import { Card } from "@/src/shared/components/ui/card"
import { Label } from "@/src/shared/components/ui/label"
import { Switch } from "@/src/shared/components/ui/switch"
import { Slider } from "@/src/shared/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/shared/components/ui/select"
import { Button } from "@/src/shared/components/ui/button"
import { Badge } from "@/src/shared/components/ui/badge"
import { Separator } from "@/src/shared/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/shared/components/ui/tabs"
import { COLOR_PALETTE_INFO, getColorPreviewStyle, type ColorScheme } from "@/src/features/card-sales/utils/premiumColors"

// 지도 레이어 정의
const mapLayers = [
  { id: "earth", name: "위성 지도", description: "서울의 위성 이미지" },
  { id: "night", name: "야간 모드", description: "어두운 테마의 지도" },
  { id: "temperature", name: "지형 지도", description: "서울의 지형과 공원" },
  { id: "precipitation", name: "밝은 지도", description: "밝은 테마의 기본 지도" },
  { id: "population", name: "도로 지도", description: "상세한 도로와 건물 정보" },
  { id: "elevation", name: "야외 지도", description: "등고선과 자연 지형" },
]

// 시계열 범위 정의
const timeRanges = [
  { value: 0, label: "2020" },
  { value: 25, label: "2021" },
  { value: 50, label: "2022" },
  { value: 75, label: "2023" },
  { value: 100, label: "2024" },
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
  onBoundaryToggle?: (show: boolean) => void
  onSeoulBaseToggle?: (show: boolean) => void
  onDistrictLabelsToggle?: (show: boolean) => void
  
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
}

export default function UnifiedControls({
  // MapControls props
  onLayerChange,
  onTimeChange,
  currentLayer,
  currentTime,
  showBoundary = true,
  showSeoulBase = false,
  showDistrictLabels = true,
  onBoundaryToggle,
  onSeoulBaseToggle,
  onDistrictLabelsToggle,
  
  // LayerControls props
  visible,
  radius,
  elevationScale,
  coverage,
  upperPercentile,
  colorScheme,
  isDataLoading,
  dataError,
  onVisibleChange,
  onRadiusChange,
  onElevationScaleChange,
  onCoverageChange,
  onUpperPercentileChange,
  onColorSchemeChange,
  onReset,
  
  // Color mode props
  colorMode = 'sales',
  onColorModeChange,
  selectedHour = 12,
  onSelectedHourChange,
  
  // Animation props
  animationEnabled = false,
  animationSpeed = 1.0,
  waveAmplitude = 2.0,
  isAnimating = false,
  onAnimationEnabledChange,
  onAnimationSpeedChange,
  onWaveAmplitudeChange,
  onToggleAnimation,
  
  // Rotation props
  rotationEnabled = false,
  rotationSpeed = 1.0,
  rotationDirection = 'clockwise',
  isRotating = false,
  rotationDirectionText = '시계방향',
  bearingDisplay = '0°',
  onRotationEnabledChange,
  onRotationSpeedChange,
  onRotationDirectionChange,
  onToggleRotation,
}: UnifiedControlsProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [activeTab, setActiveTab] = useState("map")
  const [isExpanded, setIsExpanded] = useState(false) // Start collapsed

  const currentLayerInfo = mapLayers.find((layer) => layer.id === currentLayer)

  // 최소화 토글
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

  return (
    <div className={`fixed bottom-[266px] z-50 transition-all duration-300 left-[400px]`}>
      <Card className={`bg-black/80 backdrop-blur-md border-white/20 text-white overflow-hidden ${isExpanded ? 'w-[280px]' : 'w-auto'}`}>
        {/* Clickable Header to expand/collapse */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-2 hover:bg-white/5 transition-colors group"
        >
          <div className="flex items-center space-x-2">
            <MapPin size={14} className="text-blue-400" />
            <span className="font-bold text-sm">레이어 컨트롤</span>
          </div>
          <div className="flex items-center space-x-2">
            {isDataLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4 text-white/70 group-hover:text-white/90 transition-colors" />
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
              <div className="px-2 pt-1 pb-2 border-b border-white/20">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onReset}
                  className="text-white hover:bg-white/10 w-full justify-center h-7 text-xs"
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
            {/* 레이어는 항상 ON 상태로 유지 */}

            {/* 형태 설정 */}
            <div className="space-y-3">

              {/* 반지름 */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label className="text-white text-xs">반지름: {radius}m</Label>
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
                <div className="flex justify-between text-xs text-white/60">
                  <span>100m</span>
                  <span>3000m</span>
                </div>
              </div>

              {/* 높이 스케일 */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label className="text-white text-xs">높이 스케일: {elevationScale}x</Label>
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
                <div className="flex justify-between text-xs text-white/60">
                  <span>0.1x</span>
                  <span>5x</span>
                </div>
              </div>

            </div>

            <Separator className="bg-white/20" />

            {/* 시각 설정 */}
            <div className="space-y-3">

              {/* 색상 스킴 */}
              <div className="space-y-1">
                <Label className="text-white text-xs">색상 스킴</Label>
                <Select
                  value={colorScheme}
                  onValueChange={(value: ColorScheme) => onColorSchemeChange(value)}
                  disabled={isDataLoading}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-white/20 max-h-96">
                    {Object.entries(COLOR_PALETTE_INFO).map(([key, info]) => (
                      <SelectItem key={key} value={key} className="text-white hover:bg-white/10">
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
                <Label className="text-white text-xs">색상 미리보기</Label>
                <div 
                  className="h-6 rounded-lg"
                  style={getColorPreviewStyle(colorScheme)}
                ></div>
                <div className="flex justify-between text-xs text-white/60">
                  <span>낮음</span>
                  <span>높음</span>
                </div>
                <div className="text-xs text-white/50">
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