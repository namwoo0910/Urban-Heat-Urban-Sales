/**
 * UI Controls for EDA District Map
 *
 * Control panel for toggling layers and viewing options.
 */

import React from 'react'
import { Map, Layers, Tag, BarChart3, RotateCcw } from 'lucide-react'

interface UIControlsProps {
  showGuBoundaries: boolean
  showDongBoundaries: boolean
  showLabels: boolean
  showStats: boolean
  selectedGu: string | null
  selectedDong: string | null
  onToggleGuBoundaries: (value: boolean) => void
  onToggleDongBoundaries: (value: boolean) => void
  onToggleLabels: (value: boolean) => void
  onToggleStats: (value: boolean) => void
  onReset: () => void
}

export function UIControls({
  showGuBoundaries,
  showDongBoundaries,
  showLabels,
  showStats,
  selectedGu,
  selectedDong,
  onToggleGuBoundaries,
  onToggleDongBoundaries,
  onToggleLabels,
  onToggleStats,
  onReset
}: UIControlsProps) {
  return (
    <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 space-y-3 min-w-[200px]">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">레이어 설정</h3>

      {/* Layer toggles */}
      <div className="space-y-2">
        <ToggleButton
          icon={<Map className="w-4 h-4" />}
          label="자치구 경계"
          checked={showGuBoundaries}
          onChange={onToggleGuBoundaries}
        />

        <ToggleButton
          icon={<Layers className="w-4 h-4" />}
          label="행정동 경계"
          checked={showDongBoundaries}
          onChange={onToggleDongBoundaries}
        />

        <ToggleButton
          icon={<Tag className="w-4 h-4" />}
          label="지역명 표시"
          checked={showLabels}
          onChange={onToggleLabels}
        />

        <ToggleButton
          icon={<BarChart3 className="w-4 h-4" />}
          label="통계 표시"
          checked={showStats}
          onChange={onToggleStats}
          disabled
        />
      </div>

      {/* Reset button */}
      {(selectedGu || selectedDong) && (
        <button
          onClick={onReset}
          className="w-full mt-3 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center justify-center gap-2 text-sm text-gray-700"
        >
          <RotateCcw className="w-4 h-4" />
          초기화
        </button>
      )}
    </div>
  )
}

interface ToggleButtonProps {
  icon: React.ReactNode
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

function ToggleButton({ icon, label, checked, onChange, disabled = false }: ToggleButtonProps) {
  return (
    <label className={`flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only"
      />
      <div className={`
        w-10 h-5 rounded-full transition-colors relative
        ${checked ? 'bg-blue-500' : 'bg-gray-300'}
        ${disabled ? 'opacity-50' : ''}
      `}>
        <div className={`
          absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform
          ${checked ? 'translate-x-5' : 'translate-x-0.5'}
        `} />
      </div>
      <div className="flex items-center gap-1 text-sm text-gray-700">
        {icon}
        {label}
      </div>
    </label>
  )
}