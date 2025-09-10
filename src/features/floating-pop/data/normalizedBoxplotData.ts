// Normalized boxplot data loader for business type sales by weather conditions
// CSV data is normalized with 온화 (normal weather) median = 100

export interface NormalizedBoxPlotStats {
  min: number
  Q1: number
  median: number
  Q3: number
  max: number
  mean: number
  lowerWhisker: number
  upperWhisker: number
}

export interface NormalizedBoxPlotDataPoint {
  업종: string  // Business type
  한파: NormalizedBoxPlotStats  // Cold weather
  온화: NormalizedBoxPlotStats  // Normal weather (median = 100)
  폭염: NormalizedBoxPlotStats  // Hot weather
}

// Parse CSV data to structured format
function parseNormalizedCsv(csvText: string): NormalizedBoxPlotDataPoint[] {
  // Remove BOM if present
  const cleanText = csvText.replace(/^\uFEFF/, '')
  const lines = cleanText.trim().split('\n')
  const headers = lines[0].split(',')
  
  return lines.slice(1).map(line => {
    const values = line.split(',')
    
    // Skip invalid rows
    if (values.length < 25 || !values[0]) {
      return null
    }
    
    return {
      업종: values[0],
      한파: {
        min: parseFloat(values[1]),
        Q1: parseFloat(values[2]),
        median: parseFloat(values[3]),
        Q3: parseFloat(values[4]),
        max: parseFloat(values[5]),
        mean: parseFloat(values[6]),
        lowerWhisker: parseFloat(values[7]),
        upperWhisker: parseFloat(values[8])
      },
      온화: {
        min: parseFloat(values[9]),
        Q1: parseFloat(values[10]),
        median: parseFloat(values[11]),  // This should be 100
        Q3: parseFloat(values[12]),
        max: parseFloat(values[13]),
        mean: parseFloat(values[14]),
        lowerWhisker: parseFloat(values[15]),
        upperWhisker: parseFloat(values[16])
      },
      폭염: {
        min: parseFloat(values[17]),
        Q1: parseFloat(values[18]),
        median: parseFloat(values[19]),
        Q3: parseFloat(values[20]),
        max: parseFloat(values[21]),
        mean: parseFloat(values[22]),
        lowerWhisker: parseFloat(values[23]),
        upperWhisker: parseFloat(values[24])
      }
    }
  }).filter(item => item !== null) as NormalizedBoxPlotDataPoint[]
}

// Load normalized business type sales data
export async function loadNormalizedBusinessTypeData(): Promise<NormalizedBoxPlotDataPoint[]> {
  try {
    const response = await fetch('/data/charts/norm_업종x매출_bxplt.csv')
    const text = await response.text()
    return parseNormalizedCsv(text)
  } catch (error) {
    console.error('[NormalizedBoxPlot] Failed to load data:', error)
    return []
  }
}

// Transform data for Plotly boxplot format
export interface PlotlyBoxData {
  y: number[]  // All the quartile values
  type: 'box'
  name: string
  marker: {
    color: string
  }
  boxpoints: false | 'all' | 'outliers' | 'suspectedoutliers'
  q1: number[]
  median: number[]
  q3: number[]
  lowerfence: number[]
  upperfence: number[]
  mean: number[]
  sd?: number[]
}

// Convert normalized data to Plotly format for a specific business type
export function convertToPlotlyFormat(data: NormalizedBoxPlotDataPoint[], businessType?: string): PlotlyBoxData[] {
  // Filter for specific business type if provided
  const filteredData = businessType 
    ? data.filter(d => d.업종 === businessType)
    : data
  
  if (filteredData.length === 0) return []
  
  // If single business type, create three box plots (한파, 온화, 폭염)
  if (businessType && filteredData.length === 1) {
    const item = filteredData[0]
    return [
      {
        y: [], // Empty y for custom box values
        type: 'box',
        name: '한파',
        marker: { color: '#3498db' },
        boxpoints: false,
        q1: [item.한파.Q1],
        median: [item.한파.median],
        q3: [item.한파.Q3],
        lowerfence: [item.한파.lowerWhisker],
        upperfence: [item.한파.upperWhisker],
        mean: [item.한파.mean],
      },
      {
        y: [],
        type: 'box',
        name: '온화',
        marker: { color: '#2ecc71' },
        boxpoints: false,
        q1: [item.온화.Q1],
        median: [item.온화.median],
        q3: [item.온화.Q3],
        lowerfence: [item.온화.lowerWhisker],
        upperfence: [item.온화.upperWhisker],
        mean: [item.온화.mean],
      },
      {
        y: [],
        type: 'box',
        name: '폭염',
        marker: { color: '#e74c3c' },
        boxpoints: false,
        q1: [item.폭염.Q1],
        median: [item.폭염.median],
        q3: [item.폭염.Q3],
        lowerfence: [item.폭염.lowerWhisker],
        upperfence: [item.폭염.upperWhisker],
        mean: [item.폭염.mean],
      }
    ]
  }
  
  // For multiple business types, create grouped data
  // This would need more complex handling - simplified for now
  return []
}

// Get all unique business type names
export function getAllBusinessTypes(data: NormalizedBoxPlotDataPoint[]): string[] {
  return data.map(item => item.업종).sort()
}

// Format value for display (with percentage)
export function formatNormalizedValue(value: number): string {
  return `${value.toFixed(1)}%`
}

// Calculate weather impact (difference from normal weather baseline of 100)
export function calculateWeatherImpact(data: NormalizedBoxPlotDataPoint) {
  return {
    업종: data.업종,
    한파영향: data.한파.median - 100,  // Negative means sales decrease
    폭염영향: data.폭염.median - 100   // Positive means sales increase
  }
}