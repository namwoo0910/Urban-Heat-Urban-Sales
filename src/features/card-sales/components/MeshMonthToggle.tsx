/**
 * Month Toggle Component for Mesh Layer Switching
 * Switches between all 12 months (January - December 2024) mesh data
 */

"use client"

import { useState } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'

export interface MeshMonthToggleProps {
  selectedMonth: string
  onMonthChange: (month: string) => void
  className?: string
}

const MONTH_OPTIONS = [
  { value: '202401', label: '1월 2024', description: '2024년 1월 1일 매출 데이터' },
  { value: '202402', label: '2월 2024', description: '2024년 2월 1일 매출 데이터' },
  { value: '202403', label: '3월 2024', description: '2024년 3월 1일 매출 데이터' },
  { value: '202404', label: '4월 2024', description: '2024년 4월 1일 매출 데이터' },
  { value: '202405', label: '5월 2024', description: '2024년 5월 1일 매출 데이터' },
  { value: '202406', label: '6월 2024', description: '2024년 6월 1일 매출 데이터' },
  { value: '202407', label: '7월 2024', description: '2024년 7월 1일 매출 데이터' },
  { value: '202408', label: '8월 2024', description: '2024년 8월 1일 매출 데이터' },
  { value: '202409', label: '9월 2024', description: '2024년 9월 1일 매출 데이터' },
  { value: '202410', label: '10월 2024', description: '2024년 10월 1일 매출 데이터' },
  { value: '202411', label: '11월 2024', description: '2024년 11월 1일 매출 데이터' },
  { value: '202412', label: '12월 2024', description: '2024년 12월 1일 매출 데이터' }
]

export function MeshMonthToggle({
  selectedMonth,
  onMonthChange,
  className = ''
}: MeshMonthToggleProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const selectedOption = MONTH_OPTIONS.find(option => option.value === selectedMonth) || MONTH_OPTIONS[0]

  return (
    <div className={`relative ${className}`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg border border-gray-600 transition-colors duration-200 min-w-[160px]"
      >
        <Calendar size={16} className="text-cyan-400" />
        <span className="text-sm font-medium">{selectedOption.label}</span>
        <ChevronDown 
          size={16} 
          className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 overflow-hidden">
          {MONTH_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onMonthChange(option.value)
                setIsOpen(false)
              }}
              className={`w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors duration-150 border-b border-gray-700 last:border-b-0 ${
                selectedMonth === option.value 
                  ? 'bg-cyan-900 text-cyan-200' 
                  : 'text-white'
              }`}
            >
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-xs text-gray-400">{option.description}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Click Outside to Close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

/**
 * Simple inline toggle variant (less space-consuming)
 * Uses scrollable layout for 12 months
 */
export function InlineMeshMonthToggle({
  selectedMonth,
  onMonthChange,
  className = ''
}: MeshMonthToggleProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedOption = MONTH_OPTIONS.find(option => option.value === selectedMonth) || MONTH_OPTIONS[0]

  return (
    <div className={`relative ${className}`}>
      {/* Compact Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg border border-gray-600 transition-colors duration-200"
      >
        <Calendar size={14} className="text-cyan-400" />
        <span className="text-xs font-medium">{selectedOption.label}</span>
        <ChevronDown 
          size={14} 
          className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu with Scrollable Grid */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-2">
            <div className="text-xs text-gray-400 mb-2 font-medium">월별 매출 데이터 선택</div>
            <div className="grid grid-cols-3 gap-1 max-h-48 overflow-y-auto">
              {MONTH_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onMonthChange(option.value)
                    setIsOpen(false)
                  }}
                  className={`px-2 py-2 text-xs font-medium rounded transition-colors duration-150 ${
                    selectedMonth === option.value 
                      ? 'bg-cyan-500 text-white' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {option.label.replace(' 2024', '')}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Click Outside to Close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}