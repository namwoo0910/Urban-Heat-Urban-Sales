"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Filter, Pipette, Sparkles } from "lucide-react"
import { Card } from "@/src/shared/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/shared/components/ui/select"
import { Button } from "@/src/shared/components/ui/button"
import { Slider } from "@/src/shared/components/ui/slider"
import { 
  getAllDistricts, 
  getDongsByDistrict 
} from "../data/districtHierarchy"
import { 
  getDistrictCode, 
  getDongCode 
} from "../data/districtCodeMappings"
import { 
  getAllBusinessTypes
} from "../data/businessHierarchy"

interface LocalEconomyFilterPanelProps {
  onFilterChange?: (filters: FilterState) => void
  onThemeChange?: (theme: string, customColor?: string, saturationScale?: number) => void
  currentTheme?: string
  className?: string
  // External filter state synchronization
  externalSelectedGu?: string | null
  externalSelectedDong?: string | null
  externalSelectedBusinessType?: string | null
  // Timeline animation state
  isTimelineAnimating?: boolean
}

export interface FilterState {
  selectedGu: string | null        // 구 이름 (UI 표시용)
  selectedGuCode: number | null    // 구 코드 (필터링용)
  selectedDong: string | null      // 동 이름 (UI 표시용) 
  selectedDongCode: number | null  // 동 코드 (필터링용)
  selectedBusinessType: string | null
}

const LocalEconomyFilterPanel = React.memo(function LocalEconomyFilterPanel({
  onFilterChange,
  onThemeChange,
  currentTheme = 'ocean',
  className = "",
  // External filter state synchronization
  externalSelectedGu,
  externalSelectedDong,
  externalSelectedBusinessType,
  // Timeline animation state
  isTimelineAnimating = false,
}: LocalEconomyFilterPanelProps) {

  // Expand/collapse state
  const [isExpanded, setIsExpanded] = useState(false)

  // Filter states
  const [selectedGu, setSelectedGu] = useState<string | null>(null)
  const [selectedGuCode, setSelectedGuCode] = useState<number | null>(null)
  const [selectedDong, setSelectedDong] = useState<string | null>(null)
  const [selectedDongCode, setSelectedDongCode] = useState<number | null>(null)
  const [selectedBusinessType, setSelectedBusinessType] = useState<string | null>(null)

  // Custom color and saturation states
  const [customColor, setCustomColor] = useState<string>('#2980B9')
  const [saturationBoost, setSaturationBoost] = useState(false)
  const [saturationScale, setSaturationScale] = useState(1.0)
  const [showSaturationSlider, setShowSaturationSlider] = useState(false)
  const colorInputRef = useRef<HTMLInputElement>(null)
  
  // Get available options
  const availableDistricts = useMemo(() => getAllDistricts(), [])
  const availableDongs = useMemo(() => {
    return selectedGu ? getDongsByDistrict(selectedGu) : []
  }, [selectedGu])
  
  const availableBusinessTypes = useMemo(() => getAllBusinessTypes(), [])
  
  // Handle district selection
  const handleGuChange = (value: string) => {
    if (value === '전체') {
      setSelectedGu(null)
      setSelectedGuCode(null)
      setSelectedDong(null)
      setSelectedDongCode(null)
      setSelectedBusinessType(null) // Reset business type as well
    } else {
      setSelectedGu(value)
      const code = getDistrictCode(value)
      setSelectedGuCode(code || null)
      setSelectedDong(null) // Reset dong when district changes
      setSelectedDongCode(null)
      console.log('[LocalEconomyFilter] Selected Gu:', { name: value, code })
    }
  }
  
  // Handle dong selection
  const handleDongChange = (value: string) => {
    if (value === '전체') {
      setSelectedDong(null)
      setSelectedDongCode(null)
    } else {
      setSelectedDong(value)
      if (selectedGu) {
        setSelectedDongCode(getDongCode(selectedGu, value) || null)
      }
    }
  }
  
  // Handle business type selection
  const handleBusinessTypeChange = (value: string) => {
    setSelectedBusinessType(value === '전체' ? null : value)
  }
  
  
  
  
  
  // Get available months
  const availableMonths = useMemo(() => {
    return [
      { value: '2024-01', label: '2024년 1월' },
      { value: '2024-02', label: '2024년 2월' },
      { value: '2024-03', label: '2024년 3월' },
      { value: '2024-04', label: '2024년 4월' },
      { value: '2024-05', label: '2024년 5월' },
      { value: '2024-06', label: '2024년 6월' },
      { value: '2024-07', label: '2024년 7월' },
      { value: '2024-08', label: '2024년 8월' },
      { value: '2024-09', label: '2024년 9월' },
      { value: '2024-10', label: '2024년 10월' },
      { value: '2024-11', label: '2024년 11월' },
      { value: '2024-12', label: '2024년 12월' }
    ]
  }, [])
  
  
  // External sync for bidirectional updates - Fixed to prevent infinite loops
  useEffect(() => {
    // Only update if values are different to prevent infinite loops
    if (externalSelectedGu !== undefined && externalSelectedGu !== selectedGu) {
      setSelectedGu(externalSelectedGu)
      setSelectedGuCode(externalSelectedGu ? getDistrictCode(externalSelectedGu) || null : null)
      // If gu is cleared, also clear dong
      if (!externalSelectedGu) {
        setSelectedDong(null)
        setSelectedDongCode(null)
      }
    }
  }, [externalSelectedGu]) // Remove selectedGu dependency to prevent loops

  useEffect(() => {
    // Only update if values are different to prevent infinite loops
    // Also check if parent gu exists before setting dong
    if (externalSelectedDong !== undefined && externalSelectedDong !== selectedDong) {
      // Only set dong if there's a selected gu or if dong is being cleared
      if (!externalSelectedDong || selectedGu) {
        setSelectedDong(externalSelectedDong)
        if (selectedGu && externalSelectedDong) {
          setSelectedDongCode(getDongCode(selectedGu, externalSelectedDong) || null)
        } else {
          setSelectedDongCode(null)
        }
      }
    }
  }, [externalSelectedDong, selectedGu]) // Keep selectedGu for dong code calculation

  useEffect(() => {
    // Only update if values are different to prevent infinite loops
    if (externalSelectedBusinessType !== undefined && externalSelectedBusinessType !== selectedBusinessType) {
      setSelectedBusinessType(externalSelectedBusinessType)
    }
  }, [externalSelectedBusinessType]) // Remove selectedBusinessType dependency


  // Track if it's the initial mount
  const isInitialMount = useRef(true)
  const previousValues = useRef({
    selectedGu,
    selectedGuCode,
    selectedDong,
    selectedDongCode,
    selectedBusinessType
  })

  // Notify parent of filter changes - Fixed to prevent initial trigger and loops
  useEffect(() => {
    // Skip initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false
      // Initialize previous values on mount
      previousValues.current = {
        selectedGu,
        selectedGuCode,
        selectedDong,
        selectedDongCode,
        selectedBusinessType
      }
      return
    }
    
    // Check if values actually changed
    const hasChanged = 
      previousValues.current.selectedGu !== selectedGu ||
      previousValues.current.selectedGuCode !== selectedGuCode ||
      previousValues.current.selectedDong !== selectedDong ||
      previousValues.current.selectedDongCode !== selectedDongCode ||
      previousValues.current.selectedBusinessType !== selectedBusinessType
    
    if (hasChanged && onFilterChange) {
      // Update previous values before calling onChange to prevent race conditions
      const newValues = {
        selectedGu,
        selectedGuCode,
        selectedDong,
        selectedDongCode,
        selectedBusinessType
      }
      previousValues.current = newValues
      
      // Use setTimeout to break the synchronous update chain
      setTimeout(() => {
        onFilterChange(newValues)
      }, 0)
    }
  }, [selectedGu, selectedGuCode, selectedDong, selectedDongCode, selectedBusinessType]) // Remove onFilterChange dependency
  
  
  // Theme colors for map
  const themes = [
    // Vibrant themes
    { id: 'ocean', color: '#0C2C84', label: 'Ocean' },
    { id: 'aurora', color: '#FF1493', label: 'Aurora' },
    { id: 'sunset', color: '#FF5E4D', label: 'Sunset' },
    { id: 'hologram', color: '#7828C8', label: 'Hologram' },
    { id: 'modern', color: '#2980B9', label: 'Modern' },
    { id: 'cyberpunk', color: '#FF0096', label: 'Cyberpunk' },
    // Pastel themes
    { id: 'pastelBlue', color: '#ADD8E6', label: 'Pastel Blue' },
    { id: 'pastelPink', color: '#FFB6C1', label: 'Pastel Pink' },
    { id: 'pastelGreen', color: '#98FB98', label: 'Pastel Green' },
    { id: 'pastelPurple', color: '#DDA0DD', label: 'Pastel Purple' },
    { id: 'pastelYellow', color: '#FFFACD', label: 'Pastel Yellow' },
    { id: 'pastelCoral', color: '#FFDAB9', label: 'Pastel Coral' },
    { id: 'pastelGray', color: '#D3D3D3', label: 'Pastel Gray' },
    { id: 'pastelMint', color: '#BDFCEE', label: 'Pastel Mint' }
  ]

  return (
    <div className={`fixed bottom-4 left-4 z-50 ${className}`}>
      <Card className={`bg-white/95 backdrop-blur-md border-blue-100/50 shadow-xl text-slate-700 overflow-hidden ${isExpanded ? 'w-[300px]' : 'w-auto'}`}>
        {/* Header with expand/collapse */}
        <div className="flex items-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-1 flex items-center justify-between p-2 hover:bg-blue-50/50 transition-colors group"
          >
            <div className="flex items-center space-x-1.5">
              <Filter size={14} className="text-blue-600" />
              <span className="font-medium text-xs text-slate-700">필터</span>
            </div>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </motion.div>
          </button>
        </div>

        {/* Collapsible Content */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              key="content"
              initial="collapsed"
              animate="open"
              exit="collapsed"
              variants={{
                open: { opacity: 1, height: "auto" },
                collapsed: { opacity: 0, height: 0 }
              }}
              transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
            >
              <div className="p-2 space-y-1 border-t border-blue-100/50">
                {/* First Row: 자치구 and 행정동 */}
                <div className="flex gap-1">
          <div className="flex-1">
            <Select value={selectedGu || "전체"} onValueChange={handleGuChange}>
              <SelectTrigger className="bg-white border-gray-200 text-slate-700 h-7 text-xs px-2 hover:border-blue-300">
                <SelectValue placeholder="자치구" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200 max-h-64 overflow-y-auto">
                <SelectItem 
                  value="전체"
                  className="text-slate-700 hover:bg-blue-50 font-semibold border-b border-gray-200"
                >
                  전체 자치구
                </SelectItem>
                {availableDistricts.map(district => (
                  <SelectItem 
                    key={district} 
                    value={district}
                    className="text-slate-700 hover:bg-blue-50"
                  >
                    {district}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1">
            <Select 
              value={selectedDong || "전체"}
              onValueChange={handleDongChange}
              disabled={!selectedGu}
            >
              <SelectTrigger className="bg-white border-gray-200 text-slate-700 disabled:opacity-50 h-7 text-xs px-2 hover:border-blue-300">
                <SelectValue>
                  {selectedDong || "전체 행정동"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200 max-h-64 overflow-y-auto">
                {selectedGu && (
                  <SelectItem 
                    value="전체"
                    className="text-slate-700 hover:bg-blue-50 font-semibold border-b border-gray-200"
                  >
                    전체 행정동
                  </SelectItem>
                )}
                {availableDongs.map(dong => (
                  <SelectItem 
                    key={dong} 
                    value={dong}
                    className="text-slate-700 hover:bg-blue-50"
                  >
                    {dong}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
                </div>

                {/* Second Row: 업종 and 상세보기 버튼 */}
                <div className="flex gap-1">
          <div className="flex-1">
            <Select 
              value={selectedBusinessType || "전체"} 
              onValueChange={handleBusinessTypeChange}
            >
              <SelectTrigger className="bg-white border-gray-200 text-slate-700 h-7 text-xs px-2 hover:border-blue-300">
                <SelectValue placeholder="업종" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200 max-h-64 overflow-y-auto">
                <SelectItem 
                  value="전체"
                  className="text-slate-700 hover:bg-blue-50 font-semibold border-b border-gray-200"
                >
                  전체 업종
                </SelectItem>
                {availableBusinessTypes.map(category => (
                  <SelectItem 
                    key={category} 
                    value={category}
                    className="text-slate-700 hover:bg-blue-50"
                  >
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
                </div>

                {/* Theme Selector - Compact color dots */}
                <div className="flex flex-col gap-1 pt-1 mt-1 border-t border-blue-100/50">
                  <div className="flex gap-1 items-center">
                    <span className="text-[10px] text-gray-500 self-center mr-1">색상:</span>
                    <div className="flex gap-1 items-center flex-wrap">
                      {themes.slice(0, 6).map(theme => (
                        <button
                          key={theme.id}
                          onClick={() => {
                            onThemeChange?.(theme.id, undefined, 1.0)
                            setSaturationBoost(false)
                            setSaturationScale(1.0)
                          }}
                          className={`w-4 h-4 rounded-full transition-all ${currentTheme === theme.id && !saturationBoost ? 'ring-2 ring-blue-400 ring-offset-1' : 'hover:scale-110'}`}
                          style={{ backgroundColor: theme.color }}
                          title={theme.label}
                        />
                      ))}
                      {/* Custom Color Picker */}
                      <button
                        onClick={() => colorInputRef.current?.click()}
                        className={`w-4 h-4 rounded border border-gray-400 transition-all flex items-center justify-center ${
                          currentTheme === 'custom' && !saturationBoost ? 'ring-2 ring-blue-400 ring-offset-1' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: currentTheme === 'custom' ? customColor : '#ffffff' }}
                        title="커스텀 색상"
                      >
                        {currentTheme !== 'custom' && <Pipette size={10} className="text-gray-600" />}
                      </button>
                      <input
                        ref={colorInputRef}
                        type="color"
                        value={customColor}
                        onChange={(e) => {
                          setCustomColor(e.target.value)
                          onThemeChange?.('custom', e.target.value)
                          setSaturationBoost(false)
                        }}
                        className="hidden"
                      />
                      {/* Saturation Control Button */}
                      <button
                        onClick={() => {
                          setShowSaturationSlider(!showSaturationSlider)
                          if (!showSaturationSlider && saturationScale === 1.0) {
                            // If opening for first time, set default boost
                            setSaturationScale(1.5)
                            setSaturationBoost(true)
                            onThemeChange?.(currentTheme || 'ocean', customColor, 1.5)
                          }
                        }}
                        className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${
                          saturationBoost
                            ? 'bg-gradient-to-br from-yellow-400 to-orange-500 border-yellow-500 ring-2 ring-yellow-400 ring-offset-1'
                            : 'bg-gray-100 border-gray-400 hover:scale-110'
                        }`}
                        title="채도 조절"
                      >
                        <Sparkles size={10} className={saturationBoost ? "text-white" : "text-gray-600"} />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-1 items-center">
                    <span className="text-[10px] text-gray-500 self-center mr-1">파스텔:</span>
                    <div className="flex gap-1 items-center flex-wrap">
                      {themes.slice(6).map(theme => (
                        <button
                          key={theme.id}
                          onClick={() => {
                            onThemeChange?.(theme.id, undefined, 1.0)
                            setSaturationBoost(false)
                            setSaturationScale(1.0)
                          }}
                          className={`w-4 h-4 rounded-full transition-all ${currentTheme === theme.id && !saturationBoost ? 'ring-2 ring-blue-400 ring-offset-1' : 'hover:scale-110'}`}
                          style={{ backgroundColor: theme.color }}
                          title={theme.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Saturation Scale Slider */}
                  {showSaturationSlider && (
                    <div className="pt-2 mt-2 border-t border-blue-100/50">
                      <div className="flex items-center gap-2">
                        <Sparkles size={10} className="text-yellow-500" />
                        <span className="text-[10px] text-gray-600">채도:</span>
                        <Slider
                          value={[saturationScale]}
                          onValueChange={(value) => {
                            const scale = value[0]
                            setSaturationScale(scale)
                            setSaturationBoost(scale > 1.0)
                            onThemeChange?.(currentTheme || 'ocean', customColor, scale)
                          }}
                          min={0.5}
                          max={2.5}
                          step={0.1}
                          className="flex-1"
                        />
                        <span className="text-[10px] text-gray-600 font-mono w-8">
                          {saturationScale.toFixed(1)}x
                        </span>
                        {saturationScale !== 1.0 && (
                          <button
                            onClick={() => {
                              setSaturationScale(1.0)
                              setSaturationBoost(false)
                              onThemeChange?.(currentTheme || 'ocean', customColor, 1.0)
                            }}
                            className="text-[9px] px-1 py-0.5 bg-gray-200 hover:bg-gray-300 rounded text-gray-600"
                            title="초기화"
                          >
                            초기화
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Return true if props are equal (skip re-render)
  return (
    prevProps.externalSelectedGu === nextProps.externalSelectedGu &&
    prevProps.externalSelectedDong === nextProps.externalSelectedDong &&
    prevProps.externalSelectedBusinessType === nextProps.externalSelectedBusinessType &&
    prevProps.isTimelineAnimating === nextProps.isTimelineAnimating &&
    prevProps.className === nextProps.className &&
    prevProps.onFilterChange === nextProps.onFilterChange &&
    prevProps.currentTheme === nextProps.currentTheme &&
    prevProps.onThemeChange === nextProps.onThemeChange
  )
})

export default LocalEconomyFilterPanel