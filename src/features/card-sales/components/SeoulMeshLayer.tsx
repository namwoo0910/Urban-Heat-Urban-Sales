/**
 * Seoul Mesh Layer Component
 * Creates a triangulated mesh visualization of Seoul using deck.gl SimpleMeshLayer
 */

import { SimpleMeshLayer } from '@deck.gl/mesh-layers'
import { SolidPolygonLayer } from '@deck.gl/layers'
import { MaskExtension } from '@deck.gl/extensions'
import { useMemo, useEffect, useState } from 'react'
import { generateGridMesh, getHeightColor, type MeshGeometry, getUnifiedSeoulBoundary } from '../utils/meshGenerator'
import { 
  loadStaticSeoulMesh, 
  checkStaticMeshExists, 
  hasPreGeneratedMesh, 
  getNearestAvailableResolution 
} from '../utils/loadStaticMesh'
import * as turf from '@turf/turf'

export interface SeoulMeshLayerProps {
  data?: any[]  // GeoJSON features (optional when used with separate data parameter)
  visible?: boolean
  wireframe?: boolean
  resolution?: number  // Default changed to 30 in meshGenerator
  heightScale?: number
  opacity?: number
  pickable?: boolean
  onHover?: (info: any) => void
  onClick?: (info: any) => void
  useMask?: boolean  // Enable masking to Seoul boundaries
  color?: string  // Custom color for mesh (hex string)
  dongBoundaries?: any[]  // Dong boundary features for sales mapping
  dongSalesMap?: Map<number, number>  // Map of dongCode to total sales
  salesHeightScale?: number  // Scale for converting sales to height
}

/**
 * Create mask layer for Seoul boundaries
 */
export function createSeoulMaskLayer(
  data: any[]
): SolidPolygonLayer | null {
  if (!data || data.length === 0) {
    return null
  }

  // Get unified Seoul boundary
  const boundary = getUnifiedSeoulBoundary(data)
  if (!boundary) {
    console.error('[SeoulMaskLayer] Failed to get unified boundary')
    return null
  }


  // Handle both Polygon and MultiPolygon types
  let polygonData: any[] = []
  
  if (boundary.geometry.type === 'Polygon') {
    // For Polygon: coordinates is [outer ring, ...holes]
    polygonData = [{
      polygon: boundary.geometry.coordinates
    }]
  } else if (boundary.geometry.type === 'MultiPolygon') {
    // For MultiPolygon: coordinates is array of polygons
    polygonData = boundary.geometry.coordinates.map((polygon: any) => ({
      polygon: polygon
    }))
  }


  return new SolidPolygonLayer({
    id: 'seoul-boundary-mask',
    data: polygonData,
    getPolygon: d => d.polygon,
    getFillColor: [255, 255, 255], // Color doesn't matter for mask
    operation: 'mask'
  })
}

/**
 * Create a SimpleMeshLayer from static pre-generated data
 */
export function createStaticSeoulMeshLayer(
  meshGeometry: MeshGeometry,
  props: SeoulMeshLayerProps = {}
): SimpleMeshLayer | null {
  const {
    visible = true,
    wireframe = false,
    opacity = 0.8,
    pickable = true,
    onHover,
    onClick,
    color = '#00FFE1'  // Default cyan
  } = props

  if (!visible || !meshGeometry) {
    return null
  }

  // Create mesh object with proper deck.gl format
  const meshObject: any = {
    attributes: {
      POSITION: {
        value: meshGeometry.positions,
        size: 3
      },
      NORMAL: {
        value: meshGeometry.normals,
        size: 3
      },
      TEXCOORD_0: {
        value: meshGeometry.texCoords,
        size: 2
      }
    },
    indices: meshGeometry.indices
  }
  
  // Add vertex colors if available
  if (meshGeometry.colors) {
    meshObject.attributes.COLOR_0 = {
      value: meshGeometry.colors,
      size: 4
    }
  }

  // Use center from metadata if available, otherwise use default
  const centerX = meshGeometry.metadata?.center?.x || 126.974139
  const centerY = meshGeometry.metadata?.center?.y || 37.564876
  
  // Create SimpleMeshLayer with static data
  const layerProps: any = {
    id: 'seoul-mesh-layer-static',
    data: [{ 
      position: [centerX, centerY, 0]  // Center position from mesh metadata
    }],
    mesh: meshObject,
    sizeScale: 1,
    wireframe,
    getPosition: (d: any) => d.position,
    // Always use getColor to allow custom colors to override vertex colors
    getColor: (() => {
      // Parse hex color to RGB
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        return result ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16),
          255
        ] : [0, 255, 200, 255]  // Fallback to default cyan
      }
      return hexToRgb(color)
    }),
    // Disable vertex colors to allow getColor to work
    vertexColors: false,
    material: {
      ambient: wireframe ? 0.6 : 0.8,   // Brighter ambient light
      diffuse: wireframe ? 0.9 : 1.0,   // Maximum diffuse
      shininess: wireframe ? 80 : 48,   // Moderate shine
      specularColor: wireframe ? [0, 255, 200] : [100, 200, 255]  // Cool specular colors
    },
    pickable,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 100],
    onHover,
    onClick,
    opacity: wireframe ? opacity : 1.0,  // Full opacity for solid mode
    updateTriggers: {
      getColor: [color, wireframe],
      mesh: [wireframe]
    }
  }

  return new SimpleMeshLayer(layerProps)
}

/**
 * Create a SimpleMeshLayer for Seoul mesh visualization
 * Uses pre-generated meshes when available, falls back to dynamic generation
 */
export async function createSeoulMeshLayerAsync(
  data: any[],
  props: SeoulMeshLayerProps = {}
): Promise<SimpleMeshLayer | null> {
  const {
    visible = true,
    wireframe = false,
    resolution = 60,  // Increased default for better boundary accuracy
    heightScale = 1,
    opacity = 0.8,
    pickable = true,
    onHover,
    onClick,
    useMask = false,  // Temporarily disable masking to restore rendering
    dongBoundaries,
    dongSalesMap,
    salesHeightScale
  } = props

  // Don't create layer if not visible or no data
  if (!visible || !data || data.length === 0) {
    return null
  }

  // Try to use pre-generated mesh if available
  let meshGeometry: MeshGeometry
  
  if (hasPreGeneratedMesh(resolution)) {
    console.log(`[SeoulMeshLayer] Using pre-generated mesh for resolution ${resolution}`)
    try {
      meshGeometry = await loadStaticSeoulMesh(resolution)
    } catch (error) {
      console.error(`[SeoulMeshLayer] Failed to load pre-generated mesh, falling back to dynamic:`, error)
      meshGeometry = generateGridMesh(data, {
        resolution,
        heightScale,
        wireframe,
        smoothing: true,
        dongBoundaries,
        dongSalesMap,
        salesHeightScale
      })
    }
  } else {
    console.log(`[SeoulMeshLayer] No pre-generated mesh for resolution ${resolution}, using dynamic generation`)
    meshGeometry = generateGridMesh(data, {
      resolution,
      heightScale,
      wireframe,
      smoothing: true,
      dongBoundaries,
      dongSalesMap,
      salesHeightScale
    })
  }

  // Validate geometry structure - check raw TypedArrays
  if (!meshGeometry || 
      !meshGeometry.positions || 
      meshGeometry.positions.length === 0 ||
      !meshGeometry.normals ||
      !meshGeometry.texCoords) {
    console.error('[SeoulMeshLayer] Invalid mesh geometry:', meshGeometry)
    return null
  }
  
  // Calculate center from data bounds
  let centerX = 126.974139  // Default center
  let centerY = 37.564876
  
  if (data && data.length > 0) {
    let minX = Infinity, minY = Infinity
    let maxX = -Infinity, maxY = -Infinity
    
    data.forEach(feature => {
      const bbox = turf.bbox(feature)
      minX = Math.min(minX, bbox[0])
      minY = Math.min(minY, bbox[1])
      maxX = Math.max(maxX, bbox[2])
      maxY = Math.max(maxY, bbox[3])
    })
    
    centerX = (minX + maxX) / 2
    centerY = (minY + maxY) / 2
  }
  

  // Create mesh object with proper deck.gl format
  // Using uppercase attribute names as expected by deck.gl/luma.gl
  const meshObject: any = {
    attributes: {
      POSITION: {
        value: meshGeometry.positions,
        size: 3  // 3 components per vertex (x, y, z)
      },
      NORMAL: {
        value: meshGeometry.normals,
        size: 3  // 3 components per normal
      },
      TEXCOORD_0: {
        value: meshGeometry.texCoords,
        size: 2  // 2 components per texture coordinate
      }
    },
    indices: meshGeometry.indices  // Indices stay as raw array
  }
  
  // Add vertex colors if available (for boundary masking)
  if (meshGeometry.colors) {
    meshObject.attributes.COLOR_0 = {
      value: meshGeometry.colors,
      size: 4  // 4 components per color (RGBA)
    }
  }

  // Create SimpleMeshLayer with optional masking
  const layerProps: any = {
    id: 'seoul-mesh-layer',
    data: [{ 
      position: [centerX, centerY, 0]  // Center position calculated from data bounds
    }],
    
    // Mesh configuration - properly formatted mesh object
    mesh: meshObject,
    sizeScale: 1,
    wireframe,
    
    // Position accessor - get position from data object
    getPosition: (d: any) => d.position,
    
    // Always use getColor to allow custom colors to work
    getColor: (() => {
      // Parse hex color to RGB
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        return result ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16),
          255
        ] : [0, 255, 200, 255]  // Fallback to default cyan
      }
      const customColor = props.color || '#00FFE1'
      return hexToRgb(customColor)
    }),
    
    // Disable vertex colors to allow getColor to override
    vertexColors: false,
    
    // Material properties for better 3D effect
    material: {
      ambient: wireframe ? 0.6 : 0.8,   // Brighter ambient light
      diffuse: wireframe ? 0.9 : 1.0,   // Maximum diffuse
      shininess: wireframe ? 80 : 48,   // Moderate shine
      specularColor: wireframe ? [0, 255, 200] : [100, 200, 255]  // Cool specular colors
    },
    
    // Interaction
    pickable,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 100],
    
    // Events
    onHover,
    onClick,
    
    // Rendering
    opacity: wireframe ? opacity : 1.0,  // Full opacity for solid mode
    
    // Performance
    updateTriggers: {
      getColor: [props.color, wireframe],
      mesh: [resolution, heightScale, wireframe]
    }
  }

  // Add MaskExtension if masking is enabled
  if (useMask) {
    layerProps.extensions = [new MaskExtension()]
    layerProps.maskId = 'seoul-boundary-mask'
  }

  return new SimpleMeshLayer(layerProps)
}

/**
 * Synchronous version that uses dynamic generation only
 * For backward compatibility
 */
export function createSeoulMeshLayer(
  data: any[],
  props: SeoulMeshLayerProps = {}
): SimpleMeshLayer | null {
  const {
    visible = true,
    wireframe = false,
    resolution = 60,
    heightScale = 1,
    opacity = 0.8,
    pickable = true,
    onHover,
    onClick,
    useMask = false,
    dongBoundaries,
    dongSalesMap,
    salesHeightScale
  } = props

  if (!visible || !data || data.length === 0) {
    return null
  }

  // For synchronous version, always use dynamic generation
  const meshGeometry = generateGridMesh(data, {
    resolution,
    heightScale,
    wireframe,
    smoothing: true,
    dongBoundaries,
    dongSalesMap,
    salesHeightScale
  })

  if (!meshGeometry || 
      !meshGeometry.positions || 
      meshGeometry.positions.length === 0 ||
      !meshGeometry.normals ||
      !meshGeometry.texCoords) {
    console.error('[SeoulMeshLayer] Invalid mesh geometry:', meshGeometry)
    return null
  }
  
  // Calculate center from data bounds
  let centerX = 126.974139
  let centerY = 37.564876
  
  if (data && data.length > 0) {
    let minX = Infinity, minY = Infinity
    let maxX = -Infinity, maxY = -Infinity
    
    data.forEach(feature => {
      const bbox = turf.bbox(feature)
      minX = Math.min(minX, bbox[0])
      minY = Math.min(minY, bbox[1])
      maxX = Math.max(maxX, bbox[2])
      maxY = Math.max(maxY, bbox[3])
    })
    
    centerX = (minX + maxX) / 2
    centerY = (minY + maxY) / 2
  }

  const meshObject: any = {
    attributes: {
      POSITION: {
        value: meshGeometry.positions,
        size: 3
      },
      NORMAL: {
        value: meshGeometry.normals,
        size: 3
      },
      TEXCOORD_0: {
        value: meshGeometry.texCoords,
        size: 2
      }
    },
    indices: meshGeometry.indices
  }
  
  if (meshGeometry.colors) {
    meshObject.attributes.COLOR_0 = {
      value: meshGeometry.colors,
      size: 4
    }
  }

  const layerProps: any = {
    id: 'seoul-mesh-layer',
    data: [{ 
      position: [centerX, centerY, 0]
    }],
    mesh: meshObject,
    sizeScale: 1,
    wireframe,
    getPosition: (d: any) => d.position,
    // Always use getColor to allow custom colors
    getColor: (() => {
      // Parse hex color to RGB
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        return result ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16),
          255
        ] : [0, 255, 200, 255]  // Fallback to default cyan
      }
      const customColor = props.color || '#00FFE1'
      return hexToRgb(customColor)
    }),
    // Disable vertex colors to allow getColor to work
    vertexColors: false,
    material: {
      ambient: wireframe ? 0.6 : 0.8,
      diffuse: wireframe ? 0.9 : 1.0,
      shininess: wireframe ? 80 : 48,
      specularColor: wireframe ? [0, 255, 200] : [100, 200, 255]
    },
    pickable,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 100],
    onHover,
    onClick,
    opacity: wireframe ? opacity : 1.0,
    updateTriggers: {
      getColor: [props.color, wireframe],
      mesh: [resolution, heightScale, wireframe]
    }
  }

  if (useMask) {
    layerProps.extensions = [new MaskExtension()]
    layerProps.maskId = 'seoul-boundary-mask'
  }

  return new SimpleMeshLayer(layerProps)
}

/**
 * Create both mesh and mask layers for Seoul visualization
 */
export function createSeoulMeshLayers(
  data: any[],
  props: SeoulMeshLayerProps = {}
): Array<SimpleMeshLayer | SolidPolygonLayer> {
  const layers: Array<SimpleMeshLayer | SolidPolygonLayer> = []
  
  // Create mask layer if masking is explicitly enabled
  if (props.useMask === true) {
    const maskLayer = createSeoulMaskLayer(data)
    if (maskLayer) {
      layers.push(maskLayer)
    }
  }
  
  // Create mesh layer
  const meshLayer = createSeoulMeshLayer(data, props)
  if (meshLayer) {
    layers.push(meshLayer)
  }
  return layers
}

/**
 * React hook for Seoul mesh layer with optimized memoization
 */
export function useSeoulMeshLayer(
  data: any[],
  props: SeoulMeshLayerProps = {}
): SimpleMeshLayer | null {
  // Memoize the data signature to avoid unnecessary regeneration
  const dataSignature = useMemo(() => {
    if (!data || data.length === 0) return null
    return `${data.length}_${data[0]?.properties?.ADM_DR_CD || ''}`
  }, [data])
  
  return useMemo(() => {
    return createSeoulMeshLayer(data, props)
  }, [
    dataSignature,  // Use signature instead of full data array
    props.visible,
    props.wireframe,
    props.resolution,
    props.heightScale,
    props.opacity,
    props.pickable,
    props.useMask
  ])
}

/**
 * React hook for Seoul mesh layers with mask support
 */
export function useSeoulMeshLayers(
  data: any[],
  props: SeoulMeshLayerProps = {}
): Array<SimpleMeshLayer | SolidPolygonLayer> {
  // Memoize the data signature to avoid unnecessary regeneration
  const dataSignature = useMemo(() => {
    if (!data || data.length === 0) return null
    return `${data.length}_${data[0]?.properties?.ADM_DR_CD || ''}`
  }, [data])
  
  return useMemo(() => {
    return createSeoulMeshLayers(data, props)
  }, [
    dataSignature,  // Use signature instead of full data array
    props.visible,
    props.wireframe,
    props.resolution,
    props.heightScale,
    props.opacity,
    props.pickable,
    props.useMask
  ])
}

/**
 * React hook for pre-generated Seoul mesh layer
 * Loads pre-generated mesh data for better performance
 * Supports multiple resolutions with automatic fallback
 */
export function usePreGeneratedSeoulMeshLayer(
  props: SeoulMeshLayerProps = {},
  districtData?: any[]
): SimpleMeshLayer | null {
  const {
    resolution = 60,
    visible = true,
    wireframe = false,
    opacity = 0.8,
    pickable = true,
    onHover,
    onClick,
    color = '#00FFE1',
    dongBoundaries,
    dongSalesMap,
    salesHeightScale
  } = props

  const [meshData, setMeshData] = useState<MeshGeometry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [loadedResolution, setLoadedResolution] = useState<number | null>(null)

  // Load pre-generated mesh data when resolution changes
  useEffect(() => {
    let cancelled = false

    const loadMesh = async () => {
      try {
        setLoading(true)
        
        // If sales data is provided, always use dynamic generation for accurate heights
        if (dongSalesMap && dongSalesMap.size > 0) {
          console.log(`[usePreGeneratedSeoulMeshLayer] Using dynamic generation with sales data (${dongSalesMap.size} dongs)`)
          if (districtData && districtData.length > 0) {
            const dynamicMesh = generateGridMesh(districtData, {
              resolution,
              heightScale: 1,
              wireframe,
              smoothing: true,
              dongBoundaries: dongBoundaries || districtData,
              dongSalesMap,
              salesHeightScale
            })
            if (!cancelled) {
              setMeshData(dynamicMesh)
              setLoadedResolution(resolution)
              setError(null)
            }
            return
          }
        }
        
        // Only use pre-generated mesh if no sales data is provided
        if (hasPreGeneratedMesh(resolution)) {
          console.log(`[usePreGeneratedSeoulMeshLayer] Loading pre-generated mesh for resolution ${resolution} (no sales data)`)
          const data = await loadStaticSeoulMesh(resolution)
          
          if (!cancelled) {
            setMeshData(data)
            setLoadedResolution(resolution)
            setError(null)
          }
        } else {
          // Use nearest available resolution
          const nearestRes = getNearestAvailableResolution(resolution)
          console.log(`[usePreGeneratedSeoulMeshLayer] Loading nearest resolution ${nearestRes} for requested ${resolution}`)
          const data = await loadStaticSeoulMesh(nearestRes)
          
          if (!cancelled) {
            setMeshData(data)
            setLoadedResolution(nearestRes)
            setError(null)
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[usePreGeneratedSeoulMeshLayer] Failed to load mesh:', err)
          setError(err as Error)
          // Fall back to dynamic generation if district data is available
          if (districtData && districtData.length > 0) {
            console.log('[usePreGeneratedSeoulMeshLayer] Falling back to dynamic generation')
            const dynamicMesh = generateGridMesh(districtData, {
              resolution,
              heightScale: 1,
              wireframe,
              smoothing: true,
              dongBoundaries: dongBoundaries || districtData,  // Use dongBoundaries if provided, otherwise use districtData
              dongSalesMap,
              salesHeightScale
            })
            setMeshData(dynamicMesh)
            setLoadedResolution(resolution)
            setError(null)
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadMesh()

    return () => {
      cancelled = true
    }
  }, [resolution, wireframe, districtData, dongBoundaries, dongSalesMap, salesHeightScale])

  // Create layer from loaded data
  return useMemo(() => {
    if (!meshData || loading || !visible) {
      return null
    }

    return createStaticSeoulMeshLayer(meshData, {
      visible,
      wireframe,
      opacity,
      pickable,
      onHover,
      onClick,
      color
    })
  }, [meshData, loading, visible, wireframe, opacity, pickable, onHover, onClick, color])
}

/**
 * React hook for static Seoul mesh layer (backward compatibility)
 * Loads pre-generated mesh data for better performance
 */
export function useStaticSeoulMeshLayer(
  props: SeoulMeshLayerProps = {}
): SimpleMeshLayer | null {
  // Use the new hook with default resolution 200 for backward compatibility
  return usePreGeneratedSeoulMeshLayer({ ...props, resolution: 200 })
}