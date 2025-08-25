/**
 * Grid Interpolation Controls
 * 격자 보간 설정을 제어하는 UI 컴포넌트
 */

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/src/shared/components/ui/card'
import { Label } from '@/src/shared/components/ui/label'
import { Switch } from '@/src/shared/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/shared/components/ui/select'
import { Slider } from '@/src/shared/components/ui/slider'
import { Separator } from '@/src/shared/components/ui/separator'
import { Grid3x3, Sparkles, MapPin, CircleDot } from 'lucide-react'
import type { DistributionMethod } from '../types/grid.types'

interface GridInterpolationControlsProps {
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  distributionMethod: DistributionMethod
  onDistributionMethodChange: (method: DistributionMethod) => void
  isProcessing?: boolean
}

export function GridInterpolationControls({
  enabled,
  onEnabledChange,
  distributionMethod,
  onDistributionMethodChange,
  isProcessing = false
}: GridInterpolationControlsProps) {
  return (
    <Card className="bg-gray-900/95 backdrop-blur-sm border-gray-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-100 flex items-center gap-2">
          <Grid3x3 className="w-4 h-4" />
          격자 보간 설정
          {isProcessing && (
            <span className="text-xs text-blue-400 ml-auto">처리 중...</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 격자 보간 활성화 */}
        <div className="flex items-center justify-between">
          <Label 
            htmlFor="grid-interpolation" 
            className="text-xs text-gray-300 flex items-center gap-2"
          >
            <Sparkles className="w-3 h-3" />
            80x80 격자 보간
          </Label>
          <Switch
            id="grid-interpolation"
            checked={enabled}
            onCheckedChange={onEnabledChange}
            disabled={isProcessing}
            className="scale-90"
          />
        </div>
        
        {enabled && (
          <>
            <Separator className="bg-gray-800" />
            
            {/* 분배 방식 선택 */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-400">분배 방식</Label>
              <Select
                value={distributionMethod}
                onValueChange={(value) => onDistributionMethodChange(value as DistributionMethod)}
                disabled={isProcessing}
              >
                <SelectTrigger className="h-8 text-xs bg-gray-800/50 border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-800">
                  <SelectItem value="gaussian" className="text-xs">
                    <div className="flex items-center gap-2">
                      <CircleDot className="w-3 h-3" />
                      가우시안 (부드러운 분산)
                    </div>
                  </SelectItem>
                  <SelectItem value="inverse_distance" className="text-xs">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      역거리 가중치
                    </div>
                  </SelectItem>
                  <SelectItem value="nearest" className="text-xs">
                    <div className="flex items-center gap-2">
                      <Grid3x3 className="w-3 h-3" />
                      최근접 셀
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* 상태 표시 */}
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>격자 크기:</span>
                <span className="text-gray-400">80 × 80</span>
              </div>
              <div className="flex justify-between">
                <span>분배 반경:</span>
                <span className="text-gray-400">1,000m</span>
              </div>
              <div className="flex justify-between">
                <span>스무딩:</span>
                <span className="text-gray-400">활성화 (σ=500m)</span>
              </div>
            </div>
            
            {/* 설명 */}
            <div className="text-xs text-gray-600 italic">
              {distributionMethod === 'gaussian' && 
                "행정동 중심에서 주변으로 자연스럽게 분산됩니다."
              }
              {distributionMethod === 'inverse_distance' && 
                "거리에 반비례하여 가중치가 감소합니다."
              }
              {distributionMethod === 'nearest' && 
                "가장 가까운 격자 셀에만 데이터를 할당합니다."
              }
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}