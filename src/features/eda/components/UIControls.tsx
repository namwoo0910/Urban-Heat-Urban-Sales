import React from 'react'

interface UIControlsProps {
  selectionMode?: 'gu' | 'dong'
  onSelectionModeChange?: (mode: 'gu' | 'dong') => void
}

export function UIControls({ selectionMode = 'gu', onSelectionModeChange }: UIControlsProps) {
  return (
    <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4">
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
