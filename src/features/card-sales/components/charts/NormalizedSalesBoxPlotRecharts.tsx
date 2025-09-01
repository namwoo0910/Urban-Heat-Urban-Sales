"use client"

import { useState, useEffect, useMemo } from 'react'
import { 
  ComposedChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine,
  Line
} from '@/src/shared/components/ui/chart'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/shared/components/ui/select'
import { 
  loadNormalizedBusinessTypeData,
  getAllBusinessTypes,
  type NormalizedBoxPlotDataPoint
} from '../../data/normalizedBoxplotData'

// 날씨별 색상 정의 (기존과 동일)
const WEATHER_COLORS = {
  한파: '#3498db',  // Blue
  온화: '#2ecc71',  // Green  
  폭염: '#ef4444'   // Red
}

// 커스텀 박스플롯 Shape 컴포넌트 (정규화 버전)
const CustomNormalizedBoxPlot = (props: any) => {
  const { x, y, width, height, payload, background } = props
  
  if (!payload) return null
  
  const data = payload
  const weatherType = data.weatherType
  const color = WEATHER_COLORS[weatherType as keyof typeof WEATHER_COLORS]
  
  // Bar의 중심 x 좌표
  const centerX = x + width / 2
  const boxWidth = width * 0.7
  const boxLeft = centerX - boxWidth / 2
  const boxRight = centerX + boxWidth / 2
  const whiskerWidth = boxWidth * 0.4
  const whiskerLeft = centerX - whiskerWidth / 2
  const whiskerRight = centerX + whiskerWidth / 2
  
  // 차트 영역 정보
  const chartBottom = background?.y + background?.height || y + height
  const chartTop = background?.y || y
  const chartHeight = background?.height || height
  
  // Y축 스케일 함수 - 퍼센트 기반
  const yScale = (value: number) => {
    const yDomain = props.yDomain || [0, 200]
    const clampedValue = Math.max(yDomain[0], Math.min(yDomain[1], value))
    const ratio = (clampedValue - yDomain[0]) / (yDomain[1] - yDomain[0])
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
      
      {/* 이상치 - min이 lowerWhisker보다 작은 경우 */}
      {data.min < data.lowerWhisker && (
        <circle 
          cx={centerX} 
          cy={yMin} 
          r={3}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
        />
      )}
      
      {/* 이상치 - max가 upperWhisker보다 큰 경우 */}
      {data.max > data.upperWhisker && (
        <circle 
          cx={centerX} 
          cy={yMax} 
          r={3}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
        />
      )}
    </g>
  )
}

// 커스텀 툴팁 컴포넌트
const CustomNormalizedTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload[0]) return null
  
  const data = payload[0].payload
  
  // 온도 그룹별 아이콘
  const getIcon = (group: string) => {
    switch(group) {
      case '한파': return '❄️'
      case '온화': return '🌤️'
      case '폭염': return '🔥'
      default: return '🌡️'
    }
  }
  
  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg">
      <p className="font-semibold mb-2 flex items-center gap-2">
        <span>{getIcon(data.weatherType)}</span>
        <span>{data.weatherType}</span>
        {data.businessType && <span className="text-sm text-muted-foreground">({data.businessType})</span>}
      </p>
      
      <div className="text-xs text-muted-foreground space-y-1">
        <div>최소값: {data.min.toFixed(1)}%</div>
        <div>Q1: {data.Q1.toFixed(1)}%</div>
        <div className="font-semibold">중앙값: {data.median.toFixed(1)}%</div>
        <div>Q3: {data.Q3.toFixed(1)}%</div>
        <div>최대값: {data.max.toFixed(1)}%</div>
        <div className="border-t pt-1 mt-1">
          <div>평균: {data.mean.toFixed(1)}%</div>
          <div>하한: {data.lowerWhisker.toFixed(1)}%</div>
          <div>상한: {data.upperWhisker.toFixed(1)}%</div>
        </div>
      </div>
    </div>
  )
}

export function NormalizedSalesBoxPlotRecharts() {
  const [rawData, setRawData] = useState<NormalizedBoxPlotDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('전체')
  const [categoryList, setCategoryList] = useState<string[]>([])
  
  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const data = await loadNormalizedBusinessTypeData()
        console.log('[NormalizedBoxPlot-Recharts] Data loaded:', data.length, 'business types')
        setRawData(data)
        
        // 업종 리스트 생성
        const categories = getAllBusinessTypes(data)
        setCategoryList(['전체', ...categories])
      } catch (error) {
        console.error('[NormalizedBoxPlot-Recharts] Failed to load data:', error)
        setRawData([])
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])
  
  // Recharts 형식으로 데이터 변환
  const processedData = useMemo(() => {
    if (!rawData.length) return []
    
    if (selectedCategory === '전체') {
      // 모든 업종의 분포 통계를 집계 (Plotly와 동일한 방식)
      const aggregateStats = (weatherType: '한파' | '온화' | '폭염') => {
        const allQ1 = rawData.map(d => d[weatherType].Q1)
        const allMedian = rawData.map(d => d[weatherType].median)
        const allQ3 = rawData.map(d => d[weatherType].Q3)
        const allMin = rawData.map(d => d[weatherType].min)
        const allMax = rawData.map(d => d[weatherType].max)
        const allMean = rawData.map(d => d[weatherType].mean)
        const allLowerWhisker = rawData.map(d => d[weatherType].lowerWhisker)
        const allUpperWhisker = rawData.map(d => d[weatherType].upperWhisker)
        
        // 각 통계량의 중앙값 계산
        const getMedian = (values: number[]) => {
          const sorted = [...values].sort((a, b) => a - b)
          const mid = Math.floor(sorted.length / 2)
          return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
        }
        
        return {
          min: Math.min(...allMin),
          Q1: getMedian(allQ1),
          median: getMedian(allMedian),
          Q3: getMedian(allQ3),
          max: Math.max(...allMax),
          mean: getMedian(allMean),
          lowerWhisker: getMedian(allLowerWhisker),
          upperWhisker: getMedian(allUpperWhisker)
        }
      }
      
      const 한파Stats = aggregateStats('한파')
      const 온화Stats = aggregateStats('온화')
      const 폭염Stats = aggregateStats('폭염')
      
      // Log aggregated statistics for verification
      console.log('[NormalizedBoxPlot-Recharts] Aggregated stats for 전체:')
      console.log('한파:', 한파Stats)
      console.log('온화:', 온화Stats)
      console.log('폭염:', 폭염Stats)
      
      return [
        { weatherType: '한파', ...한파Stats, display: '한파' },
        { weatherType: '온화', ...온화Stats, display: '온화' },
        { weatherType: '폭염', ...폭염Stats, display: '폭염' }
      ]
    } else {
      // 특정 업종 데이터
      const businessData = rawData.find(d => d.업종 === selectedCategory)
      if (!businessData) return []
      
      return [
        { 
          weatherType: '한파',
          businessType: selectedCategory,
          ...businessData.한파,
          display: '한파'
        },
        { 
          weatherType: '온화',
          businessType: selectedCategory,
          ...businessData.온화,
          display: '온화'
        },
        { 
          weatherType: '폭염',
          businessType: selectedCategory,
          ...businessData.폭염,
          display: '폭염'
        }
      ]
    }
  }, [rawData, selectedCategory])
  
  // Y축 도메인 계산
  const yDomain = useMemo(() => {
    if (!processedData.length) return [0, 150]
    
    const allValues = processedData.flatMap(item => [
      item.min,
      item.max
    ])
    
    const maxValue = Math.max(...allValues)
    const minValue = Math.min(...allValues, 0)
    
    // 패딩 추가
    return [
      Math.floor(minValue * 0.9), 
      Math.ceil(maxValue * 1.1)
    ]
  }, [processedData])
  
  // 중앙값 연결선용 데이터
  const medianLineData = useMemo(() => {
    return processedData.map(item => ({
      weatherType: item.weatherType,
      median: item.median
    }))
  }, [processedData])
  
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
    <div className="w-full h-full flex flex-col">
      {/* 컨트롤 패널 */}
      <div className="flex items-center gap-4 mb-4">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[200px] bg-white/10 border-white/20 text-white">
            <SelectValue placeholder="업종 선택" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px] overflow-y-auto bg-black/90 border-white/20">
            {categoryList.map(category => (
              <SelectItem key={category} value={category} className="text-white hover:bg-white/10">
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="text-sm text-muted-foreground">
          {selectedCategory === '전체' 
            ? '모든 업종의 날씨별 매출 분포 (각 통계값의 중앙값으로 집계)' 
            : `${selectedCategory} 업종의 날씨별 매출 분포 (Recharts)`}
        </div>
      </div>
      
      {/* 차트 */}
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart 
            data={processedData}
            margin={{ top: 20, right: 30, bottom: 60, left: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            
            <XAxis 
              dataKey="display" 
              tick={{ fontSize: 14, fontWeight: 'bold' }}
              interval={0}
            />
            
            <YAxis 
              domain={yDomain}
              tickFormatter={(value) => `${value}%`}
              tick={{ fontSize: 11 }}
              label={{ 
                value: '매출 지수 (온화 = 100%)', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }}
            />
            
            <Tooltip content={<CustomNormalizedTooltip />} />
            
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="rect"
            />
            
            {/* 100% 기준선 */}
            <ReferenceLine 
              y={100} 
              stroke="rgba(255, 255, 255, 0.5)" 
              strokeDasharray="5 5" 
              label={{ value: "기준선 (100%)", position: "right" }}
            />
            
            {/* 박스플롯 렌더링 */}
            <Bar 
              dataKey="median"
              name="정규화 박스플롯"
              barSize={80}
              shape={(props: any) => <CustomNormalizedBoxPlot {...props} yDomain={yDomain} />}
            />
            
            {/* 중앙값 연결선 */}
            <Line 
              type="monotone" 
              dataKey="median" 
              stroke="#fff" 
              strokeWidth={2} 
              strokeOpacity={0.5}
              strokeDasharray="3 3"
              dot={{ fill: '#fff', r: 4 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      {/* 범례 설명 */}
      <div className="mt-4 text-xs text-muted-foreground border-t pt-3">
        <div className="flex items-center gap-6">
          <span>□ 박스: Q1-Q3 (IQR)</span>
          <span>─ 중앙선: 중앙값 (Q2)</span>
          <span>┬┴ 수염: 1.5*IQR 범위</span>
          <span>◆ 다이아몬드: 평균값</span>
          <span>○ 원: 이상치</span>
          <span>⋯ 점선: 중앙값 연결</span>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{backgroundColor: WEATHER_COLORS.한파}}></span>
            한파
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{backgroundColor: WEATHER_COLORS.온화}}></span>
            온화 (100% 기준)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{backgroundColor: WEATHER_COLORS.폭염}}></span>
            폭염
          </span>
        </div>
        {selectedCategory === '전체' && (
          <div className="mt-2 text-gray-500">
            ℹ️ 전체 업종에서 온화 박스가 작은 이유: 모든 업종이 온화=100%로 정규화되어 변동폭이 적음
          </div>
        )}
      </div>
    </div>
  )
}