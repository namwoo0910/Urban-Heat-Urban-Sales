'use client'

import React, { useState } from 'react'
import { ChevronUp, ChevronDown, Layers, Map } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface DistrictModeControlProps {
  selectionMode: boolean
  onModeChange: (selectionMode: boolean) => void
  selectedDistrict: string
  sggVisible?: boolean
  dongVisible?: boolean
  jibVisible?: boolean
  onSggVisibleChange?: (visible: boolean) => void
  onDongVisibleChange?: (visible: boolean) => void
  onJibVisibleChange?: (visible: boolean) => void
  showLayerControls?: boolean
  zoomLevel?: number
}

export function DistrictModeControl({
  selectionMode,
  onModeChange,
  selectedDistrict,
  sggVisible = true,
  dongVisible = true,
  jibVisible = false,
  onSggVisibleChange,
  onDongVisibleChange,
  onJibVisibleChange,
  showLayerControls = true,
  zoomLevel = 10
}: DistrictModeControlProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  
  return (
    <motion.div 
      className="absolute right-3 bottom-[203px] z-10 bg-gray-900 rounded-xl shadow-lg font-sans max-w-xs border border-gray-700"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header with toggle button */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800/50 transition-colors rounded-t-xl"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {selectionMode ? <Map className="w-5 h-5 text-gray-100" /> : <Layers className="w-5 h-5 text-gray-100" />}
          <strong className="text-gray-100 text-lg">
            {selectionMode ? '자치구 선택 모드' : '레이어 보기 모드'}
          </strong>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 0 : 180 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronUp className="w-5 h-5 text-gray-400" />
        </motion.div>
      </div>

      {/* Expandable content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0">
              <div className="mb-4">
                <strong className="text-gray-100 text-sm">모드 선택</strong>
                <div className="mt-2 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mode"
                      checked={!selectionMode}
                      onChange={() => onModeChange(false)}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-200 text-sm">레이어 보기 모드</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mode"
                      checked={selectionMode}
                      onChange={() => onModeChange(true)}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-200 text-sm">자치구 선택 모드</span>
                  </label>
                </div>
              </div>

              {!selectionMode && showLayerControls ? (
                // Layer toggle controls
                <div>
                  <strong className="text-gray-100 text-sm">레이어</strong>
                  {onSggVisibleChange && (
                    <label className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        checked={sggVisible}
                        onChange={(e) => onSggVisibleChange(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-gray-200 text-sm">자치구</span>
                    </label>
                  )}
                  {onDongVisibleChange && (
                    <label className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        checked={dongVisible}
                        onChange={(e) => onDongVisibleChange(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-gray-200 text-sm">행정동</span>
                    </label>
                  )}
                  {onJibVisibleChange && (
                    <label className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        checked={jibVisible}
                        onChange={(e) => onJibVisibleChange(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-gray-200 text-sm">집계구</span>
                      {zoomLevel < 10 && (
                        <span className="text-xs text-gray-400 ml-1">(zoom 10+)</span>
                      )}
                    </label>
                  )}
                  
                  <div className="mt-3 text-xs text-gray-300">
                    <div className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 bg-[#74c0fc] rounded-sm"></span>
                      <span>자치구 (파랑)</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="inline-block w-3 h-3 bg-[#8ce99a] rounded-sm"></span>
                      <span>행정동 (초록)</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="inline-block w-3 h-3 bg-[#f783ac] rounded-sm"></span>
                      <span>집계구 (분홍)</span>
                    </div>
                  </div>
                </div>
              ) : (
                // Selection mode info
                <div>
                  <div className="text-sm font-bold text-gray-200">선택된 자치구</div>
                  <div className="text-lg font-extrabold text-blue-400 mt-1">{selectedDistrict}</div>
                  <div className="text-xs text-gray-400 mt-2">
                    지도를 클릭하여 자치구를 선택하세요.<br/>
                    더블클릭으로 선택을 초기화합니다.
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}