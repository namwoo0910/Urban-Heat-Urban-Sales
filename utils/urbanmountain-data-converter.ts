// Convert urban mountain data from processed_data format to GeoJSON
export function convertUrbanMountainData(
  coordinates: any[],
  populationData: any,
  hour: number
): any {
  // Get the time key for the hour (e.g., "00:00", "01:00", etc.)
  const timeKey = `${String(hour).padStart(2, '0')}:00`
  const hourPopulation = populationData[timeKey] || {}

  const features = coordinates.map((coord, index) => {
    // Get population for this grid at the current hour
    const population = hourPopulation[index] || 0
    
    // Create polygon from bounds
    const bounds = coord.bounds
    const polygon = [
      [bounds.minLng, bounds.minLat],
      [bounds.maxLng, bounds.minLat],
      [bounds.maxLng, bounds.maxLat],
      [bounds.minLng, bounds.maxLat],
      [bounds.minLng, bounds.minLat] // Close the polygon
    ]

    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [polygon]
      },
      properties: {
        grid_id: coord.grid_id,
        row: coord.row,
        col: coord.col,
        population: population,
        height: Math.min(population * 0.5, 5000), // Scale height
        center: [coord.lng, coord.lat]
      }
    }
  })

  return {
    type: 'FeatureCollection',
    features: features
  }
}

// Get color based on population density
export function getPopulationColor(population: number): string {
  const colors = [
    { threshold: 0, color: '#440154' },
    { threshold: 10000, color: '#482878' },
    { threshold: 15000, color: '#3e4989' },
    { threshold: 20000, color: '#31688e' },
    { threshold: 25000, color: '#26828e' },
    { threshold: 30000, color: '#1f9e89' },
    { threshold: 35000, color: '#35b779' },
    { threshold: 40000, color: '#6ece58' },
    { threshold: 45000, color: '#b5de2b' },
    { threshold: 50000, color: '#fde725' }
  ]

  for (let i = colors.length - 1; i >= 0; i--) {
    if (population >= colors[i].threshold) {
      return colors[i].color
    }
  }
  return colors[0].color
}