/**
 * UI Controls for EDA District Map
 *
 * Control panel for toggling layers and viewing options.
 */

import React from 'react'
import { Map, Layers, Tag, BarChart3, RotateCcw, Sparkles } from 'lucide-react'
import type { ThemeKey } from '../utils/edaColorPalette'
import { DISTRICT_GRADIENTS } from '../utils/edaColorPalette'

interface UIControlsProps {
  showGuBoundaries: boolean
  showDongBoundaries: boolean
  showLabels: boolean
  showStats: boolean
  selectedGu: string | null
  selectedDong: string | null
  currentTheme?: ThemeKey
  useUniqueColors?: boolean
  selectionMode?: 'gu' | 'dong'
  onToggleGuBoundaries: (value: boolean) => void
  onToggleDongBoundaries: (value: boolean) => void
  onToggleLabels: (value: boolean) => void
  onToggleStats: (value: boolean) => void
  onThemeChange?: (theme: ThemeKey) => void
  onToggleUniqueColors?: (value: boolean) => void
  onSelectionModeChange?: (mode: 'gu' | 'dong') => void
  onReset: () => void
}

export function UIControls({
  showGuBoundaries,
  showDongBoundaries,
  showLabels,
  showStats,
  selectedGu,
  selectedDong,
  currentTheme = 'ocean',
  useUniqueColors = true,
  selectionMode = 'gu',
  onToggleGuBoundaries,
  onToggleDongBoundaries,
  onToggleLabels,
  onToggleStats,
  onThemeChange,
  onToggleUniqueColors,
  onSelectionModeChange,
  onReset
}: UIControlsProps) {
  return (
    <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 space-y-3 min-w-[250px]">
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

      {onSelectionModeChange && (
        <div className="border-t pt-3 mt-3">
          <h4 className="text-xs font-semibold text-gray-600 mb-2">선택 모드</h4>
          <div className="grid grid-cols-2 gap-2">
            <SelectionButton
              label="자치구"
              active={selectionMode === 'gu'}
              onClick={() => onSelectionModeChange('gu')}
            />
            <SelectionButton
              label="행정동"
              active={selectionMode === 'dong'}
              onClick={() => onSelectionModeChange('dong')}
            />
          </div>
        </div>
      )}

      {/* Theme selection */}
      {onThemeChange && (
        <div className="border-t pt-3 mt-3">
          <h4 className="text-xs font-semibold text-gray-600 mb-2">색상 테마</h4>
          <select
            value={currentTheme}
            onChange={(e) => onThemeChange(e.target.value as ThemeKey)}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {Object.entries(DISTRICT_GRADIENTS).map(([key, theme]) => (
              <option key={key} value={key}>
                {theme.name}
              </option>
            ))}
          </select>

          {onToggleUniqueColors && (
            <ToggleButton
              icon={<Sparkles className="w-4 h-4" />}
              label="구별 고유 색상"
              checked={useUniqueColors}
              onChange={onToggleUniqueColors}
              className="mt-2"
            />
          )}
        </div>
      )}

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
  className?: string
}

function ToggleButton({ icon, label, checked, onChange, disabled = false, className = '' }: ToggleButtonProps) {
  return (
    <label className={`flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
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

interface SelectionButtonProps {
  label: string
  active: boolean
  onClick: () => void
}

function SelectionButton({ label, active, onClick }: SelectionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full px-3 py-2 text-sm rounded-md border transition-colors
        ${active ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'}
      `}
    >
      {label}
    </button>
  )
}
