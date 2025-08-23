"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Eye, EyeOff, Palette } from "lucide-react"
import { MIDDLE_CATEGORY_COLORS } from "../constants/middleCategoryColors"

interface MiddleCategoryLegendProps {
  selectedCategory?: string | null
}

export function MiddleCategoryLegend({ selectedCategory }: MiddleCategoryLegendProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [showAll, setShowAll] = useState(false)

  // 표시할 카테고리 결정
  const displayCategories = showAll 
    ? MIDDLE_CATEGORY_COLORS 
    : MIDDLE_CATEGORY_COLORS.slice(0, 10)

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        className="absolute bottom-4 right-4 z-10 bg-gray-900/90 backdrop-blur-sm text-white px-3 py-2 rounded-lg border border-white/10 hover:bg-gray-800/90 transition-colors flex items-center gap-2"
        onClick={() => setIsVisible(!isVisible)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        <span className="text-sm">중분류 범례</span>
      </motion.button>

      {/* Legend Panel */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-16 right-4 z-10 bg-gray-900/90 backdrop-blur-sm rounded-lg border border-white/10 p-4"
            style={{ minWidth: "220px", maxHeight: "400px", overflowY: "auto" }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white text-sm font-semibold flex items-center gap-2">
                <Palette className="w-4 h-4" />
                업종 중분류 카테고리
              </h3>
            </div>
            
            {selectedCategory && (
              <div className="mb-3 p-2 bg-white/10 rounded-md">
                <p className="text-white/80 text-xs">
                  선택된 카테고리: <span className="text-white font-semibold">{selectedCategory}</span>
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              {displayCategories.map((category) => (
                <div 
                  key={category.name} 
                  className={`flex items-center gap-2 p-1 rounded transition-all ${
                    selectedCategory === category.name 
                      ? 'bg-white/20 scale-105' 
                      : 'hover:bg-white/10'
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded"
                    style={{ 
                      backgroundColor: category.color,
                      opacity: selectedCategory && selectedCategory !== category.name ? 0.4 : 1
                    }}
                  />
                  <span 
                    className={`text-xs ${
                      selectedCategory === category.name 
                        ? 'text-white font-semibold' 
                        : 'text-white/80'
                    }`}
                  >
                    {category.name}
                  </span>
                </div>
              ))}
            </div>
            
            {MIDDLE_CATEGORY_COLORS.length > 10 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="mt-3 w-full py-1 text-xs text-white/60 hover:text-white transition-colors text-center"
              >
                {showAll ? '간략히 보기' : `모두 보기 (${MIDDLE_CATEGORY_COLORS.length}개)`}
              </button>
            )}
            
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-white/50 text-[10px]">
                * 선택된 중분류별 총 매출액 표시
              </p>
              <p className="text-white/50 text-[10px] mt-1">
                * 높이: 총 매출액 | 색상: 업종 구분
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}