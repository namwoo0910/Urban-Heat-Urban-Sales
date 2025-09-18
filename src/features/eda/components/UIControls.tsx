import React from 'react'

interface UIControlsProps {
  selectionMode?: 'gu' | 'dong'
  onSelectionModeChange?: (mode: 'gu' | 'dong') => void
}

export function UIControls({
  selectionMode = 'gu',
  onSelectionModeChange
}: UIControlsProps) {
  return (
    <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-30">
      {/* Selection mode buttons */}
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3">
        <div className="flex gap-2">
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
        px-4 py-2 text-sm rounded-md border transition-all duration-200 font-medium
        ${active
          ? 'bg-blue-600 border-blue-600 text-white shadow-sm hover:bg-blue-700'
          : 'bg-white/95 border-blue-100/50 text-slate-700 hover:bg-blue-50/95 hover:text-blue-700 hover:border-blue-200/70'
        }
      `}
    >
      {label}
    </button>
  )
}
