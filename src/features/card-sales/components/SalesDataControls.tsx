"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { 
  MapPin, 
  RefreshCw,
  Loader2
} from "lucide-react"
import { Card } from "@/src/shared/components/ui/card"
import { Label } from "@/src/shared/components/ui/label"
import { Slider } from "@/src/shared/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/shared/components/ui/select"
import { Button } from "@/src/shared/components/ui/button"
import { Badge } from "@/src/shared/components/ui/badge"
import { Separator } from "@/src/shared/components/ui/separator"
import { COLOR_PALETTE_INFO, getColorPreviewStyle, type ColorScheme } from "@/src/features/card-sales/utils/premiumColors"

// 지도 레이어 정의 (Mapbox 스타일)
const mapLayers = [
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
}: UnifiedControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false) // Start collapsed

  return (
    <div className={`fixed bottom-[350px] z-50 transition-all duration-300 left-4`}>
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
            {/* 맵박스 레이어 선택 */}
            <div className="space-y-2">
              <Label className="text-white text-xs font-semibold">지도 스타일</Label>
              <Select
                value={currentLayer}
                onValueChange={onLayerChange}
                disabled={isDataLoading}
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black/90 border-white/20 max-h-64 overflow-y-auto">
                  {mapLayers.map((layer) => (
                    <SelectItem 
                      key={layer.id} 
                      value={layer.id} 
                      className="text-white hover:bg-white/10"
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

            <Separator className="bg-white/20" />

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