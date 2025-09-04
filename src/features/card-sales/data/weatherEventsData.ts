export interface WeatherEvent {
  date: string
  type: '한파' | '온화' | '폭염'
  dayOfMonth: number
  month: number
}

export interface MonthlyWeatherEvents {
  month: number
  events: WeatherEvent[]
}

// Weather event dates extracted from local_economy JSON files
const weatherEventDates: { [key: string]: '한파' | '온화' | '폭염' } = {
  // 한파 (Cold Wave)
  '2024-01-07': '한파',
  '2024-01-08': '한파',
  '2024-01-09': '한파',
  '2024-01-10': '한파',
  '2024-01-14': '한파',
  '2024-01-15': '한파',
  '2024-01-16': '한파',
  '2024-01-17': '한파',
  '2024-01-22': '한파',
  '2024-01-23': '한파',
  '2024-01-24': '한파',
  '2024-01-25': '한파',
  '2024-01-26': '한파',
  '2024-01-28': '한파',
  '2024-02-06': '한파',
  '2024-02-07': '한파',
  '2024-02-21': '한파',
  '2024-02-22': '한파',
  '2024-03-01': '한파',
  '2024-11-27': '한파',
  '2024-12-08': '한파',
  '2024-12-14': '한파',
  '2024-12-17': '한파',
  '2024-12-18': '한파',
  '2024-12-19': '한파',
  '2024-12-21': '한파',
  '2024-12-22': '한파',
  '2024-12-26': '한파',
  '2024-12-27': '한파',
  '2024-12-28': '한파',
  
  // 온화 (Mild)
  '2024-04-04': '온화',
  '2024-04-08': '온화',
  '2024-04-09': '온화',
  '2024-04-11': '온화',
  '2024-04-17': '온화',
  '2024-04-21': '온화',
  '2024-04-25': '온화',
  '2024-04-30': '온화',
  '2024-05-08': '온화',
  '2024-05-09': '온화',
  '2024-05-11': '온화',
  '2024-05-12': '온화',
  '2024-05-27': '온화',
  '2024-09-21': '온화',
  '2024-10-01': '온화',
  '2024-10-03': '온화',
  '2024-10-07': '온화',
  '2024-10-13': '온화',
  '2024-10-14': '온화',
  '2024-10-15': '온화',
  '2024-10-19': '온화',
  '2024-10-25': '온화',
  '2024-10-28': '온화',
  '2024-10-30': '온화',
  '2024-10-31': '온화',
  '2024-11-10': '온화',
  '2024-11-11': '온화',
  '2024-11-13': '온화',
  '2024-11-15': '온화',
  '2024-11-16': '온화',
  
  // 폭염 (Heat Wave)
  '2024-06-19': '폭염',
  '2024-06-20': '폭염',
  '2024-06-21': '폭염',
  '2024-07-13': '폭염',
  '2024-07-25': '폭염',
  '2024-07-31': '폭염',
  '2024-08-01': '폭염',
  '2024-08-03': '폭염',
  '2024-08-04': '폭염',
  '2024-08-05': '폭염',
  '2024-08-06': '폭염',
  '2024-08-07': '폭염',
  '2024-08-09': '폭염',
  '2024-08-10': '폭염',
  '2024-08-11': '폭염',
  '2024-08-12': '폭염',
  '2024-08-13': '폭염',
  '2024-08-14': '폭염',
  '2024-08-15': '폭염',
  '2024-08-16': '폭염',
  '2024-08-17': '폭염',
  '2024-08-18': '폭염',
  '2024-08-19': '폭염',
  '2024-08-20': '폭염',
  '2024-08-28': '폭염',
  '2024-08-30': '폭염',
  '2024-09-10': '폭염',
  '2024-09-11': '폭염',
  '2024-09-17': '폭염',
  '2024-09-18': '폭염'
}

/**
 * Parse weather events and group by month
 */
export function getMonthlyWeatherEvents(): MonthlyWeatherEvents[] {
  const monthlyEvents: { [key: number]: WeatherEvent[] } = {}
  
  Object.entries(weatherEventDates).forEach(([date, type]) => {
    const dateParts = date.split('-')
    const month = parseInt(dateParts[1])
    const dayOfMonth = parseInt(dateParts[2])
    
    if (!monthlyEvents[month]) {
      monthlyEvents[month] = []
    }
    
    monthlyEvents[month].push({
      date,
      type,
      dayOfMonth,
      month
    })
  })
  
  // Convert to array and sort by month
  return Object.entries(monthlyEvents).map(([month, events]) => ({
    month: parseInt(month),
    events: events.sort((a, b) => a.dayOfMonth - b.dayOfMonth)
  })).sort((a, b) => a.month - b.month)
}

/**
 * Get color for weather event type
 */
export function getWeatherEventColor(type: '한파' | '온화' | '폭염'): string {
  switch (type) {
    case '한파':
      return '#3B82F6' // Blue
    case '온화':
      return '#10B981' // Green
    case '폭염':
      return '#EF4444' // Red
    default:
      return '#9CA3AF' // Gray fallback
  }
}

/**
 * Calculate x-axis position for a weather event within a month
 * Returns a value between 0 and 1 representing the position within the month
 */
export function calculateMonthPosition(dayOfMonth: number, totalDaysInMonth: number = 31): number {
  return (dayOfMonth - 1) / (totalDaysInMonth - 1)
}

/**
 * Get days in month (simplified, assumes 2024)
 */
export function getDaysInMonth(month: number): number {
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] // 2024 is a leap year
  return daysInMonth[month - 1]
}

/**
 * Calculate precise x-axis position for a weather event
 * Maps day of year to a position on 0-11 scale (12 months)
 */
export function calculatePrecisePosition(month: number, dayOfMonth: number): number {
  // Month index (0-11) plus fractional day position within month
  const monthIndex = month - 1
  const daysInMonth = getDaysInMonth(month)
  const dayFraction = (dayOfMonth - 1) / daysInMonth
  
  // Return position on 0-11 scale with decimal for exact day
  return monthIndex + dayFraction
}

/**
 * Get all weather events for the chart
 * Returns array of events with calculated positions
 */
export function getWeatherEventsForChart() {
  const monthlyEvents = getMonthlyWeatherEvents()
  const chartEvents: Array<{
    month: number
    monthName: string
    position: number
    precisePosition: number
    type: '한파' | '온화' | '폭염'
    color: string
    dayOfMonth: number
    date: string
  }> = []
  
  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
  
  monthlyEvents.forEach(({ month, events }) => {
    const daysInMonth = getDaysInMonth(month)
    events.forEach(event => {
      chartEvents.push({
        month,
        monthName: monthNames[month - 1],
        position: calculateMonthPosition(event.dayOfMonth, daysInMonth),
        precisePosition: calculatePrecisePosition(month, event.dayOfMonth),
        type: event.type,
        color: getWeatherEventColor(event.type),
        dayOfMonth: event.dayOfMonth,
        date: event.date
      })
    })
  })
  
  return chartEvents
}