"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Card } from "@/src/shared/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/shared/components/ui/select"
import { Button } from "@/src/shared/components/ui/button"
import { MapPin, Clock, Calendar, RefreshCw } from 'lucide-react'
import type { DistrictFilterState } from '@/src/shared/types/district-data'

interface DistrictFilterPanelProps {
  onFilterChange?: (filters: DistrictFilterState) => void
  showTimeFilter?: boolean
  showDateFilter?: boolean
  className?: string
  // For syncing with external state
  selectedGu?: string | null
  selectedDong?: string | null
  selectedHour?: number | null
  selectedDate?: string | null
  // Callbacks for individual filter changes
  onGuChange?: (gu: string | null) => void
  onDongChange?: (dong: string | null) => void
  onHourChange?: (hour: number | null) => void
  onDateChange?: (date: string | null) => void
}

// Import district data functions
import { 
  getAllDistricts, 
  getDongsByDistrict 
} from "@/src/features/card-sales/data/districtHierarchy"
import { 
  getDistrictCode, 
  getDongCode 
} from "@/src/features/card-sales/data/districtCodeMappings"

/**
 * Reusable district filter panel for selecting 구/동 and optional time filters
 */
export function DistrictFilterPanel({
  onFilterChange,
  showTimeFilter = false,
  showDateFilter = false,
  className = "",
  selectedGu: externalSelectedGu,
  selectedDong: externalSelectedDong,
  selectedHour: externalSelectedHour,
  selectedDate: externalSelectedDate,
  onGuChange,
  onDongChange,
  onHourChange,
  onDateChange
}: DistrictFilterPanelProps) {
  // Internal state
  const [selectedGu, setSelectedGu] = useState<string | null>(externalSelectedGu || null)
  const [selectedGuCode, setSelectedGuCode] = useState<number | null>(null)
  const [selectedDong, setSelectedDong] = useState<string | null>(externalSelectedDong || null)
  const [selectedDongCode, setSelectedDongCode] = useState<number | null>(null)
  const [selectedHour, setSelectedHour] = useState<number | null>(externalSelectedHour || null)
  const [selectedDate, setSelectedDate] = useState<string | null>(externalSelectedDate || null)

  // Sync with external state
  useEffect(() => {
    if (externalSelectedGu !== undefined) setSelectedGu(externalSelectedGu)
  }, [externalSelectedGu])
  
  useEffect(() => {
    if (externalSelectedDong !== undefined) setSelectedDong(externalSelectedDong)
  }, [externalSelectedDong])
  
  useEffect(() => {
    if (externalSelectedHour !== undefined) setSelectedHour(externalSelectedHour)
  }, [externalSelectedHour])
  
  useEffect(() => {
    if (externalSelectedDate !== undefined) setSelectedDate(externalSelectedDate)
  }, [externalSelectedDate])

  // Get available districts
  const districts = useMemo(() => getAllDistricts(), [])
  
  // Get dongs for selected district
  const availableDongs = useMemo(() => {
    if (!selectedGu) return []
    return getDongsByDistrict(selectedGu)
  }, [selectedGu])

  // Generate hour options (0-23)
  const hourOptions = useMemo(() => 
    Array.from({ length: 24 }, (_, i) => i), []
  )

  // Handle district selection
  const handleGuChange = (value: string) => {
    const gu = value === "all" ? null : value
    const guCode = gu ? getDistrictCode(gu) : null
    
    setSelectedGu(gu)
    setSelectedGuCode(guCode || null)
    setSelectedDong(null)
    setSelectedDongCode(null)
    
    onGuChange?.(gu)
    triggerFilterChange({
      selectedGu: gu,
      selectedGuCode: guCode,
      selectedDong: null,
      selectedDongCode: null
    })
  }

  // Handle dong selection
  const handleDongChange = (value: string) => {
    const dong = value === "all" ? null : value
    const dongCode = dong && selectedGu ? getDongCode(selectedGu, dong) : null
    
    setSelectedDong(dong)
    setSelectedDongCode(dongCode || null)
    
    onDongChange?.(dong)
    triggerFilterChange({
      selectedDong: dong,
      selectedDongCode: dongCode
    })
  }

  // Handle hour selection
  const handleHourChange = (value: string) => {
    const hour = value === "all" ? null : parseInt(value)
    setSelectedHour(hour)
    onHourChange?.(hour)
    triggerFilterChange({ selectedHour: hour })
  }

  // Handle date change
  const handleDateChange = (value: string) => {
    setSelectedDate(value)
    onDateChange?.(value)
    triggerFilterChange({ selectedDate: value })
  }

  // Trigger filter change callback
  const triggerFilterChange = (updates: Partial<DistrictFilterState>) => {
    if (onFilterChange) {
      onFilterChange({
        selectedGu: selectedGu,
        selectedGuCode,
        selectedDong: selectedDong,
        selectedDongCode,
        selectedHour,
        selectedDate,
        ...updates
      })
    }
  }

  // Reset all filters
  const handleReset = () => {
    setSelectedGu(null)
    setSelectedGuCode(null)
    setSelectedDong(null)
    setSelectedDongCode(null)
    setSelectedHour(null)
    setSelectedDate(null)
    
    onGuChange?.(null)
    onDongChange?.(null)
    onHourChange?.(null)
    onDateChange?.(null)
    
    onFilterChange?.({
      selectedGu: null,
      selectedGuCode: null,
      selectedDong: null,
      selectedDongCode: null,
      selectedHour: null,
      selectedDate: null
    })
  }

  return (
    <Card className={`absolute top-4 left-4 z-20 bg-gray-900/90 backdrop-blur-sm border-gray-800 ${className}`}>
      <div className="p-4 space-y-3">
        {/* District filters */}
        <div className="flex gap-2">
          <Select value={selectedGu || "all"} onValueChange={handleGuChange}>
            <SelectTrigger className="w-32 bg-gray-800 border-gray-700">
              <MapPin className="w-4 h-4 mr-2" />
              <SelectValue placeholder="구 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {districts.map(district => (
                <SelectItem key={district} value={district}>
                  {district}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={selectedDong || "all"} 
            onValueChange={handleDongChange}
            disabled={!selectedGu}
          >
            <SelectTrigger className="w-32 bg-gray-800 border-gray-700">
              <SelectValue placeholder="동 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {availableDongs.map(dong => (
                <SelectItem key={dong} value={dong}>
                  {dong}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Time filter */}
        {showTimeFilter && (
          <div className="flex gap-2">
            <Select value={selectedHour?.toString() || "all"} onValueChange={handleHourChange}>
              <SelectTrigger className="w-32 bg-gray-800 border-gray-700">
                <Clock className="w-4 h-4 mr-2" />
                <SelectValue placeholder="시간대" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {hourOptions.map(hour => (
                  <SelectItem key={hour} value={hour.toString()}>
                    {hour.toString().padStart(2, '0')}:00
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Date filter */}
        {showDateFilter && (
          <div className="flex gap-2">
            <input
              type="date"
              value={selectedDate || ''}
              onChange={(e) => handleDateChange(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm"
            />
          </div>
        )}

        {/* Reset button */}
        <Button
          onClick={handleReset}
          variant="outline"
          size="sm"
          className="w-full bg-gray-800 hover:bg-gray-700 border-gray-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          초기화
        </Button>
      </div>
    </Card>
  )
}