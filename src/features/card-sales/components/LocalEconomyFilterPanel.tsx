"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Filter, MapPin, Briefcase, BarChart3, RefreshCw } from "lucide-react"
import { Card } from "@/src/shared/components/ui/card"
import { Label } from "@/src/shared/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/shared/components/ui/select"
import { Button } from "@/src/shared/components/ui/button"
import { Badge } from "@/src/shared/components/ui/badge"
import { Separator } from "@/src/shared/components/ui/separator"
import { Switch } from "@/src/shared/components/ui/switch"
import { BarChart } from '@/src/shared/components/charts'
import { 
  districtHierarchy, 
  getAllDistricts, 
  getDongsByDistrict 
} from "../data/districtHierarchy"
import { 
  districtCodes, 
  dongCodes, 
  getDistrictCode, 
  getDongCode 
} from "../data/districtCodeMappings"
import { 
  actualBusinessTypes,
  getAllBusinessTypes
} from "../data/businessHierarchy"

interface LocalEconomyFilterPanelProps {
  hexagonData?: any[] | null
  climateData?: any[] | null
  onFilterChange?: (filters: FilterState) => void
  className?: string
  displayMode?: 'simple' | 'detailed'
  onToggleDisplayMode?: () => void
  // External filter state synchronization
  externalSelectedGu?: string | null
  externalSelectedDong?: string | null
  externalSelectedBusinessType?: string | null
  // 레이어 초기화 함수
  onResetLayers?: () => void
}

// Color palette for business categories
const CATEGORY_COLORS: Record<string, string> = {
  // Main categories
  "음식": "#3B82F6", // Blue
  "쇼핑": "#10B981", // Green
  "교통": "#F97316", // Orange
  "문화/여가": "#A855F7", // Purple
  "의료": "#EF4444", // Red
  "교육": "#EAB308", // Yellow
  "숙박": "#EC4899", // Pink
  "기타": "#6B7280", // Gray
  
  // Subcategories - Food
  "한식": "#60A5FA",
  "중식": "#3B82F6",
  "일식": "#2563EB",
  "양식": "#1D4ED8",
  "패스트푸드": "#1E40AF",
  "카페/베이커리": "#93C5FD",
  "주점": "#BFDBFE",
  "기타음식점": "#DBEAFE",
  
  // Subcategories - Shopping
  "백화점": "#34D399",
  "대형마트": "#10B981",
  "슈퍼마켓": "#059669",
  "편의점": "#047857",
  "의류/신발": "#065F46",
  "화장품": "#6EE7B7",
  "전자제품": "#A7F3D0",
  "가구/인테리어": "#D1FAE5",
  "서적/문구": "#ECFDF5",
  "스포츠용품": "#86EFAC",
  "기타소매": "#BBF7D0",
  
  // Subcategories - Transportation
  "대중교통": "#FB923C",
  "택시": "#F97316",
  "주유소": "#EA580C",
  "주차장": "#DC2626",
  "자동차정비": "#FDBA74",
  "렌터카": "#FED7AA",
  "기타교통": "#FEF3C7",
  
  // Default color for unmapped categories
  "전체": "#9CA3AF"
}

export interface FilterState {
  selectedGu: string | null        // 구 이름 (UI 표시용)
  selectedGuCode: number | null    // 구 코드 (필터링용)
  selectedDong: string | null      // 동 이름 (UI 표시용) 
  selectedDongCode: number | null  // 동 코드 (필터링용)
  selectedBusinessType: string | null
}

export default function LocalEconomyFilterPanel({
  hexagonData = null,
  climateData = null,
  onFilterChange,
  className = "",
  displayMode = 'simple',
  onToggleDisplayMode,
  // External filter state synchronization
  externalSelectedGu,
  externalSelectedDong,
  externalSelectedBusinessType,
  // 레이어 초기화 함수
  onResetLayers,
}: LocalEconomyFilterPanelProps) {
  // Panel state
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Track if update is from external props to prevent circular updates
  const isExternalUpdateRef = useRef(false)
  
  // Filter states
  const [selectedGu, setSelectedGu] = useState<string | null>(null)
  const [selectedGuCode, setSelectedGuCode] = useState<number | null>(null)
  const [selectedDong, setSelectedDong] = useState<string | null>(null)
  const [selectedDongCode, setSelectedDongCode] = useState<number | null>(null)
  const [selectedBusinessType, setSelectedBusinessType] = useState<string | null>(null)
  
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
    } else {
      setSelectedGu(value)
      const code = getDistrictCode(value)
      setSelectedGuCode(code || null)
      console.log('[LocalEconomyFilter] Selected Gu:', { name: value, code })
    }
    setSelectedDong(null) // Reset dong when district changes
    setSelectedDongCode(null)
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
  
  // Reset all filters and layers
  const handleReset = () => {
    setSelectedGu(null)
    setSelectedGuCode(null)
    setSelectedDong(null)
    setSelectedDongCode(null)
    setSelectedBusinessType(null)
    
    // 레이어 설정도 초기화
    if (onResetLayers) {
      onResetLayers()
    }
  }
  
  // External sync for bidirectional updates
  useEffect(() => {
    // Only update if values are different to prevent infinite loops
    if (externalSelectedGu !== undefined && externalSelectedGu !== selectedGu) {
      setSelectedGu(externalSelectedGu)
      setSelectedGuCode(externalSelectedGu ? getDistrictCode(externalSelectedGu) || null : null)
    }
  }, [externalSelectedGu])

  useEffect(() => {
    // Only update if values are different to prevent infinite loops
    if (externalSelectedDong !== undefined && externalSelectedDong !== selectedDong) {
      setSelectedDong(externalSelectedDong)
      if (selectedGu && externalSelectedDong) {
        setSelectedDongCode(getDongCode(selectedGu, externalSelectedDong) || null)
      } else {
        setSelectedDongCode(null)
      }
    }
  }, [externalSelectedDong, selectedGu])

  useEffect(() => {
    // Only update if values are different to prevent infinite loops
    if (externalSelectedBusinessType !== undefined && externalSelectedBusinessType !== selectedBusinessType) {
      setSelectedBusinessType(externalSelectedBusinessType)
    }
  }, [externalSelectedBusinessType])

  // Notify parent of filter changes
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange({
        selectedGu,
        selectedGuCode,
        selectedDong,
        selectedDongCode,
        selectedBusinessType
      })
    }
  }, [selectedGu, selectedGuCode, selectedDong, selectedDongCode, selectedBusinessType, onFilterChange])
  
  // Process data for bar chart based on filters
  const chartData = useMemo(() => {
    if (!climateData || climateData.length === 0 || climateData === null) {
      return []
    }
    
    // Filter data based on selections
    let filteredData = [...climateData]
    
    // Filter by district
    if (selectedGu) {
      filteredData = filteredData.filter(item => item.guName === selectedGu)
    }
    
    // Filter by dong
    if (selectedDong) {
      filteredData = filteredData.filter(item => item.dongName === selectedDong)
    }
    
    // Aggregate by category
    const categoryTotals: Record<string, number> = {}
    
    filteredData.forEach(item => {
      // If salesByCategory exists, use it
      if (item.salesByCategory) {
        Object.entries(item.salesByCategory).forEach(([category, amount]) => {
          // Filter by selected categories if any
          if (selectedBusinessType) {
            // 업종 선택 시 해당 업종만 표시
            if (category === selectedBusinessType) {
              categoryTotals[selectedBusinessType] = (categoryTotals[selectedBusinessType] || 0) + (amount as number)
            }
          } else {
            // 전체 카테고리 표시
            if (amount && amount > 0) {
              categoryTotals[category] = (categoryTotals[category] || 0) + (amount as number)
            }
          }
        })
      } else {
        // Fallback to total sales if no category breakdown
        const category = selectedBusinessType || '전체'
        categoryTotals[category] = (categoryTotals[category] || 0) + (item.totalSales || item.weight || 0)
      }
    })
    
    // Convert to chart format and sort by value
    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ 
        name, 
        value,
        color: CATEGORY_COLORS[name] || CATEGORY_COLORS["전체"] // Add color for each category
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10) // Top 10 categories
  }, [climateData, selectedGu, selectedDong, selectedBusinessType])
  
  // Count active filters
  const activeFilterCount = [selectedGu, selectedDong, selectedBusinessType]
    .filter(Boolean).length
  
  return (
    <div className={`fixed bottom-[266px] left-4 z-50 ${className}`}>
      <Card className={`bg-black/80 backdrop-blur-md border-white/20 text-white overflow-hidden ${isExpanded ? 'w-[360px]' : 'w-auto'}`}>
        {/* Clickable Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-2 hover:bg-white/5 transition-colors group"
        >
          <div className="flex items-center space-x-2">
            <Filter size={14} className="text-blue-400" />
            <span className="font-bold text-sm">데이터 필터</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount}개 활성
              </Badge>
            )}
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-white/70 group-hover:text-white/90 transition-colors" />
          </motion.div>
        </button>
        
        {/* Collapsible Content */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              style={{ overflow: "hidden" }}
            >
              <div className="px-2 pb-2 space-y-2">
                <Separator className="bg-white/20" />
                
                {/* Display Mode Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BarChart3 size={14} className="text-blue-400" />
                    <Label className="text-white font-semibold text-xs">표시 모드</Label>
                  </div>
                  <Button
                    onClick={onToggleDisplayMode}
                    variant="outline"
                    size="sm"
                    className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
                  >
                    {displayMode === 'simple' ? '상세 보기' : '단순 보기'}
                  </Button>
                </div>
                
                <Separator className="bg-white/20" />
                
                {/* District Selection Section */}
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <MapPin size={14} className="text-blue-400" />
                    <Label className="text-white font-semibold text-xs">지역선택</Label>
                  </div>
                  
                  {/* 자치구 Selection */}
                  <div className="space-y-0.5 pl-3">
                    <Label className="text-white/80 text-xs">자치구</Label>
                    <Select value={selectedGu || "전체"} onValueChange={handleGuChange}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="자치구를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-white/20 max-h-64 overflow-y-auto">
                        <SelectItem 
                          value="전체"
                          className="text-white hover:bg-white/10 font-semibold border-b border-white/10"
                        >
                          전체
                        </SelectItem>
                        {availableDistricts.map(district => (
                          <SelectItem 
                            key={district} 
                            value={district}
                            className="text-white hover:bg-white/10"
                          >
                            {district}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* 행정동 Selection */}
                  <div className="space-y-0.5 pl-3">
                    <Label className="text-white/80 text-xs">행정동</Label>
                    <Select 
                      value={selectedDong || "전체"} 
                      onValueChange={handleDongChange}
                      disabled={!selectedGu}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white disabled:opacity-50">
                        <SelectValue 
                          placeholder={selectedGu ? "행정동을 선택하세요" : "먼저 자치구를 선택하세요"} 
                        />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-white/20 max-h-64 overflow-y-auto">
                        {selectedGu && (
                          <SelectItem 
                            value="전체"
                            className="text-white hover:bg-white/10 font-semibold border-b border-white/10"
                          >
                            전체
                          </SelectItem>
                        )}
                        {availableDongs.map(dong => (
                          <SelectItem 
                            key={dong} 
                            value={dong}
                            className="text-white hover:bg-white/10"
                          >
                            {dong}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Separator className="bg-white/20" />
                
                {/* Business Category Selection Section */}
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Briefcase size={14} className="text-green-400" />
                    <Label className="text-white font-semibold text-xs">업종선택</Label>
                  </div>
                  
                  {/* 업종 Selection */}
                  <div className="space-y-0.5 pl-3">
                    <Label className="text-white/80 text-xs">업종</Label>
                    <Select 
                      value={selectedBusinessType || "전체"} 
                      onValueChange={handleBusinessTypeChange}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="업종을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-white/20 max-h-64 overflow-y-auto">
                        <SelectItem 
                          value="전체"
                          className="text-white hover:bg-white/10 font-semibold border-b border-white/10"
                        >
                          전체
                        </SelectItem>
                        {availableBusinessTypes.map(category => (
                          <SelectItem 
                            key={category} 
                            value={category}
                            className="text-white hover:bg-white/10"
                          >
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Reset Button */}
                <div className="pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="w-full bg-white/10 text-white border-white/20 hover:bg-white/20 disabled:opacity-50"
                    disabled={activeFilterCount === 0}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    <span>필터 및 레이어 초기화</span>
                  </Button>
                </div>
                
                <Separator className="bg-white/20" />
                
                {/* Bar Chart Section */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <BarChart3 size={14} className="text-yellow-400" />
                    <Label className="text-white font-semibold text-xs">매출 분석</Label>
                    {(selectedGu || selectedDong) && (
                      <Badge variant="outline" className="text-xs">
                        {selectedDong || selectedGu}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-3">
                    {chartData.length > 0 ? (
                      <BarChart
                        data={chartData}
                        xDataKey="name"
                        yDataKey="value"
                        height={150}
                        showGrid={true}
                        showTooltip={true}
                        barSize={25}
                      />
                    ) : (
                      <div className="text-center py-8 text-white/60">
                        <p>데이터가 없습니다</p>
                        <p className="text-xs mt-1">필터를 조정해보세요</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Data Summary */}
                  {chartData.length > 0 && (
                    <div className="text-xs text-white/60 space-y-1">
                      <div>📊 총 {chartData.length}개 카테고리</div>
                      <div>💰 총 매출: {(chartData.reduce((sum, item) => sum + item.value, 0) / 100000000).toFixed(1)}억원</div>
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
}