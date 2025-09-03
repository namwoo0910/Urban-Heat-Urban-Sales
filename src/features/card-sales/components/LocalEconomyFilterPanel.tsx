"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
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
import { dateExtractor } from "../utils/dateExtractor"

interface LocalEconomyFilterPanelProps {
  onFilterChange?: (filters: FilterState) => void
  className?: string
  // External filter state synchronization
  externalSelectedGu?: string | null
  externalSelectedDong?: string | null
  externalSelectedBusinessType?: string | null
  externalSelectedDate?: string | null
  // Timeline animation state
  isTimelineAnimating?: boolean
}

export interface FilterState {
  selectedGu: string | null        // 구 이름 (UI 표시용)
  selectedGuCode: number | null    // 구 코드 (필터링용)
  selectedDong: string | null      // 동 이름 (UI 표시용) 
  selectedDongCode: number | null  // 동 코드 (필터링용)
  selectedBusinessType: string | null
  selectedDate: string | null      // 선택된 날짜 (YYYY-MM-DD 형식)
}

export default function LocalEconomyFilterPanel({
  onFilterChange,
  className = "",
  // External filter state synchronization
  externalSelectedGu,
  externalSelectedDong,
  externalSelectedBusinessType,
  externalSelectedDate,
  // Timeline animation state
  isTimelineAnimating = false,
}: LocalEconomyFilterPanelProps) {
  
  // Filter states
  const [selectedGu, setSelectedGu] = useState<string | null>(null)
  const [selectedGuCode, setSelectedGuCode] = useState<number | null>(null)
  const [selectedDong, setSelectedDong] = useState<string | null>(null)
  const [selectedDongCode, setSelectedDongCode] = useState<number | null>(null)
  const [selectedBusinessType, setSelectedBusinessType] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>('2024-01-01') // 기본값을 1월 1일로 설정
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [isLoadingDates, setIsLoadingDates] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<string>('2024-01')
  
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
  
  // Handle date selection
  const handleDateChange = (value: string) => {
    setSelectedDate(value === '전체' ? null : value)
  }
  
  // Handle month change
  const handleMonthChange = (value: string) => {
    setSelectedMonth(value)
    // When month changes, select the first date of that month by default
    const monthDates = dateExtractor.getDatesForMonth(value)
    if (monthDates.length > 0) {
      setSelectedDate(monthDates[0])
    }
  }
  
  // Load available dates on mount
  useEffect(() => {
    const loadDates = async () => {
      setIsLoadingDates(true)
      try {
        const allDates = await dateExtractor.loadAvailableDates()
        // Set dates for the initial selected month
        const monthDates = dateExtractor.getDatesForMonth(selectedMonth)
        setAvailableDates(monthDates)
        console.log(`[DateLoader] Loaded ${monthDates.length} dates for ${selectedMonth}`)
      } catch (error) {
        console.error('[DateLoader] Failed to load dates:', error)
      } finally {
        setIsLoadingDates(false)
      }
    }
    
    loadDates()
  }, [])
  
  // Update available dates when month changes
  useEffect(() => {
    const monthDates = dateExtractor.getDatesForMonth(selectedMonth)
    setAvailableDates(monthDates)
    console.log(`[DateSelector] Updated dates for ${selectedMonth}:`, monthDates.length)
  }, [selectedMonth])
  
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

  useEffect(() => {
    // Only update if values are different to prevent infinite loops
    if (externalSelectedDate !== undefined && externalSelectedDate !== selectedDate) {
      setSelectedDate(externalSelectedDate)
    }
  }, [externalSelectedDate]) // Remove selectedDate dependency

  // Track if it's the initial mount
  const isInitialMount = useRef(true)
  const previousValues = useRef({
    selectedGu,
    selectedGuCode,
    selectedDong,
    selectedDongCode,
    selectedBusinessType,
    selectedDate
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
        selectedBusinessType,
        selectedDate
      }
      return
    }
    
    // Check if values actually changed
    const hasChanged = 
      previousValues.current.selectedGu !== selectedGu ||
      previousValues.current.selectedGuCode !== selectedGuCode ||
      previousValues.current.selectedDong !== selectedDong ||
      previousValues.current.selectedDongCode !== selectedDongCode ||
      previousValues.current.selectedBusinessType !== selectedBusinessType ||
      previousValues.current.selectedDate !== selectedDate
    
    if (hasChanged && onFilterChange) {
      // Update previous values before calling onChange to prevent race conditions
      const newValues = {
        selectedGu,
        selectedGuCode,
        selectedDong,
        selectedDongCode,
        selectedBusinessType,
        selectedDate
      }
      previousValues.current = newValues
      
      // Use setTimeout to break the synchronous update chain
      setTimeout(() => {
        onFilterChange(newValues)
      }, 0)
    }
  }, [selectedGu, selectedGuCode, selectedDong, selectedDongCode, selectedBusinessType, selectedDate]) // Remove onFilterChange dependency
  
  
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
          
        </div>
        
        {/* Third Row: 날짜 선택 (월 선택 + 일 선택) */}
        <div className="flex gap-1 mt-1">
          {/* 월 선택 드롭다운 */}
          <div className="flex-1">
            <Select 
              value={selectedMonth} 
              onValueChange={handleMonthChange}
              disabled={isTimelineAnimating || isLoadingDates}
            >
              <SelectTrigger className={`bg-gray-900/50 border-gray-700/50 text-gray-200 h-7 text-xs px-2 ${
                (isTimelineAnimating || isLoadingDates) ? 'opacity-50' : ''
              }`}>
                <SelectValue>
                  {isLoadingDates ? '로딩 중...' : 
                    availableMonths.find(m => m.value === selectedMonth)?.label || selectedMonth
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-black/95 border-gray-800/50 max-h-64 overflow-y-auto">
                {availableMonths.map(month => (
                  <SelectItem 
                    key={month.value} 
                    value={month.value}
                    className="text-gray-200 hover:bg-gray-900/50"
                  >
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* 일 선택 드롭다운 */}
          <div className="flex-1">
            <Select 
              value={selectedDate || "전체"} 
              onValueChange={handleDateChange}
              disabled={isTimelineAnimating || isLoadingDates || availableDates.length === 0}
            >
              <SelectTrigger className={`bg-gray-900/50 border-gray-700/50 text-gray-200 h-7 text-xs px-2 ${
                (isTimelineAnimating || isLoadingDates) ? 'opacity-50' : ''
              }`}>
                <SelectValue>
                  {isTimelineAnimating && selectedDate ? 
                    `📅 ${new Date(selectedDate).getDate()}일` :
                    selectedDate ? 
                    `${new Date(selectedDate).getDate()}일` : 
                    "날짜 선택"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-black/95 border-gray-800/50 max-h-64 overflow-y-auto">
                {isLoadingDates ? (
                  <div className="text-gray-400 text-xs p-2">로딩 중...</div>
                ) : availableDates.length === 0 ? (
                  <div className="text-gray-400 text-xs p-2">데이터 없음</div>
                ) : (
                  availableDates.map(date => {
                    const dateObj = new Date(date)
                    const day = dateObj.getDate()
                    const weekday = dateObj.toLocaleDateString('ko-KR', { weekday: 'short' })
                    return (
                      <SelectItem 
                        key={date}
                        value={date}
                        className="text-gray-200 hover:bg-gray-900/50"
                      >
                        {`${day}일 (${weekday})`}
                      </SelectItem>
                    )
                  })
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>
    </div>
  )
}