/**
 * Grid Interpolation Controls
 * 격자 보간 설정을 제어하는 UI 컴포넌트
 */

import React from 'react'
import { Label } from '@/src/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/shared/components/ui/select'
import { Slider } from '@/src/shared/components/ui/slider'
import { Badge } from '@/src/shared/components/ui/badge'
import { Button } from '@/src/shared/components/ui/button'
import { RefreshCw, Sliders } from 'lucide-react'
import type { DistributionMethod } from '../types/grid.types'

interface GridInterpolationControlsProps {
  // Control states
  distributionRadius: number
  smoothingSigma: number
  distributionMethod: DistributionMethod
  isProcessing?: boolean
  
  // Control handlers
  onDistributionRadiusChange: (radius: number) => void
  onSmoothingSigmaChange: (sigma: number) => void
  onDistributionMethodChange: (method: DistributionMethod) => void
  onReprocess?: () => void
}

const DISTRIBUTION_METHODS: { value: DistributionMethod; label: string; description: string }[] = [
  {
    value: 'gaussian',
    label: '가우시안',
    description: '자연스러운 확산 (권장)'
  },
  {
    value: 'inverse_distance',
    label: '역거리',
    description: '거리에 반비례한 가중치'
  },
  {
    value: 'nearest',
    label: '최근접',
    description: '가장 가까운 점에만 할당'
  }
]

export function GridInterpolationControls({
  distributionRadius,
  smoothingSigma,
  distributionMethod,
  isProcessing = false,
  onDistributionRadiusChange,
  onSmoothingSigmaChange,
  onDistributionMethodChange,
  onReprocess
}: GridInterpolationControlsProps) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders size={14} className="text-purple-400" />
          <Label className="text-white/80 text-xs font-semibold">격자 보간 설정</Label>
        </div>
        {onReprocess && (
          <Button
            onClick={onReprocess}
            disabled={isProcessing}
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-white/60 hover:text-white hover:bg-white/10"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${isProcessing ? 'animate-spin' : ''}`} />
            재처리
          </Button>
        )}
      </div>
      
      {/* Distribution Radius */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="text-white/70 text-[11px]">분배 반경</Label>
          <Badge variant="outline" className="text-[10px] px-1 py-0">
            {distributionRadius}m
          </Badge>
        </div>
        <Slider
          value={[distributionRadius]}
          onValueChange={(value) => onDistributionRadiusChange(value[0])}
          min={500}
          max={5000}
          step={100}
          disabled={isProcessing}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-white/50">
          <span>좁음 (500m)</span>
          <span>넓음 (5km)</span>
        </div>
        <div className="text-[10px] text-white/50 italic">
          행정동 중심에서 데이터가 퍼지는 범위
        </div>
      </div>
      
      {/* Smoothing Sigma */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="text-white/70 text-[11px]">스무딩 강도</Label>
          <Badge variant="outline" className="text-[10px] px-1 py-0">
            {smoothingSigma}m
          </Badge>
        </div>
        <Slider
          value={[smoothingSigma]}
          onValueChange={(value) => onSmoothingSigmaChange(value[0])}
          min={0}
          max={2000}
          step={50}
          disabled={isProcessing}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-white/50">
          <span>없음 (0m)</span>
          <span>강함 (2km)</span>
        </div>
        <div className="text-[10px] text-white/50 italic">
          격자 간 부드러운 전환 효과
        </div>
      </div>
      
      {/* Distribution Method */}
      <div className="space-y-2">
        <Label className="text-white/70 text-[11px]">분배 방법</Label>
        <Select
          value={distributionMethod}
          onValueChange={(value) => onDistributionMethodChange(value as DistributionMethod)}
          disabled={isProcessing}
        >
          <SelectTrigger className="bg-white/10 border-white/20 text-white text-xs h-7">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-white/20">
            {DISTRIBUTION_METHODS.map(method => (
              <SelectItem
                key={method.value}
                value={method.value}
                className="text-white hover:bg-white/10"
              >
                <div>
                  <div className="font-medium text-xs">{method.label}</div>
                  <div className="text-[10px] text-white/60">{method.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Info */}
      <div className="bg-purple-500/10 rounded-md p-2">
        <div className="text-[10px] text-purple-300/80 space-y-1">
          <div>💡 분배 반경을 늘리면 데이터가 더 넓게 퍼집니다</div>
          <div>🎨 스무딩을 높이면 더 부드러운 그라데이션을 만듭니다</div>
        </div>
      </div>
    </div>
  )
}