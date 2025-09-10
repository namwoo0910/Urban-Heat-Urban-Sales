"use client"

import { useState, useEffect, useMemo } from 'react'
import { 
  ComposedChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Legend, 
  ResponsiveContainer,
  ErrorBar,
  Scatter,
  Cell,
  Line,
  Tooltip
} from '@/src/shared/components/ui/chart'
import { 
  loadNormalizedBoxPlotData, 
  loadDongBoxPlotData,
  type BoxPlotDataPoint,
  type DongBoxPlotDataPoint,
  type BoxPlotStats
} from '../../data/boxplotData'
import { 
  formatSalesAmount,
  aggregateByWeatherGroup,
  getBoxPlotByCategory,
  getAllCategoryNames,
  type WeatherGroupBoxPlotData
} from '../../utils/boxplotDataProcessor'

// 날씨별 색상 정의
const WEATHER_COLORS = {
  '한파': '#3B82F6',  // Blue
  '온화': '#10B981',  // Green  
  '폭염': '#EF4444'   // Red
}

// 커스텀 박스플롯 Shape 컴포넌트
const CustomBoxPlot = (props: any) => {
  const { x, y, width, height, payload, background } = props
  
  if (!payload) return null
  
  const data = payload
  const color = WEATHER_COLORS[data.temperatureGroup as keyof typeof WEATHER_COLORS]
  
  // Bar의 중심 x 좌표
  const centerX = x + width / 2
  const boxWidth = width * 0.8
  const boxLeft = centerX - boxWidth / 2
  const boxRight = centerX + boxWidth / 2
  const whiskerWidth = boxWidth * 0.5
  const whiskerLeft = centerX - whiskerWidth / 2
  const whiskerRight = centerX + whiskerWidth / 2
  
  // background에서 차트 영역 정보 가져오기
  const chartBottom = background?.y + background?.height || y + height
  const chartTop = background?.y || y
  const chartHeight = background?.height || height
  
  // Y축 스케일 함수 - 차트 영역 내에서 값의 위치 계산
  const yScale = (value: number) => {
    // yDomain은 차트 컴포넌트에서 설정한 값 사용
    const yDomain = props.yDomain || [0, 100000000]
    
    // 값이 도메인 범위를 벗어나면 경계값으로 제한
    const clampedValue = Math.max(yDomain[0], Math.min(yDomain[1], value))
    
    // 도메인 내에서의 비율 계산
    const ratio = (clampedValue - yDomain[0]) / (yDomain[1] - yDomain[0])
    
    // 차트 영역 내에서의 y 좌표 계산 (위에서 아래로)
    return chartTop + chartHeight * (1 - ratio)
  }
  
  // Y 좌표 계산
  const yMin = yScale(data.min)
  const yLowerWhisker = yScale(data.lowerWhisker)
  const yQ1 = yScale(data.Q1)
  const yMedian = yScale(data.median)
  const yQ3 = yScale(data.Q3)
  const yUpperWhisker = yScale(data.upperWhisker)
  const yMax = yScale(data.max)
  const yMean = yScale(data.mean)
  
  return (
    <g>
      {/* 아래 수염 (lowerWhisker to Q1) */}
      <line 
        x1={centerX} 
        y1={yLowerWhisker} 
        x2={centerX} 
        y2={yQ1}
        stroke={color} 
        strokeWidth={1.5}
      />
      
      {/* 위 수염 (Q3 to upperWhisker) */}
      <line 
        x1={centerX} 
        y1={yQ3} 
        x2={centerX} 
        y2={yUpperWhisker}
        stroke={color} 
        strokeWidth={1.5}
      />
      
      {/* 아래 수염 캡 */}
      <line 
        x1={whiskerLeft} 
        y1={yLowerWhisker} 
        x2={whiskerRight} 
        y2={yLowerWhisker}
        stroke={color} 
        strokeWidth={2}
      />
      
      {/* 위 수염 캡 */}
      <line 
        x1={whiskerLeft} 
        y1={yUpperWhisker} 
        x2={whiskerRight} 
        y2={yUpperWhisker}
        stroke={color} 
        strokeWidth={2}
      />
      
      {/* IQR 박스 (Q1 to Q3) */}
      <rect 
        x={boxLeft} 
        y={yQ3} 
        width={boxWidth} 
        height={Math.abs(yQ1 - yQ3)}
        fill={color}
        fillOpacity={0.3}
        stroke={color}
        strokeWidth={2}
      />
      
      {/* 중앙값 선 */}
      <line 
        x1={boxLeft} 
        y1={yMedian} 
        x2={boxRight} 
        y2={yMedian}
        stroke={color} 
        strokeWidth={3}
      />
      
      {/* 평균값 다이아몬드 */}
      <polygon
        points={`${centerX},${yMean - 4} ${centerX + 4},${yMean} ${centerX},${yMean + 4} ${centerX - 4},${yMean}`}
        fill="white"
        stroke={color}
        strokeWidth={2}
      />
    </g>
  )
}

// 박스플롯 바 전용 동적 툴팁 컴포넌트
const createBoxPlotTooltip = (processedData: any[]) => {
  return ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null
    
    // 모든 날씨의 중앙값 가져오기
    const 한파Data = processedData.find(d => d.temperatureGroup === '한파')
    const 온화Data = processedData.find(d => d.temperatureGroup === '온화')
    const 폭염Data = processedData.find(d => d.temperatureGroup === '폭염')
    
    const 한파 = 한파Data?.median || 0
    const 온화 = 온화Data?.median || 100
    const 폭염 = 폭염Data?.median || 0
    
    // 호버된 그룹에 따라 다른 비교 기준 적용
    let title = ''
    let comparisons = []
    
    if (label === '한파') {
      title = '한파 기준'
      const 온화차이 = 한파 !== 0 ? ((한파 - 온화) / 한파 * 100).toFixed(1) : '0'
      const 폭염차이 = 한파 !== 0 ? ((한파 - 폭염) / 한파 * 100).toFixed(1) : '0'
      comparisons = [
        { icon: '🌡️', name: '온화', diff: 온화차이 },
        { icon: '🔥', name: '폭염', diff: 폭염차이 }
      ]
    } else if (label === '온화') {
      title = '온화 기준'
      const 한파차이 = 온화 !== 0 ? ((온화 - 한파) / 온화 * 100).toFixed(1) : '0'
      const 폭염차이 = 온화 !== 0 ? ((온화 - 폭염) / 온화 * 100).toFixed(1) : '0'
      comparisons = [
        { icon: '❄️', name: '한파', diff: 한파차이 },
        { icon: '🔥', name: '폭염', diff: 폭염차이 }
      ]
    } else if (label === '폭염') {
      title = '폭염 기준'
      const 한파차이 = 폭염 !== 0 ? ((폭염 - 한파) / 폭염 * 100).toFixed(1) : '0'
      const 온화차이 = 폭염 !== 0 ? ((폭염 - 온화) / 폭염 * 100).toFixed(1) : '0'
      comparisons = [
        { icon: '❄️', name: '한파', diff: 한파차이 },
        { icon: '🌡️', name: '온화', diff: 온화차이 }
      ]
    } else {
      return null
    }
    
    return (
      <div className="rounded-lg border border-gray-800/50 bg-black/90 backdrop-blur-md p-2 shadow-lg">
        <div className="text-xs text-gray-400 font-semibold">{title}</div>
        <div className="text-xs text-gray-400 space-y-0.5 mt-1">
          {comparisons.map((comp, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span>{comp.icon} {comp.name}:</span>
              <span className={parseFloat(comp.diff) > 0 ? 'text-green-500' : 'text-red-500'}>
                {parseFloat(comp.diff) > 0 ? '+' : ''}{comp.diff}%
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }
}

// 중앙값 연결선 전용 툴팁 컴포넌트 (processedData를 props로 받음)
const createMedianLineTooltip = (processedData: any[]) => {
  return ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null
    
    // 모든 날씨의 중앙값 가져오기
    const 한파Data = processedData.find(d => d.temperatureGroup === '한파')
    const 온화Data = processedData.find(d => d.temperatureGroup === '온화')
    const 폭염Data = processedData.find(d => d.temperatureGroup === '폭염')
    
    if (!온화Data) return null
    
    const 한파 = 한파Data?.median || 0
    const 온화 = 온화Data.median || 100
    const 폭염 = 폭염Data?.median || 0
    
    // 온화 대비 차이 계산
    const 한파차이 = ((한파 - 온화) / 온화 * 100).toFixed(1)
    const 폭염차이 = ((폭염 - 온화) / 온화 * 100).toFixed(1)
    
    return (
      <div className="rounded-lg border border-gray-800/50 bg-black/90 backdrop-blur-md p-2 shadow-lg">
        <div className="text-xs text-gray-400 font-semibold">온화 대비 차이</div>
        <div className="text-xs text-gray-400 space-y-0.5 mt-1">
          <div className="flex items-center gap-2">
            <span>❄️ 한파:</span>
            <span className={parseFloat(한파차이) > 0 ? 'text-green-500' : 'text-red-500'}>
              {parseFloat(한파차이) > 0 ? '+' : ''}{한파차이}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span>🔥 폭염:</span>
            <span className={parseFloat(폭염차이) > 0 ? 'text-green-500' : 'text-red-500'}>
              {parseFloat(폭염차이) > 0 ? '+' : ''}{폭염차이}%
            </span>
          </div>
        </div>
      </div>
    )
  }
}

interface SalesBoxPlotChartProps {
  selectedBusinessType?: string | null
  selectedGuCode?: number | null
  selectedDongCode?: number | null
}

// Helper function to properly aggregate boxplot statistics
function aggregateBoxPlotStats(statsArray: BoxPlotStats[]): BoxPlotStats {
  if (statsArray.length === 0) {
    return {
      min: 0, Q1: 0, median: 0, Q3: 0, max: 0, 
      mean: 0, lowerWhisker: 0, upperWhisker: 0
    }
  }
  
  // Calculate weighted averages for each statistic
  const avgMedian = statsArray.reduce((sum, s) => sum + s.median, 0) / statsArray.length
  const avgMean = statsArray.reduce((sum, s) => sum + s.mean, 0) / statsArray.length
  const avgQ1 = statsArray.reduce((sum, s) => sum + s.Q1, 0) / statsArray.length
  const avgQ3 = statsArray.reduce((sum, s) => sum + s.Q3, 0) / statsArray.length
  
  // For min/max, take the actual extremes
  const actualMin = Math.min(...statsArray.map(s => s.min))
  const actualMax = Math.max(...statsArray.map(s => s.max))
  
  // Average the whiskers (they're already calculated properly in the source data)
  const avgLowerWhisker = statsArray.reduce((sum, s) => sum + s.lowerWhisker, 0) / statsArray.length
  const avgUpperWhisker = statsArray.reduce((sum, s) => sum + s.upperWhisker, 0) / statsArray.length
  
  return {
    min: actualMin,
    Q1: avgQ1,
    median: avgMedian,
    Q3: avgQ3,
    max: actualMax,
    mean: avgMean,
    lowerWhisker: avgLowerWhisker,
    upperWhisker: avgUpperWhisker
  }
}

export function SalesBoxPlotChart({ selectedBusinessType, selectedGuCode, selectedDongCode }: SalesBoxPlotChartProps) {
  const [rawData, setRawData] = useState<BoxPlotDataPoint[]>([])
  const [dongData, setDongData] = useState<DongBoxPlotDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryList, setCategoryList] = useState<string[]>([])
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null)
  
  // 행정동이 선택되었는지 확인
  const isDongMode = selectedDongCode !== null && selectedDongCode !== undefined
  
  // 자치구만 선택되었는지 확인 (행정동은 선택 안됨)
  const isGuMode = selectedGuCode !== null && selectedGuCode !== undefined && !isDongMode
  
  // 외부에서 전달된 업종 또는 기본값 '전체' 사용
  const activeCategory = selectedBusinessType || '전체'
  
  // 데이터 로드 (정규화된 데이터 사용)
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        // 업종별 데이터 로드
        const loadedData = await loadNormalizedBoxPlotData()
        console.log('[BoxPlot] Normalized data loaded:', loadedData.length, 'categories')
        setRawData(loadedData)
        
        // 업종 리스트 생성
        const categories = getAllCategoryNames(loadedData)
        setCategoryList(['전체', ...categories])
        
        // 행정동별 데이터 로드
        const loadedDongData = await loadDongBoxPlotData()
        console.log('[BoxPlot] Dong data loaded:', loadedDongData.length, 'dongs')
        setDongData(loadedDongData)
      } catch (error) {
        console.error('[BoxPlot] Failed to load data:', error)
        setRawData([])
        setDongData([])
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])
  
  // 선택된 업종 또는 행정동에 따라 데이터 처리
  const processedData = useMemo(() => {
    // 행정동과 업종이 모두 선택된 경우
    if (isDongMode && dongData.length > 0 && activeCategory !== '전체') {
      const selectedDongBusiness = dongData.find(
        d => d.dongCode === selectedDongCode && d.businessType === activeCategory
      )
      if (selectedDongBusiness) {
        console.log('[BoxPlot] Selected dong-business data:', selectedDongBusiness.dongName, selectedDongBusiness.businessType)
        // 특정 동-업종 조합 데이터를 WeatherGroupBoxPlotData 형식으로 변환
        return [
          {
            temperatureGroup: '한파',
            ...selectedDongBusiness.cold,
            error: [
              selectedDongBusiness.cold.median - selectedDongBusiness.cold.lowerWhisker,
              selectedDongBusiness.cold.upperWhisker - selectedDongBusiness.cold.median
            ]
          },
          {
            temperatureGroup: '온화',
            ...selectedDongBusiness.mild,
            error: [
              selectedDongBusiness.mild.median - selectedDongBusiness.mild.lowerWhisker,
              selectedDongBusiness.mild.upperWhisker - selectedDongBusiness.mild.median
            ]
          },
          {
            temperatureGroup: '폭염',
            ...selectedDongBusiness.hot,
            error: [
              selectedDongBusiness.hot.median - selectedDongBusiness.hot.lowerWhisker,
              selectedDongBusiness.hot.upperWhisker - selectedDongBusiness.hot.median
            ]
          }
        ]
      }
    }
    
    // 행정동만 선택된 경우 (업종 전체)
    if (isDongMode && dongData.length > 0 && activeCategory === '전체') {
      // 해당 동의 모든 업종 데이터를 집계
      const dongBusinessData = dongData.filter(d => d.dongCode === selectedDongCode)
      if (dongBusinessData.length > 0) {
        console.log('[BoxPlot] Aggregating dong data for all business types:', dongBusinessData.length, 'business types')
        
        // 각 날씨별로 모든 업종의 전체 통계 데이터를 집계
        const coldStats = dongBusinessData.map(d => d.cold)
        const mildStats = dongBusinessData.map(d => d.mild)
        const hotStats = dongBusinessData.map(d => d.hot)
        
        const aggregatedCold = aggregateBoxPlotStats(coldStats)
        const aggregatedMild = aggregateBoxPlotStats(mildStats)
        const aggregatedHot = aggregateBoxPlotStats(hotStats)
        
        return [
          {
            temperatureGroup: '한파',
            ...aggregatedCold,
            error: [
              aggregatedCold.median - aggregatedCold.lowerWhisker,
              aggregatedCold.upperWhisker - aggregatedCold.median
            ]
          },
          {
            temperatureGroup: '온화',
            ...aggregatedMild,
            error: [
              aggregatedMild.median - aggregatedMild.lowerWhisker,
              aggregatedMild.upperWhisker - aggregatedMild.median
            ]
          },
          {
            temperatureGroup: '폭염',
            ...aggregatedHot,
            error: [
              aggregatedHot.median - aggregatedHot.lowerWhisker,
              aggregatedHot.upperWhisker - aggregatedHot.median
            ]
          }
        ]
      }
    }
    
    // 자치구와 업종이 모두 선택된 경우
    if (isGuMode && dongData.length > 0 && activeCategory !== '전체') {
      const guDongBusinessData = dongData.filter(
        d => d.guCode === selectedGuCode && d.businessType === activeCategory
      )
      if (guDongBusinessData.length > 0) {
        console.log('[BoxPlot] Aggregating gu-business data:', guDongBusinessData.length, 'dongs')
        
        // 해당 구의 모든 동에서 특정 업종의 전체 통계 데이터를 집계
        const coldStats = guDongBusinessData.map(d => d.cold)
        const mildStats = guDongBusinessData.map(d => d.mild)
        const hotStats = guDongBusinessData.map(d => d.hot)
        
        const aggregatedCold = aggregateBoxPlotStats(coldStats)
        const aggregatedMild = aggregateBoxPlotStats(mildStats)
        const aggregatedHot = aggregateBoxPlotStats(hotStats)
        
        return [
          {
            temperatureGroup: '한파',
            ...aggregatedCold,
            error: [
              aggregatedCold.median - aggregatedCold.lowerWhisker,
              aggregatedCold.upperWhisker - aggregatedCold.median
            ]
          },
          {
            temperatureGroup: '온화',
            ...aggregatedMild,
            error: [
              aggregatedMild.median - aggregatedMild.lowerWhisker,
              aggregatedMild.upperWhisker - aggregatedMild.median
            ]
          },
          {
            temperatureGroup: '폭염',
            ...aggregatedHot,
            error: [
              aggregatedHot.median - aggregatedHot.lowerWhisker,
              aggregatedHot.upperWhisker - aggregatedHot.median
            ]
          }
        ]
      }
    }
    
    // 자치구만 선택된 경우 (업종 전체)
    if (isGuMode && dongData.length > 0 && activeCategory === '전체') {
      const guAllData = dongData.filter(d => d.guCode === selectedGuCode)
      if (guAllData.length > 0) {
        console.log('[BoxPlot] Aggregating all gu data:', guAllData.length, 'dong-business combinations')
        
        // 해당 구의 모든 동-업종 조합의 전체 통계 데이터를 집계
        const coldStats = guAllData.map(d => d.cold)
        const mildStats = guAllData.map(d => d.mild)
        const hotStats = guAllData.map(d => d.hot)
        
        const aggregatedCold = aggregateBoxPlotStats(coldStats)
        const aggregatedMild = aggregateBoxPlotStats(mildStats)
        const aggregatedHot = aggregateBoxPlotStats(hotStats)
        
        return [
          {
            temperatureGroup: '한파',
            ...aggregatedCold,
            error: [
              aggregatedCold.median - aggregatedCold.lowerWhisker,
              aggregatedCold.upperWhisker - aggregatedCold.median
            ]
          },
          {
            temperatureGroup: '온화',
            ...aggregatedMild,
            error: [
              aggregatedMild.median - aggregatedMild.lowerWhisker,
              aggregatedMild.upperWhisker - aggregatedMild.median
            ]
          },
          {
            temperatureGroup: '폭염',
            ...aggregatedHot,
            error: [
              aggregatedHot.median - aggregatedHot.lowerWhisker,
              aggregatedHot.upperWhisker - aggregatedHot.median
            ]
          }
        ]
      }
    }
    
    // 업종 모드인 경우
    if (!rawData.length) {
      console.log('[BoxPlot] No data to process')
      return []
    }
    
    if (activeCategory === '전체') {
      // 모든 업종 데이터를 날씨 그룹별로 집계
      const aggregatedData = aggregateByWeatherGroup(rawData)
      console.log('[BoxPlot] Aggregated weather data:', aggregatedData)
      return aggregatedData
    } else {
      // 특정 업종의 박스플롯 데이터
      const categoryData = getBoxPlotByCategory(rawData, activeCategory)
      console.log('[BoxPlot] Category data for', activeCategory, ':', categoryData)
      return categoryData || []
    }
  }, [rawData, dongData, activeCategory, isDongMode, isGuMode, selectedDongCode, selectedGuCode])
  
  // Y축 도메인 계산 (선택된 업종의 whisker 범위에 맞게 조정)
  const yDomain = useMemo(() => {
    if (!processedData.length) return [70, 130]
    
    // whisker 값만 사용하여 범위 설정
    const allValues = processedData.flatMap(item => [
      item.lowerWhisker,
      item.upperWhisker
    ])
    
    const maxValue = Math.max(...allValues)
    const minValue = Math.min(...allValues)
    
    // 범위 계산 (여백 추가)
    const range = maxValue - minValue
    const padding = range * 0.1 // 10% 여백
    
    // 0을 포함하지 않고 실제 데이터 범위에 맞게 설정
    const domainMin = Math.floor(minValue - padding)
    const domainMax = Math.ceil(maxValue + padding)
    
    return [domainMin, domainMax]
  }, [processedData])
  
  // 선택된 행정동 이름과 구 이름 가져오기
  const selectedDongName = useMemo(() => {
    if (isDongMode && dongData.length > 0) {
      const dong = dongData.find(d => d.dongCode === selectedDongCode)
      return dong ? dong.dongName : null
    }
    return null
  }, [isDongMode, dongData, selectedDongCode])
  
  // 행정동이 선택된 경우 해당 구 이름도 가져오기
  const dongGuName = useMemo(() => {
    if (isDongMode && dongData.length > 0) {
      const dong = dongData.find(d => d.dongCode === selectedDongCode)
      return dong ? dong.guName : null
    }
    return null
  }, [isDongMode, dongData, selectedDongCode])
  
  // 선택된 자치구 이름 가져오기
  const selectedGuName = useMemo(() => {
    if (isGuMode && dongData.length > 0) {
      const guDong = dongData.find(d => d.guCode === selectedGuCode)
      return guDong ? guDong.guName : null
    }
    return null
  }, [isGuMode, dongData, selectedGuCode])
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">데이터 로딩 중...</div>
      </div>
    )
  }
  
  if (!processedData.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">데이터가 없습니다</div>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative">
      {/* 선택된 업종 또는 행정동/자치구 표시 (레이어 컨트롤에서 선택) */}
      <div className="absolute -top-[55px] right-2 z-10 flex flex-col items-end gap-1">
        {isDongMode && selectedDongName && activeCategory !== '전체' ? (
          <div className="text-xs text-blue-400">
            {dongGuName} {selectedDongName} - {activeCategory}
          </div>
        ) : isDongMode && selectedDongName ? (
          <div className="text-xs text-blue-400">
            {dongGuName} {selectedDongName} (전체 업종)
          </div>
        ) : isGuMode && selectedGuName && activeCategory !== '전체' ? (
          <div className="text-xs text-blue-400">
            {selectedGuName} - {activeCategory}
          </div>
        ) : isGuMode && selectedGuName ? (
          <div className="text-xs text-blue-400">
            {selectedGuName} (전체 업종)
          </div>
        ) : activeCategory !== '전체' ? (
          <div className="text-xs text-blue-400">
            {activeCategory}
          </div>
        ) : null}
      </div>
      
      {/* 차트 - 전체 영역 사용 */}
      <ResponsiveContainer width="100%" height="100%">
          <ComposedChart 
            data={processedData}
            margin={{ top: 10, right: 20, bottom: 10, left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            
            <XAxis 
              dataKey="temperatureGroup" 
              tick={(props) => {
                const { x, y, payload } = props
                const color = payload.value === '한파' ? '#3B82F6' : 
                             payload.value === '온화' ? '#10B981' : 
                             payload.value === '폭염' ? '#EF4444' : '#9CA3AF'
                return (
                  <text x={x} y={y} dy={16} textAnchor="middle" fill={color} fontSize={14} fontWeight="bold">
                    {payload.value}
                  </text>
                )
              }}
              interval={0}
            />
            
            <YAxis 
              domain={yDomain}
              tickFormatter={(value) => `${value.toFixed(0)}%`}
              tick={{ fontSize: 11 }}
            />
            
            
            <Tooltip content={createBoxPlotTooltip(processedData)} />
            
            {/* 커스텀 박스플롯 렌더링 */}
            <Bar 
              dataKey="median"
              name="박스플롯"
              barSize={80}
              shape={(props: any) => <CustomBoxPlot {...props} yDomain={yDomain} />}
              onMouseEnter={(data: any) => {
                if (data && data.temperatureGroup) {
                  setHoveredGroup(data.temperatureGroup)
                }
              }}
              onMouseLeave={() => {
                setHoveredGroup(null)
              }}
            />
            
            {/* 중앙값 연결선 */}
            <Line 
              type="monotone" 
              dataKey="median" 
              stroke={
                hoveredGroup === '한파' ? '#3B82F6' :
                hoveredGroup === '온화' ? '#10B981' :
                hoveredGroup === '폭염' ? '#EF4444' :
                '#DBDEE3'
              }
              strokeWidth={hoveredGroup ? 2.5 : 2}
              strokeOpacity={0.9}
              strokeDasharray="5 5"
              dot={{ 
                fill: hoveredGroup === '한파' ? '#3B82F6' :
                      hoveredGroup === '온화' ? '#10B981' :
                      hoveredGroup === '폭염' ? '#EF4444' :
                      '#DBDEE3',
                r: hoveredGroup ? 5 : 4 
              }}
              connectNulls
              name="중앙값 연결선"
            />
          </ComposedChart>
        </ResponsiveContainer>
    </div>
  )
}