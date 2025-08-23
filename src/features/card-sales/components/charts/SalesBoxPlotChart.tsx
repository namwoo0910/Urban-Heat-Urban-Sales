"use client"

import { useState, useEffect, useMemo } from 'react'
import { 
  chartColors,
  ComposedChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ErrorBar,
  Scatter
} from '@/src/shared/components/ui/chart'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/shared/components/ui/select'
import { 
  loadMediumCategoryData, 
  loadSmallCategoryData, 
  type BoxPlotDataPoint,
  type BoxPlotStats 
} from '../../data/boxplotData'
import { 
  processForErrorBar,
  formatSalesAmount,
  filterTopCategories,
  sortBoxPlotData,
  truncateCategoryName,
  getStatsSummary,
  type SortOption,
  type FlatBoxPlotData
} from '../../utils/boxplotDataProcessor'

// 커스텀 툴팁 컴포넌트
const CustomBoxPlotTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload[0]) return null
  
  const data = payload[0].payload as FlatBoxPlotData
  
  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg">
      <p className="font-semibold mb-2">{label}</p>
      
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-blue-400">❄️ 한파</p>
          <div className="text-xs text-muted-foreground">
            <div>최소: {formatSalesAmount(data.coldMin)}</div>
            <div>Q1: {formatSalesAmount(data.coldQ1)}</div>
            <div>중앙값: {formatSalesAmount(data.coldMedian)}</div>
            <div>Q3: {formatSalesAmount(data.coldQ3)}</div>
            <div>최대: {formatSalesAmount(data.coldMax)}</div>
            <div>평균: {formatSalesAmount(data.coldMean)}</div>
          </div>
        </div>
        
        <div>
          <p className="text-sm font-medium text-green-400">🌤️ 온화</p>
          <div className="text-xs text-muted-foreground">
            <div>최소: {formatSalesAmount(data.mildMin)}</div>
            <div>Q1: {formatSalesAmount(data.mildQ1)}</div>
            <div>중앙값: {formatSalesAmount(data.mildMedian)}</div>
            <div>Q3: {formatSalesAmount(data.mildQ3)}</div>
            <div>최대: {formatSalesAmount(data.mildMax)}</div>
            <div>평균: {formatSalesAmount(data.mildMean)}</div>
          </div>
        </div>
        
        <div>
          <p className="text-sm font-medium text-red-400">🔥 폭염</p>
          <div className="text-xs text-muted-foreground">
            <div>최소: {formatSalesAmount(data.hotMin)}</div>
            <div>Q1: {formatSalesAmount(data.hotQ1)}</div>
            <div>중앙값: {formatSalesAmount(data.hotMedian)}</div>
            <div>Q3: {formatSalesAmount(data.hotQ3)}</div>
            <div>최대: {formatSalesAmount(data.hotMax)}</div>
            <div>평균: {formatSalesAmount(data.hotMean)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SalesBoxPlotChart() {
  const [data, setData] = useState<BoxPlotDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryType, setCategoryType] = useState<'medium' | 'small'>('medium')
  const [sortBy, setSortBy] = useState<SortOption>('mild')
  const [topN, setTopN] = useState<number>(15)
  
  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const loadedData = categoryType === 'medium' 
          ? await loadMediumCategoryData()
          : await loadSmallCategoryData()
        console.log('[BoxPlot] Data loaded:', loadedData.length, 'items')
        if (loadedData.length > 0) {
          console.log('[BoxPlot] Sample data:', loadedData[0])
        }
        setData(loadedData)
      } catch (error) {
        console.error('[BoxPlot] Failed to load data:', error)
        setData([]) // Set empty array on error
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [categoryType])
  
  // 데이터 처리 및 정렬
  const processedData = useMemo(() => {
    if (!data.length) {
      console.log('[BoxPlot] No data to process')
      return []
    }
    
    // 정렬 및 필터링
    const sorted = sortBoxPlotData(data, sortBy)
    const filtered = filterTopCategories(sorted, topN, 'median')
    
    // 플랫한 구조로 변환 (ErrorBar 사용)
    const flatData = processForErrorBar(filtered)
    
    // 카테고리명 축약
    const result = flatData.map(item => ({
      ...item,
      category: truncateCategoryName(item.category, 12)
    }))
    
    console.log('[BoxPlot] Processed data:', result.length, 'items')
    if (result.length > 0) {
      console.log('[BoxPlot] Sample processed:', result[0])
    }
    
    return result
  }, [data, sortBy, topN])
  
  // Y축 도메인 계산
  const yDomain = useMemo(() => {
    if (!processedData.length) return [0, 100000000]
    
    const allValues = processedData.flatMap(item => [
      item.coldUpperWhisker,
      item.mildUpperWhisker,
      item.hotUpperWhisker
    ])
    
    const maxValue = Math.max(...allValues)
    const minValue = 0
    
    return [minValue, maxValue * 1.1]
  }, [processedData])
  
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">데이터 로딩 중...</div>
      </div>
    )
  }
  
  return (
    <div className="w-full h-full flex flex-col">
      {/* 컨트롤 패널 */}
      <div className="flex items-center gap-4 mb-4">
        <Select value={categoryType} onValueChange={(v) => setCategoryType(v as 'medium' | 'small')}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="medium">중분류</SelectItem>
            <SelectItem value="small">소분류</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">이름순</SelectItem>
            <SelectItem value="cold">한파 매출순</SelectItem>
            <SelectItem value="mild">온화 매출순</SelectItem>
            <SelectItem value="hot">폭염 매출순</SelectItem>
            <SelectItem value="variance">변동성순</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={topN.toString()} onValueChange={(v) => setTopN(parseInt(v))}>
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">상위 10개</SelectItem>
            <SelectItem value="15">상위 15개</SelectItem>
            <SelectItem value="20">상위 20개</SelectItem>
            <SelectItem value="30">상위 30개</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* 차트 */}
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart 
            data={processedData}
            margin={{ top: 20, right: 20, bottom: 80, left: 100 }}
          >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              
              <XAxis 
                dataKey="category" 
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 11 }}
              />
              
              <YAxis 
                domain={yDomain}
                tickFormatter={formatSalesAmount}
                tick={{ fontSize: 11 }}
                label={{ 
                  value: '매출액 (원)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' }
                }}
              />
              
              <Tooltip content={<CustomBoxPlotTooltip />} />
              
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="rect"
              />
              
              {/* 한파 박스플롯 */}
              <Bar 
                dataKey="coldMedian" 
                fill={chartColors.info}
                name="한파"
                barSize={20}
              >
                <ErrorBar 
                  dataKey="coldError" 
                  width={4} 
                  stroke={chartColors.info}
                  strokeWidth={1.5}
                  direction="y"
                />
              </Bar>
              
              {/* 한파 평균값 */}
              <Scatter 
                dataKey="coldMean" 
                fill="white"
                stroke={chartColors.info}
                strokeWidth={2}
                shape="circle"
                name="한파 평균"
                legendType="none"
              />
              
              {/* 온화 박스플롯 */}
              <Bar 
                dataKey="mildMedian" 
                fill={chartColors.success}
                name="온화"
                barSize={20}
              >
                <ErrorBar 
                  dataKey="mildError" 
                  width={4} 
                  stroke={chartColors.success}
                  strokeWidth={1.5}
                  direction="y"
                />
              </Bar>
              
              {/* 온화 평균값 */}
              <Scatter 
                dataKey="mildMean" 
                fill="white"
                stroke={chartColors.success}
                strokeWidth={2}
                shape="circle"
                name="온화 평균"
                legendType="none"
              />
              
              {/* 폭염 박스플롯 */}
              <Bar 
                dataKey="hotMedian" 
                fill={chartColors.error}
                name="폭염"
                barSize={20}
              >
                <ErrorBar 
                  dataKey="hotError" 
                  width={4} 
                  stroke={chartColors.error}
                  strokeWidth={1.5}
                  direction="y"
                />
              </Bar>
              
              {/* 폭염 평균값 */}
              <Scatter 
                dataKey="hotMean" 
                fill="white"
                stroke={chartColors.error}
                strokeWidth={2}
                shape="circle"
                name="폭염 평균"
                legendType="none"
              />
            </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      {/* 범례 설명 */}
      <div className="mt-4 text-xs text-muted-foreground border-t pt-3">
        <div className="flex items-center gap-6">
          <span>📊 막대: 중앙값</span>
          <span>│ 오차막대: 최소-최대 범위</span>
          <span>● 흰점: 평균값</span>
        </div>
      </div>
    </div>
  )
}