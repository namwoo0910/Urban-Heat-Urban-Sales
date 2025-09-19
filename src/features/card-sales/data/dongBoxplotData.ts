// 행정동별 박스플롯 데이터 파싱 유틸리티

import { DongBoxPlotDataPoint, BoxPlotStats } from './boxplotData'

// 행정동별 CSV 파싱 함수
export function parseDongCsvToBoxPlotData(csvText: string): DongBoxPlotDataPoint[] {
  // BOM 제거
  const cleanText = csvText.replace(/^\uFEFF/, '')
  const lines = cleanText.trim().split('\n')

  if (lines.length < 2) {
    console.warn('Empty or invalid CSV data for dong boxplot')
    return []
  }

  const headers = lines[0].split(',')
  console.log('[DongBoxPlot] Headers:', headers)

  const results: DongBoxPlotDataPoint[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',')

    // 데이터 검증 - 최소 필요한 컬럼 수 확인 (자치구코드 ~ 폭염_upper_whisker = 30컬럼)
    if (values.length < 30 || !values[0] || !values[1]) {
      console.warn(`[DongBoxPlot] Invalid row ${i}:`, values.slice(0, 5))
      continue
    }

    try {
      const dataPoint: DongBoxPlotDataPoint = {
        guCode: parseInt(values[0]) || 0,
        dongCode: parseInt(values[1]) || 0,
        guName: values[2] || '',
        dongName: values[3] || '',
        businessType: values[4] || '',
        dongBusinessKey: values[5] || `${values[1]}_${values[4]}`, // 행정동_업종 컬럼 또는 생성
        cold: {
          min: parseFloat(values[6]) || 0,
          Q1: parseFloat(values[7]) || 0,
          median: parseFloat(values[8]) || 0,
          Q3: parseFloat(values[9]) || 0,
          max: parseFloat(values[10]) || 0,
          mean: parseFloat(values[11]) || 0,
          lowerWhisker: parseFloat(values[12]) || 0,
          upperWhisker: parseFloat(values[13]) || 0,
        },
        mild: {
          min: parseFloat(values[14]) || 0,
          Q1: parseFloat(values[15]) || 0,
          median: parseFloat(values[16]) || 0,
          Q3: parseFloat(values[17]) || 0,
          max: parseFloat(values[18]) || 0,
          mean: parseFloat(values[19]) || 0,
          lowerWhisker: parseFloat(values[20]) || 0,
          upperWhisker: parseFloat(values[21]) || 0,
        },
        hot: {
          min: parseFloat(values[22]) || 0,
          Q1: parseFloat(values[23]) || 0,
          median: parseFloat(values[24]) || 0,
          Q3: parseFloat(values[25]) || 0,
          max: parseFloat(values[26]) || 0,
          mean: parseFloat(values[27]) || 0,
          lowerWhisker: parseFloat(values[28]) || 0,
          upperWhisker: parseFloat(values[29]) || 0,
        },
      }

      results.push(dataPoint)
    } catch (error) {
      console.error(`[DongBoxPlot] Error parsing row ${i}:`, error, values.slice(0, 10))
    }
  }

  console.log(`[DongBoxPlot] Parsed ${results.length} dong-business combinations`)
  return results
}