"use client"

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/shared/components/ui/select'
import { 
  loadNormalizedBusinessTypeData,
  getAllBusinessTypes,
  formatNormalizedValue,
  type NormalizedBoxPlotDataPoint
} from '../../data/normalizedBoxplotData'

// Dynamic import for Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

// Weather colors matching the existing theme
const WEATHER_COLORS = {
  한파: '#3498db',  // Blue
  온화: '#2ecc71',  // Green  
  폭염: '#ef4444'   // Red
}

export function NormalizedSalesBoxPlot() {
  const [rawData, setRawData] = useState<NormalizedBoxPlotDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('전체')
  const [categoryList, setCategoryList] = useState<string[]>([])
  
  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const data = await loadNormalizedBusinessTypeData()
        console.log('[NormalizedBoxPlot] Data loaded:', data.length, 'business types')
        setRawData(data)
        
        // Create category list
        const categories = getAllBusinessTypes(data)
        setCategoryList(['전체', ...categories])
      } catch (error) {
        console.error('[NormalizedBoxPlot] Failed to load data:', error)
        setRawData([])
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])
  
  // Prepare Plotly data based on selection
  const plotlyData = useMemo(() => {
    if (!rawData || !rawData.length) return []
    
    if (selectedCategory === '전체') {
      // Aggregate all business types data for each weather condition
      const traces: any[] = []
      
      // Aggregate the actual distribution statistics from all business types
      const aggregateStats = (weatherType: '한파' | '온화' | '폭염') => {
        const allQ1 = rawData.map(d => d[weatherType].Q1)
        const allMedian = rawData.map(d => d[weatherType].median)
        const allQ3 = rawData.map(d => d[weatherType].Q3)
        const allMin = rawData.map(d => d[weatherType].min)
        const allMax = rawData.map(d => d[weatherType].max)
        const allMean = rawData.map(d => d[weatherType].mean)
        const allLowerWhisker = rawData.map(d => d[weatherType].lowerWhisker)
        const allUpperWhisker = rawData.map(d => d[weatherType].upperWhisker)
        
        // Calculate the median of each statistic across all business types
        const getMedian = (values: number[]) => {
          const sorted = [...values].sort((a, b) => a - b)
          const mid = Math.floor(sorted.length / 2)
          return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
        }
        
        return {
          q1: getMedian(allQ1),
          median: getMedian(allMedian),
          q3: getMedian(allQ3),
          lowerWhisker: getMedian(allLowerWhisker),
          upperWhisker: getMedian(allUpperWhisker),
          mean: getMedian(allMean),
          min: Math.min(...allMin),
          max: Math.max(...allMax)
        }
      }
      
      const 한파Stats = aggregateStats('한파')
      const 온화Stats = aggregateStats('온화')
      const 폭염Stats = aggregateStats('폭염')
      
      // Log aggregated statistics for verification
      console.log('[NormalizedBoxPlot-Plotly] Aggregated stats for 전체:')
      console.log('한파:', 한파Stats)
      console.log('온화:', 온화Stats)
      console.log('폭염:', 폭염Stats)
      
      // Create boxplot traces with calculated statistics
      traces.push(
        {
          type: 'box',
          name: '한파',
          x: ['한파'],
          q1: [한파Stats.q1],
          median: [한파Stats.median],
          q3: [한파Stats.q3],
          lowerfence: [한파Stats.lowerWhisker],
          upperfence: [한파Stats.upperWhisker],
          mean: [한파Stats.mean],
          marker: { color: WEATHER_COLORS.한파, size: 8 },
          boxpoints: false,
          fillcolor: WEATHER_COLORS.한파,
          line: { color: WEATHER_COLORS.한파, width: 2 }
        },
        {
          type: 'box',
          name: '온화',
          x: ['온화'],
          q1: [온화Stats.q1],
          median: [온화Stats.median],
          q3: [온화Stats.q3],
          lowerfence: [온화Stats.lowerWhisker],
          upperfence: [온화Stats.upperWhisker],
          mean: [온화Stats.mean],
          marker: { color: WEATHER_COLORS.온화, size: 8 },
          boxpoints: false,
          fillcolor: WEATHER_COLORS.온화,
          line: { color: WEATHER_COLORS.온화, width: 2 }
        },
        {
          type: 'box',
          name: '폭염',
          x: ['폭염'],
          q1: [폭염Stats.q1],
          median: [폭염Stats.median],
          q3: [폭염Stats.q3],
          lowerfence: [폭염Stats.lowerWhisker],
          upperfence: [폭염Stats.upperWhisker],
          mean: [폭염Stats.mean],
          marker: { color: WEATHER_COLORS.폭염, size: 8 },
          boxpoints: false,
          fillcolor: WEATHER_COLORS.폭염,
          line: { color: WEATHER_COLORS.폭염, width: 2 }
        }
      )
      
      return traces
    } else {
      // Show data for specific business type
      const businessData = rawData.find(d => d.업종 === selectedCategory)
      if (!businessData) return []
      
      return [
        {
          type: 'box',
          name: '한파',
          x: ['한파'],  // x축 위치 지정
          q1: [businessData.한파.Q1],
          median: [businessData.한파.median],
          q3: [businessData.한파.Q3],
          lowerfence: [businessData.한파.lowerWhisker],
          upperfence: [businessData.한파.upperWhisker],
          mean: [businessData.한파.mean],
          marker: { 
            color: WEATHER_COLORS.한파,
            size: 8
          },
          boxpoints: false,
          fillcolor: WEATHER_COLORS.한파,
          line: { color: WEATHER_COLORS.한파, width: 2 },
          hovertemplate: 
            '<b>한파</b><br>' +
            'Min: ' + businessData.한파.min.toFixed(1) + '%<br>' +
            'Q1: ' + businessData.한파.Q1.toFixed(1) + '%<br>' +
            'Median: ' + businessData.한파.median.toFixed(1) + '%<br>' +
            'Q3: ' + businessData.한파.Q3.toFixed(1) + '%<br>' +
            'Max: ' + businessData.한파.max.toFixed(1) + '%<br>' +
            'Mean: ' + businessData.한파.mean.toFixed(1) + '%<br>' +
            '<extra></extra>'
        },
        {
          type: 'box',
          name: '온화',
          x: ['온화'],  // x축 위치 지정
          q1: [businessData.온화.Q1],
          median: [businessData.온화.median],
          q3: [businessData.온화.Q3],
          lowerfence: [businessData.온화.lowerWhisker],
          upperfence: [businessData.온화.upperWhisker],
          mean: [businessData.온화.mean],
          marker: { 
            color: WEATHER_COLORS.온화,
            size: 8
          },
          boxpoints: false,
          fillcolor: WEATHER_COLORS.온화,
          line: { color: WEATHER_COLORS.온화, width: 2 },
          hovertemplate: 
            '<b>온화</b><br>' +
            'Min: ' + businessData.온화.min.toFixed(1) + '%<br>' +
            'Q1: ' + businessData.온화.Q1.toFixed(1) + '%<br>' +
            'Median: ' + businessData.온화.median.toFixed(1) + '%<br>' +
            'Q3: ' + businessData.온화.Q3.toFixed(1) + '%<br>' +
            'Max: ' + businessData.온화.max.toFixed(1) + '%<br>' +
            'Mean: ' + businessData.온화.mean.toFixed(1) + '%<br>' +
            '<extra></extra>'
        },
        {
          type: 'box',
          name: '폭염',
          x: ['폭염'],  // x축 위치 지정
          q1: [businessData.폭염.Q1],
          median: [businessData.폭염.median],
          q3: [businessData.폭염.Q3],
          lowerfence: [businessData.폭염.lowerWhisker],
          upperfence: [businessData.폭염.upperWhisker],
          mean: [businessData.폭염.mean],
          marker: { 
            color: WEATHER_COLORS.폭염,
            size: 8
          },
          boxpoints: false,
          fillcolor: WEATHER_COLORS.폭염,
          line: { color: WEATHER_COLORS.폭염, width: 2 },
          hovertemplate: 
            '<b>폭염</b><br>' +
            'Min: ' + businessData.폭염.min.toFixed(1) + '%<br>' +
            'Q1: ' + businessData.폭염.Q1.toFixed(1) + '%<br>' +
            'Median: ' + businessData.폭염.median.toFixed(1) + '%<br>' +
            'Q3: ' + businessData.폭염.Q3.toFixed(1) + '%<br>' +
            'Max: ' + businessData.폭염.max.toFixed(1) + '%<br>' +
            'Mean: ' + businessData.폭염.mean.toFixed(1) + '%<br>' +
            '<extra></extra>'
        }
      ]
    }
  }, [rawData, selectedCategory])
  
  // Plotly layout configuration
  const layout = useMemo(() => ({
    title: {
      text: selectedCategory === '전체' 
        ? '업종별 날씨 영향도 (정규화)' 
        : `${selectedCategory} - 날씨별 매출 분포 (정규화)`,
      font: { size: 18, color: '#fff' },
      y: 0.95
    },
    xaxis: {
      title: {
        text: '날씨 조건',
        font: { size: 14, color: '#fff' }
      },
      type: 'category',
      categoryorder: 'array',
      categoryarray: ['한파', '온화', '폭염'],
      tickfont: { size: 13, color: '#fff' },
      gridcolor: 'rgba(255, 255, 255, 0.1)',
      zerolinecolor: 'rgba(255, 255, 255, 0.2)'
    },
    yaxis: {
      title: {
        text: '매출 지수 (온화 = 100%)',
        font: { size: 14, color: '#fff' }
      },
      tickfont: { size: 12, color: '#fff' },
      gridcolor: 'rgba(255, 255, 255, 0.1)',
      zerolinecolor: 'rgba(255, 255, 255, 0.2)',
      ticksuffix: '%',
      range: selectedCategory === '전체' ? [70, 130] : undefined
    },
    paper_bgcolor: 'rgba(0, 0, 0, 0)',
    plot_bgcolor: 'rgba(0, 0, 0, 0.3)',
    margin: { t: 60, r: 30, b: 60, l: 80 },
    boxmode: 'group',
    showlegend: true,
    legend: {
      x: 0.02,
      y: 0.98,
      bgcolor: 'rgba(0, 0, 0, 0.5)',
      bordercolor: 'rgba(255, 255, 255, 0.2)',
      borderwidth: 1,
      font: { color: '#fff', size: 12 }
    },
    shapes: [
      {
        type: 'line',
        x0: -0.5,
        x1: selectedCategory === '전체' ? 3.5 : 2.5,
        y0: 100,
        y1: 100,
        line: {
          color: 'rgba(255, 255, 255, 0.5)',
          width: 2,
          dash: 'dash'
        }
      }
    ],
    annotations: [
      {
        x: selectedCategory === '전체' ? 3 : 2.2,
        y: 100,
        text: '기준선 (100%)',
        showarrow: false,
        font: { size: 11, color: 'rgba(255, 255, 255, 0.7)' },
        xanchor: 'left'
      }
    ],
    hoverlabel: {
      bgcolor: 'rgba(0, 0, 0, 0.8)',
      bordercolor: 'white',
      font: { size: 13, color: 'white' }
    }
  }), [selectedCategory])
  
  // Plotly config
  const config = {
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['pan2d', 'select2d', 'lasso2d', 'resetScale2d', 'toggleSpikelines'],
    toImageButtonOptions: {
      format: 'png',
      filename: `normalized_boxplot_${selectedCategory}_${new Date().toISOString().split('T')[0]}`,
      height: 600,
      width: 900,
      scale: 2
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">데이터 로딩 중...</div>
      </div>
    )
  }
  
  if (!rawData.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">데이터가 없습니다</div>
      </div>
    )
  }
  
  return (
    <div className="w-full h-full flex flex-col">
      {/* Control Panel */}
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
        
        <div className="text-sm text-gray-400">
          {selectedCategory === '전체' 
            ? '모든 업종의 날씨별 매출 분포 (각 통계값의 중앙값으로 집계)' 
            : `${selectedCategory} 업종의 날씨별 매출 분포 (온화 = 100% 기준)`}
        </div>
      </div>
      
      {/* Plotly Chart */}
      <div className="flex-1 min-h-0">
        <Plot
          data={plotlyData}
          layout={layout}
          config={config}
          style={{ width: '100%', height: '100%' }}
          useResizeHandler={true}
        />
      </div>
      
      {/* Legend Explanation */}
      <div className="mt-4 text-xs text-gray-400 border-t border-white/10 pt-3">
        <div className="flex items-center gap-6">
          <span>📊 정규화 분석: 온화한 날씨의 중앙값을 100%로 설정한 상대 비교</span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{backgroundColor: WEATHER_COLORS.한파}}></span>
            한파 (추운 날)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{backgroundColor: WEATHER_COLORS.온화}}></span>
            온화 (평상시)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{backgroundColor: WEATHER_COLORS.폭염}}></span>
            폭염 (더운 날)
          </span>
        </div>
        <div className="mt-2">
          <span className="text-gray-500">💡 100% 이상: 온화한 날씨보다 매출 증가 | 100% 미만: 온화한 날씨보다 매출 감소</span>
        </div>
        {selectedCategory === '전체' && (
          <div className="mt-1 text-gray-500">
            ℹ️ 전체 업종에서 온화 박스가 작은 이유: 모든 업종이 온화=100%로 정규화되어 변동폭이 적음
          </div>
        )}
      </div>
    </div>
  )
}