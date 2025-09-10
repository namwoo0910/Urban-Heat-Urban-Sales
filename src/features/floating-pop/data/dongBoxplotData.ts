// 행정동별 생활인구 박스플롯 데이터
import type { BoxPlotStats, DongBoxPlotDataPoint } from './boxplotData'

// 행정동별 x 업종별 CSV 파싱 함수
export function parseDongCsvToBoxPlotData(csvText: string): DongBoxPlotDataPoint[] {
  // BOM 제거
  const cleanText = csvText.replace(/^\uFEFF/, '')
  const lines = cleanText.trim().split('\n')
  const headers = lines[0].split(',')
  
  return lines.slice(1).map(line => {
    const values = line.split(',')
    
    // 빈 줄 또는 불완전한 데이터 스킵
    if (values.length < 30 || !values[0]) {
      return null
    }
    
    return {
      guCode: parseInt(values[0]),
      dongCode: parseInt(values[1]),
      guName: values[2],
      dongName: values[3],
      businessType: values[4],
      dongBusinessKey: values[5],
      cold: {
        min: parseFloat(values[6]),
        Q1: parseFloat(values[7]),
        median: parseFloat(values[8]),
        Q3: parseFloat(values[9]),
        max: parseFloat(values[10]),
        mean: parseFloat(values[11]),
        lowerWhisker: parseFloat(values[12]),
        upperWhisker: parseFloat(values[13]),
      },
      mild: {
        min: parseFloat(values[14]),
        Q1: parseFloat(values[15]),
        median: parseFloat(values[16]),
        Q3: parseFloat(values[17]),
        max: parseFloat(values[18]),
        mean: parseFloat(values[19]),
        lowerWhisker: parseFloat(values[20]),
        upperWhisker: parseFloat(values[21]),
      },
      hot: {
        min: parseFloat(values[22]),
        Q1: parseFloat(values[23]),
        median: parseFloat(values[24]),
        Q3: parseFloat(values[25]),
        max: parseFloat(values[26]),
        mean: parseFloat(values[27]),
        lowerWhisker: parseFloat(values[28]),
        upperWhisker: parseFloat(values[29]),
      },
    }
  }).filter(item => item !== null) as DongBoxPlotDataPoint[]
}

// 구별로 그룹화
export function groupDongDataByGu(data: DongBoxPlotDataPoint[]): Map<number, DongBoxPlotDataPoint[]> {
  const grouped = new Map<number, DongBoxPlotDataPoint[]>()
  
  data.forEach(item => {
    if (!grouped.has(item.guCode)) {
      grouped.set(item.guCode, [])
    }
    grouped.get(item.guCode)!.push(item)
  })
  
  return grouped
}

// 특정 동과 업종 조합 찾기
export function findDongBusinessData(
  data: DongBoxPlotDataPoint[], 
  dongCode: number,
  businessType: string
): DongBoxPlotDataPoint | undefined {
  return data.find(d => d.dongCode === dongCode && d.businessType === businessType)
}

// 특정 동의 모든 업종 데이터 찾기
export function filterByDong(
  data: DongBoxPlotDataPoint[], 
  dongCode: number
): DongBoxPlotDataPoint[] {
  return data.filter(d => d.dongCode === dongCode)
}

// 특정 업종의 모든 동 데이터 찾기
export function filterByBusinessType(
  data: DongBoxPlotDataPoint[], 
  businessType: string
): DongBoxPlotDataPoint[] {
  return data.filter(d => d.businessType === businessType)
}

// 특정 구의 모든 동 데이터 찾기
export function filterByGu(
  data: DongBoxPlotDataPoint[], 
  guCode: number
): DongBoxPlotDataPoint[] {
  return data.filter(d => d.guCode === guCode)
}