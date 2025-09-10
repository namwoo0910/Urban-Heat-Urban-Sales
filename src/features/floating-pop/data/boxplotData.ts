// 박스플롯 데이터 - 업종별 날씨 조건에 따른 매출 통계
// CSV 파일을 TypeScript 객체로 변환

export interface BoxPlotDataPoint {
  category: string
  cold: BoxPlotStats
  mild: BoxPlotStats
  hot: BoxPlotStats
}

export interface DongBoxPlotDataPoint {
  guCode: number
  dongCode: number
  guName: string
  dongName: string
  businessType: string
  dongBusinessKey: string
  cold: BoxPlotStats
  mild: BoxPlotStats
  hot: BoxPlotStats
}

export interface BoxPlotStats {
  min: number
  Q1: number
  median: number
  Q3: number
  max: number
  mean: number
  lowerWhisker: number
  upperWhisker: number
}

// 업종 데이터 (15개 카테고리)
export async function loadMediumCategoryData(): Promise<BoxPlotDataPoint[]> {
  const response = await fetch('/data/charts/업종x매출_박스플롯_업종중분류.csv')
  const text = await response.text()
  return parseCsvToBoxPlotData(text)
}

// 업종 소분류 데이터 (81개 카테고리)
export async function loadSmallCategoryData(): Promise<BoxPlotDataPoint[]> {
  const response = await fetch('/data/charts/업종x매출_박스플롯_업종소분류.csv')
  const text = await response.text()
  return parseCsvToBoxPlotData(text)
}

// 정규화된 박스플롯 데이터 로드
export async function loadNormalizedBoxPlotData(): Promise<BoxPlotDataPoint[]> {
  const response = await fetch('/data/charts/norm_업종x매출_bxplt.csv')
  const text = await response.text()
  return parseNormalizedCsvToBoxPlotData(text)
}

// 행정동별 x 업종별 박스플롯 데이터 로드
export async function loadDongBoxPlotData(): Promise<DongBoxPlotDataPoint[]> {
  const { parseDongCsvToBoxPlotData } = await import('./dongBoxplotData')
  const response = await fetch('/data/charts/norm_행정동x업종_bxplt.csv')
  const text = await response.text()
  return parseDongCsvToBoxPlotData(text)
}

// CSV 파싱 함수
function parseCsvToBoxPlotData(csvText: string): BoxPlotDataPoint[] {
  const lines = csvText.trim().split('\n')
  const headers = lines[0].split(',')
  
  return lines.slice(1).map(line => {
    const values = line.split(',')
    
    // 빈 줄 또는 불완전한 데이터 스킵
    if (values.length < 25 || !values[0]) {
      return null
    }
    
    return {
      category: values[0],
      cold: {
        min: parseFloat(values[1]),
        Q1: parseFloat(values[2]),
        median: parseFloat(values[3]),
        Q3: parseFloat(values[4]),
        max: parseFloat(values[5]),
        mean: parseFloat(values[6]),
        lowerWhisker: parseFloat(values[7]),
        upperWhisker: parseFloat(values[8]),
      },
      mild: {
        min: parseFloat(values[9]),
        Q1: parseFloat(values[10]),
        median: parseFloat(values[11]),
        Q3: parseFloat(values[12]),
        max: parseFloat(values[13]),
        mean: parseFloat(values[14]),
        lowerWhisker: parseFloat(values[15]),
        upperWhisker: parseFloat(values[16]),
      },
      hot: {
        min: parseFloat(values[17]),
        Q1: parseFloat(values[18]),
        median: parseFloat(values[19]),
        Q3: parseFloat(values[20]),
        max: parseFloat(values[21]),
        mean: parseFloat(values[22]),
        lowerWhisker: parseFloat(values[23]),
        upperWhisker: parseFloat(values[24]),
      },
    }
  }).filter(item => item !== null) as BoxPlotDataPoint[]
}

// 정규화된 CSV 파싱 함수 (BOM 처리 포함)
function parseNormalizedCsvToBoxPlotData(csvText: string): BoxPlotDataPoint[] {
  // BOM 제거
  const cleanText = csvText.replace(/^\uFEFF/, '')
  const lines = cleanText.trim().split('\n')
  const headers = lines[0].split(',')
  
  return lines.slice(1).map(line => {
    const values = line.split(',')
    
    // 빈 줄 또는 불완전한 데이터 스킵
    if (values.length < 25 || !values[0]) {
      return null
    }
    
    return {
      category: values[0],
      cold: {
        min: parseFloat(values[1]),
        Q1: parseFloat(values[2]),
        median: parseFloat(values[3]),
        Q3: parseFloat(values[4]),
        max: parseFloat(values[5]),
        mean: parseFloat(values[6]),
        lowerWhisker: parseFloat(values[7]),
        upperWhisker: parseFloat(values[8]),
      },
      mild: {
        min: parseFloat(values[9]),
        Q1: parseFloat(values[10]),
        median: parseFloat(values[11]),
        Q3: parseFloat(values[12]),
        max: parseFloat(values[13]),
        mean: parseFloat(values[14]),
        lowerWhisker: parseFloat(values[15]),
        upperWhisker: parseFloat(values[16]),
      },
      hot: {
        min: parseFloat(values[17]),
        Q1: parseFloat(values[18]),
        median: parseFloat(values[19]),
        Q3: parseFloat(values[20]),
        max: parseFloat(values[21]),
        mean: parseFloat(values[22]),
        lowerWhisker: parseFloat(values[23]),
        upperWhisker: parseFloat(values[24]),
      },
    }
  }).filter(item => item !== null) as BoxPlotDataPoint[]
}

// 샘플 데이터 (개발 중 테스트용)
export const sampleBoxPlotData: BoxPlotDataPoint[] = [
  {
    category: "가전/가구",
    cold: {
      min: 7514,
      Q1: 453421.5,
      median: 1258632.0,
      Q3: 4024089.0,
      max: 6558086257,
      mean: 33129768.088984624,
      lowerWhisker: 7514,
      upperWhisker: 9372884
    },
    mild: {
      min: 13136,
      Q1: 486087.0,
      median: 1273589.0,
      Q3: 3842988.75,
      max: 8495356400,
      mean: 36665979.663479246,
      lowerWhisker: 13136,
      upperWhisker: 8876201
    },
    hot: {
      min: 14067,
      Q1: 526244.0,
      median: 1433713.0,
      Q3: 4011596.25,
      max: 7946504582,
      mean: 35226377.27124682,
      lowerWhisker: 14067,
      upperWhisker: 9235275
    }
  },
  // 더 많은 데이터는 CSV에서 로드
]