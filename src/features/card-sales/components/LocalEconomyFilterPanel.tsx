"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Card } from "@/src/shared/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/shared/components/ui/select"
import { Button } from "@/src/shared/components/ui/button"
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
  className?: string
  displayMode?: 'simple' | 'detailed'
  onToggleDisplayMode?: () => void
  // External filter state synchronization
  externalSelectedGu?: string | null
  externalSelectedDong?: string | null
  externalSelectedBusinessType?: string | null
}

export interface FilterState {
  selectedGu: string | null        // 구 이름 (UI 표시용)
  selectedGuCode: number | null    // 구 코드 (필터링용)
  selectedDong: string | null      // 동 이름 (UI 표시용) 
  selectedDongCode: number | null  // 동 코드 (필터링용)
  selectedBusinessType: string | null
}

export default function LocalEconomyFilterPanel({
  onFilterChange,
  className = "",
  displayMode = 'simple',
  onToggleDisplayMode,
  // External filter state synchronization
  externalSelectedGu,
  externalSelectedDong,
  externalSelectedBusinessType,
}: LocalEconomyFilterPanelProps) {
  
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
  
  
  return (
    <div className={`fixed bottom-[266px] left-4 z-50 ${className}`}>
      <Card className="bg-black/90 backdrop-blur-md border-gray-800/50 shadow-2xl text-gray-200 p-2 w-[300px]">
        {/* First Row: 자치구 and 행정동 */}
        <div className="flex gap-1 mb-1">
          <div className="flex-1">
            <Select value={selectedGu || "전체"} onValueChange={handleGuChange}>
              <SelectTrigger className="bg-gray-900/50 border-gray-700/50 text-gray-200 h-7 text-xs px-2">
                <SelectValue placeholder="자치구" />
              </SelectTrigger>
              <SelectContent className="bg-black/95 border-gray-800/50 max-h-64 overflow-y-auto">
                <SelectItem 
                  value="전체"
                  className="text-gray-200 hover:bg-gray-900/50 font-semibold border-b border-gray-800/50"
                >
                  전체 자치구
                </SelectItem>
                {availableDistricts.map(district => (
                  <SelectItem 
                    key={district} 
                    value={district}
                    className="text-gray-200 hover:bg-gray-900/50"
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
              <SelectTrigger className="bg-gray-900/50 border-gray-700/50 text-gray-200 disabled:opacity-50 h-7 text-xs px-2">
                <SelectValue>
                  {selectedDong || "전체 행정동"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-black/95 border-gray-800/50 max-h-64 overflow-y-auto">
                {selectedGu && (
                  <SelectItem 
                    value="전체"
                    className="text-gray-200 hover:bg-gray-900/50 font-semibold border-b border-gray-800/50"
                  >
                    전체 행정동
                  </SelectItem>
                )}
                {availableDongs.map(dong => (
                  <SelectItem 
                    key={dong} 
                    value={dong}
                    className="text-gray-200 hover:bg-gray-900/50"
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
              <SelectTrigger className="bg-gray-900/50 border-gray-700/50 text-gray-200 h-7 text-xs px-2">
                <SelectValue placeholder="업종" />
              </SelectTrigger>
              <SelectContent className="bg-black/95 border-gray-800/50 max-h-64 overflow-y-auto">
                <SelectItem 
                  value="전체"
                  className="text-gray-200 hover:bg-gray-900/50 font-semibold border-b border-gray-800/50"
                >
                  전체 업종
                </SelectItem>
                {availableBusinessTypes.map(category => (
                  <SelectItem 
                    key={category} 
                    value={category}
                    className="text-gray-200 hover:bg-gray-900/50"
                  >
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button
            onClick={onToggleDisplayMode}
            variant="outline"
            size="sm"
            className="h-7 px-2 bg-gray-900/80 hover:bg-gray-800/90 text-gray-200 border-gray-700/50 text-xs whitespace-nowrap"
          >
            {displayMode === 'simple' ? '업종별' : '총매출'}
          </Button>
        </div>
      </Card>
    </div>
  )
}