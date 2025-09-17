import React from 'react'

interface UIControlsProps {
  selectionMode?: 'gu' | 'dong'
  onSelectionModeChange?: (mode: 'gu' | 'dong') => void
  showChartPanel?: boolean
  onToggleChartPanel?: () => void
}

export function UIControls({
  selectionMode = 'gu',
  onSelectionModeChange,
  showChartPanel = false,
  onToggleChartPanel
}: UIControlsProps) {
  return (
    <div className="absolute bottom-6 right-6 space-y-2">
      {/* Chart panel toggle */}
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-2">
        <button
          type="button"
          onClick={onToggleChartPanel}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-md border transition-colors w-full
            bg-white border-gray-300 text-gray-600 hover:bg-gray-100"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {showChartPanel ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            )}
          </svg>
          <span>{showChartPanel ? '차트 패널 닫기' : '차트 패널 열기'}</span>
        </button>
      </div>

      {/* Selection mode buttons */}
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4">
        <div className="grid grid-cols-2 gap-2">
          <SelectionButton
            label="자치구"
            active={selectionMode === 'gu'}
            onClick={() => onSelectionModeChange?.('gu')}
          />
          <SelectionButton
            label="행정동"
            active={selectionMode === 'dong'}
            onClick={() => onSelectionModeChange?.('dong')}
          />
        </div>
      </div>
    </div>
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
        w-full px-4 py-2 text-sm rounded-md border transition-colors
        ${active ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'}
      `}
    >
      {label}
    </button>
  )
}
