/**
 * District Grid Selector Component
 *
 * Displays Seoul's 25 districts in a 5x5 grid for easy selection.
 * When a district is clicked, shows a popup with neighborhoods.
 */

"use client"

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { districtCodes, dongCodes } from '@/src/features/card-sales/data/districtCodeMappings'

interface DistrictGridSelectorProps {
  selectedGu?: string | null
  selectedDong?: string | null
  onDistrictSelect: (guName: string, guCode: number) => void
  onNeighborhoodSelect: (guName: string, guCode: number, dongName: string, dongCode: number) => void
  className?: string
}

export function DistrictGridSelector({
  selectedGu,
  selectedDong,
  onDistrictSelect,
  onNeighborhoodSelect,
  className = ''
}: DistrictGridSelectorProps) {
  const [showNeighborhoodPopup, setShowNeighborhoodPopup] = useState(false)
  const [selectedDistrictForPopup, setSelectedDistrictForPopup] = useState<string | null>(null)

  // Sort districts alphabetically and arrange in 5x5 grid
  const sortedDistricts = useMemo(() => {
    return Object.keys(districtCodes).sort((a, b) => a.localeCompare(b, 'ko'))
  }, [])

  // Get neighborhoods for a specific district
  const getNeighborhoods = useMemo(() => {
    const neighborhoodMap: Record<string, string[]> = {}

    Object.keys(dongCodes).forEach(key => {
      const [guName, dongName] = key.split('_')
      if (!neighborhoodMap[guName]) {
        neighborhoodMap[guName] = []
      }
      neighborhoodMap[guName].push(dongName)
    })

    // Sort neighborhoods alphabetically
    Object.keys(neighborhoodMap).forEach(guName => {
      neighborhoodMap[guName].sort((a, b) => a.localeCompare(b, 'ko'))
    })

    return neighborhoodMap
  }, [])

  const handleDistrictClick = (guName: string) => {
    const guCode = districtCodes[guName]
    setSelectedDistrictForPopup(guName)
    setShowNeighborhoodPopup(true)
    onDistrictSelect(guName, guCode)
  }

  const handleNeighborhoodClick = (dongName: string) => {
    if (!selectedDistrictForPopup) return

    const guCode = districtCodes[selectedDistrictForPopup]
    const dongKey = `${selectedDistrictForPopup}_${dongName}`
    const dongCode = dongCodes[dongKey]

    if (dongCode) {
      onNeighborhoodSelect(selectedDistrictForPopup, guCode, dongName, dongCode)
    }

    setShowNeighborhoodPopup(false)
    setSelectedDistrictForPopup(null)
  }

  const closePopup = () => {
    setShowNeighborhoodPopup(false)
    setSelectedDistrictForPopup(null)
  }

  return (
    <>
      {/* 5x5 District Grid */}
      <div className={`bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-6 ${className}`}>
        <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">서울특별시 자치구 선택</h3>

        <div className="grid grid-cols-5 gap-2">
          {sortedDistricts.map((guName, index) => {
            const isSelected = selectedGu === guName
            return (
              <motion.button
                key={guName}
                onClick={() => handleDistrictClick(guName)}
                className={`
                  relative p-3 rounded-lg text-sm font-medium transition-all duration-200
                  ${isSelected
                    ? 'bg-blue-500 text-white shadow-lg ring-2 ring-blue-300'
                    : 'bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 hover:shadow-md'
                  }
                  active:scale-95 touch-manipulation
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                layout
              >
                <div className="text-center">
                  {guName}
                </div>

                {isSelected && (
                  <motion.div
                    className="absolute inset-0 bg-blue-400/20 rounded-lg"
                    layoutId="selectedDistrict"
                    transition={{ duration: 0.2 }}
                  />
                )}
              </motion.button>
            )
          })}
        </div>

        {selectedGu && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-800">
              <span className="font-semibold">선택된 구:</span> {selectedGu}
              {selectedDong && (
                <>
                  <span className="mx-2">•</span>
                  <span className="font-semibold">선택된 동:</span> {selectedDong}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Neighborhood Popup */}
      <AnimatePresence>
        {showNeighborhoodPopup && selectedDistrictForPopup && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePopup}
            />

            {/* Popup */}
            <motion.div
              className="fixed inset-4 md:inset-8 lg:inset-16 bg-white rounded-lg shadow-2xl z-50 overflow-hidden"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
                <h2 className="text-xl font-bold text-gray-800">
                  {selectedDistrictForPopup} 행정동 선택
                </h2>
                <button
                  onClick={closePopup}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Neighborhood Grid */}
              <div className="p-6 overflow-y-auto max-h-full">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {getNeighborhoods[selectedDistrictForPopup]?.map((dongName) => {
                    const isSelected = selectedDong === dongName
                    return (
                      <motion.button
                        key={dongName}
                        onClick={() => handleNeighborhoodClick(dongName)}
                        className={`
                          p-4 rounded-lg text-sm font-medium transition-all duration-200
                          ${isSelected
                            ? 'bg-emerald-500 text-white shadow-lg ring-2 ring-emerald-300'
                            : 'bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 hover:shadow-md'
                          }
                          active:scale-95 touch-manipulation
                        `}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {dongName}
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}