"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Eye, EyeOff } from "lucide-react"
import { BUSINESS_CATEGORIES } from "../constants/businessCategories"

export function BusinessCategoryLegend() {
  const [isVisible, setIsVisible] = useState(true)

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
        <span className="text-sm">업종 범례</span>
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
            style={{ minWidth: "200px" }}
          >
            <h3 className="text-white text-sm font-semibold mb-3">업종별 카테고리</h3>
            <div className="space-y-2">
              {BUSINESS_CATEGORIES.map((category) => (
                <div key={category.name} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-white/80 text-xs">{category.name}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-white/50 text-[10px]">
                * 각 동별 업종 매출액 표시
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}