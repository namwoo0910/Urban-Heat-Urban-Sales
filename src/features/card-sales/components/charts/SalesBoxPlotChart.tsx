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
  ErrorBar,
  Scatter,
  Cell
} from '@/src/shared/components/ui/chart'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/shared/components/ui/select'
import { 
  loadNormalizedBoxPlotData, 
  type BoxPlotDataPoint
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

// 커스텀 툴팁 컴포넌트
const CustomWeatherTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload[0]) return null
  
  const data = payload[0].payload as WeatherGroupBoxPlotData
  
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
        <span>{getIcon(label)}</span>
        <span>{label}</span>
      </p>
      
      <div className="text-xs text-muted-foreground space-y-1">
        <div>최소값: {data.min.toFixed(1)}%</div>
        <div>Q1: {data.Q1.toFixed(1)}%</div>
        <div className="font-semibold">중앙값: {data.median.toFixed(1)}%</div>
        <div>Q3: {data.Q3.toFixed(1)}%</div>
        <div>최대값: {data.max.toFixed(1)}%</div>
        <div className="border-t pt-1 mt-1">
          <div>평균: {data.mean.toFixed(1)}%</div>
          <div>하한 (1.5*IQR): {data.lowerWhisker.toFixed(1)}%</div>
          <div>상한 (1.5*IQR): {data.upperWhisker.toFixed(1)}%</div>
        </div>
      </div>
    </div>
  )
}

export function SalesBoxPlotChart() {
  const [rawData, setRawData] = useState<BoxPlotDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('전체')
  const [categoryList, setCategoryList] = useState<string[]>([])
  
  // 데이터 로드 (정규화된 데이터 사용)
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const loadedData = await loadNormalizedBoxPlotData()
        console.log('[BoxPlot] Normalized data loaded:', loadedData.length, 'categories')
        setRawData(loadedData)
        
        // 업종 리스트 생성
        const categories = getAllCategoryNames(loadedData)
        setCategoryList(['전체', ...categories])
      } catch (error) {
        console.error('[BoxPlot] Failed to load normalized data:', error)
        setRawData([])
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])
  
  // 선택된 업종에 따라 데이터 처리
  const processedData = useMemo(() => {
    if (!rawData.length) {
      console.log('[BoxPlot] No data to process')
      return []
    }
    
    if (selectedCategory === '전체') {
      // 모든 업종 데이터를 날씨 그룹별로 집계
      const aggregatedData = aggregateByWeatherGroup(rawData)
      console.log('[BoxPlot] Aggregated weather data:', aggregatedData)
      return aggregatedData
    } else {
      // 특정 업종의 박스플롯 데이터
      const categoryData = getBoxPlotByCategory(rawData, selectedCategory)
      console.log('[BoxPlot] Category data for', selectedCategory, ':', categoryData)
      return categoryData || []
    }
  }, [rawData, selectedCategory])
  
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
      {/* 업종 선택 - 우측 상단 */}
      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
        <SelectTrigger className="absolute -top-[55px] right-2 z-10 w-[120px] h-8 text-xs bg-white/10 border-white/20 text-white">
          <SelectValue placeholder="업종 선택" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px] overflow-y-auto bg-black/90 border-white/20">
          {categoryList.map(category => (
            <SelectItem key={category} value={category} className="text-xs text-white hover:bg-white/10">
              {category}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
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
            
            <Tooltip content={<CustomWeatherTooltip />} />
            
            {/* 커스텀 박스플롯 렌더링 */}
            <Bar 
              dataKey="median"
              name="박스플롯"
              barSize={80}
              shape={(props: any) => <CustomBoxPlot {...props} yDomain={yDomain} />}
            />
          </ComposedChart>
        </ResponsiveContainer>
    </div>
  )
}