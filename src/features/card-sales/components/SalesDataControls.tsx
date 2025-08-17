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
  onBoundaryToggle?: (show: boolean) => void
  onSeoulBaseToggle?: (show: boolean) => void
  
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
  onBoundaryToggle,
  onSeoulBaseToggle,
  
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
    <div className="fixed top-[76px] left-4 z-50">
      <Card className="bg-black/80 backdrop-blur-md border-white/20 text-white overflow-hidden">
        {/* Clickable Header to expand/collapse */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
        >
          <div className="flex items-center space-x-2">
            <MapPin size={18} className="text-blue-400" />
            <span className="font-bold">서울특별시</span>
            <span className="text-xs bg-blue-500/30 px-2 py-1 rounded">LIVE</span>
            {visible && <span className="text-xs bg-green-500/30 px-2 py-1 rounded">HexagonLayer</span>}
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
              <div className="px-4 pt-2 pb-3 border-b border-white/20">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onReset}
                  className="text-white hover:bg-white/10 w-full justify-center"
                  title="설정 초기화"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  설정 초기화
                </Button>
              </div>

              {/* 오류 표시 */}
              {dataError && (
                <div className="mx-4 mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <div className="text-sm text-red-200">
                    <strong>오류:</strong> {dataError}
                  </div>
                </div>
              )}

              <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
            {/* 레이어 활성화 토글 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Label htmlFor="layer-visible" className="text-white">
                  헥사곤 레이어 표시
                </Label>
                <Badge variant={visible ? "default" : "secondary"} className="text-xs">
                  {visible ? "ON" : "OFF"}
                </Badge>
              </div>
              <Switch
                id="layer-visible"
                checked={visible}
                onCheckedChange={onVisibleChange}
                disabled={isDataLoading}
              />
            </div>

            <Separator className="bg-white/20" />

            {/* 형태 설정 */}
            <div className="space-y-4">
              <Label className="text-white text-sm flex items-center space-x-2">
                <Settings size={16} />
                <span>형태 설정</span>
              </Label>

              {/* 반지름 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-white text-sm">반지름</Label>
                  <Badge variant="outline" className="text-xs">
                    {radius}m
                  </Badge>
                </div>
                <Slider
                  value={[radius]}
                  onValueChange={(value) => onRadiusChange(value[0])}
                  min={100}
                  max={3000}
                  step={100}
                  disabled={!visible || isDataLoading}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-white/60">
                  <span>100m</span>
                  <span>3000m</span>
                </div>
              </div>

              {/* 높이 스케일 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-white text-sm">높이 스케일</Label>
                  <Badge variant="outline" className="text-xs">
                    {elevationScale}x
                  </Badge>
                </div>
                <Slider
                  value={[elevationScale]}
                  onValueChange={(value) => onElevationScaleChange(value[0])}
                  min={1}
                  max={10}
                  step={0.5}
                  disabled={!visible || isDataLoading}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-white/60">
                  <span>1x</span>
                  <span>10x</span>
                </div>
              </div>

              {/* 커버리지 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-white text-sm">커버리지</Label>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(coverage * 100)}%
                  </Badge>
                </div>
                <Slider
                  value={[coverage]}
                  onValueChange={(value) => onCoverageChange(value[0])}
                  min={0.1}
                  max={1.0}
                  step={0.1}
                  disabled={!visible || isDataLoading}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-white/60">
                  <span>10%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            <Separator className="bg-white/20" />

            {/* 시각 설정 */}
            <div className="space-y-4">
              <Label className="text-white text-sm flex items-center space-x-2">
                <Palette size={16} />
                <span>시각 설정</span>
              </Label>

              {/* 색상 스킴 */}
              <div className="space-y-2">
                <Label className="text-white text-sm">색상 스킴</Label>
                <Select
                  value={colorScheme}
                  onValueChange={(value: ColorScheme) => onColorSchemeChange(value)}
                  disabled={!visible || isDataLoading}
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
              <div className="space-y-2">
                <Label className="text-white text-sm">색상 미리보기</Label>
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

              {/* 상위 백분위수 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-white text-sm">상위 백분위수</Label>
                  <Badge variant="outline" className="text-xs">
                    {upperPercentile}%
                  </Badge>
                </div>
                <Slider
                  value={[upperPercentile]}
                  onValueChange={(value) => onUpperPercentileChange(value[0])}
                  min={50}
                  max={100}
                  step={5}
                  disabled={!visible || isDataLoading}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-white/60">
                  <span>50%</span>
                  <span>100%</span>
                </div>
                <div className="text-xs text-white/60">
                  높은 값의 {100 - upperPercentile}%를 필터링합니다
                </div>
              </div>
            </div>

            <Separator className="bg-white/20" />
            
            {/* 애니메이션 설정 */}
            <div className="space-y-4">
              <Label className="text-white text-sm flex items-center space-x-2">
                <RefreshCw size={16} />
                <span>파도 애니메이션</span>
              </Label>

              {/* 애니메이션 활성화 토글 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="animation-enabled" className="text-white text-sm">
                    자동 애니메이션
                  </Label>
                  <Badge variant={animationEnabled ? "default" : "secondary"} className="text-xs">
                    {animationEnabled ? "ON" : "OFF"}
                  </Badge>
                  {isAnimating && (
                    <Badge variant="outline" className="text-xs animate-pulse">
                      실행중
                    </Badge>
                  )}
                </div>
                <Switch
                  id="animation-enabled"
                  checked={animationEnabled}
                  onCheckedChange={onAnimationEnabledChange}
                  disabled={!visible || isDataLoading}
                />
              </div>

              {/* 애니메이션 속도 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-white text-sm">애니메이션 속도</Label>
                  <Badge variant="outline" className="text-xs">
                    {animationSpeed}x
                  </Badge>
                </div>
                <Slider
                  value={[animationSpeed]}
                  onValueChange={(value) => onAnimationSpeedChange?.(value[0])}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  disabled={!visible || !animationEnabled || isDataLoading}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-white/60">
                  <span>0.5x (느림)</span>
                  <span>2.0x (빠름)</span>
                </div>
              </div>

              {/* 파도 진폭 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-white text-sm">파도 강도</Label>
                  <Badge variant="outline" className="text-xs">
                    {waveAmplitude}x
                  </Badge>
                </div>
                <Slider
                  value={[waveAmplitude]}
                  onValueChange={(value) => onWaveAmplitudeChange?.(value[0])}
                  min={1.0}
                  max={4.0}
                  step={0.1}
                  disabled={!visible || !animationEnabled || isDataLoading}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-white/60">
                  <span>1.0x (작음)</span>
                  <span>4.0x (큼)</span>
                </div>
              </div>

              {/* 애니메이션 제어 버튼 */}
              {animationEnabled && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onToggleAnimation}
                    disabled={!visible || isDataLoading}
                    className="text-white border-white/20 hover:bg-white/10 flex-1"
                  >
                    {isAnimating ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-1" />
                        일시정지
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-1" />
                        재생
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

                {/* 정보 패널 */}
                <div className="bg-white/5 rounded-lg p-3 text-xs text-white/60 space-y-1">
                  <div>💡 팁: 반지름과 높이를 조정하여 3D 효과를 변경하세요</div>
                  <div>🎨 색상: 프리미엄 팔레트로 세련된 시각화를 경험하세요</div>
                  <div>📏 높이: 데이터 밀도를 3D로 표현합니다</div>
                  <div>🌊 애니메이션: 파도 효과로 생동감 있는 데이터 시각화</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  )
}