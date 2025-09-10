/**
 * Seoul Mesh Layer Component
 * Creates a triangulated mesh visualization of Seoul using deck.gl SimpleMeshLayer
 */

import { SimpleMeshLayer } from '@deck.gl/mesh-layers'
import { SolidPolygonLayer } from '@deck.gl/layers'
import { COORDINATE_SYSTEM } from '@deck.gl/core'
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
  animatedOpacity?: number  // For animated opacity transitions
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
    color = '#00FFE1',  // Default cyan
    salesHeightScale = 100000000  // Default to 100M (1억원) for normal height
  } = props

  console.log(`[createStaticSeoulMeshLayer] Creating layer with salesHeightScale=${salesHeightScale}, visible=${visible}, wireframe=${wireframe}, color=${color}`)
  
  if (!visible || !meshGeometry) {
    console.log(`[createStaticSeoulMeshLayer] Not creating layer: visible=${visible}, meshGeometry=${!!meshGeometry}`)
    return null
  }

  // Apply height scale to Z coordinates only
  const scaledPositions = new Float32Array(meshGeometry.positions.length)
  const heightScaleFactor = 100000000 / (salesHeightScale || 100000000)
  
  for (let i = 0; i < meshGeometry.positions.length; i += 3) {
    scaledPositions[i] = meshGeometry.positions[i]       // X coordinate unchanged
    scaledPositions[i + 1] = meshGeometry.positions[i + 1] // Y coordinate unchanged
    scaledPositions[i + 2] = meshGeometry.positions[i + 2] * heightScaleFactor // Scale Z only
  }
  
  // Create mesh object with proper deck.gl format
  const meshObject: any = {
    attributes: {
      POSITION: {
        value: scaledPositions,  // Use scaled positions
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
  
  const layerProps: any = {
    id: 'seoul-mesh-layer-static',
    data: [{ 
      position: [centerX, centerY, 0]  // Center position from mesh metadata
    }],
    mesh: meshObject,
    sizeScale: 1,  // Keep original XY size, height is already scaled in positions
    coordinateSystem: COORDINATE_SYSTEM.LNGLAT,  // Use geographic coordinates
    wireframe,
    getPosition: (d: any) => d.position,
    // GPU Optimization Parameters
    parameters: {
      depthTest: true,
      depthFunc: 0x0203, // GL.LEQUAL
      blend: !wireframe, // Disable blending for opaque mesh
      blendFunc: wireframe ? [0x0302, 0x0303] : undefined, // Blend only if wireframe
      cullFace: 0x0405, // GL.BACK
      cullFaceMode: !wireframe, // Cull back faces for solid mesh
      polygonOffsetFill: true
    },
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

  console.log(`[createStaticSeoulMeshLayer] Layer created with heightScaleFactor=${heightScaleFactor}, mesh vertices=${meshGeometry.positions?.length / 3}, indices=${meshGeometry.indices?.length / 3}`)
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

  // Return layer with visible=false instead of null for better performance
  if (!data || data.length === 0) {
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

  // Create SimpleMeshLayer with optimized configuration
  const layerProps: any = {
    id: 'seoul-mesh-layer',
    data: [{ 
      position: [centerX, centerY, 0]  // Center position calculated from data bounds
    }],
    
    // Control visibility through prop instead of conditional rendering
    visible,
    
    // Mesh configuration - properly formatted mesh object
    mesh: meshObject,
    sizeScale: 1,
    wireframe,
    
    // GPU Optimization Parameters
    parameters: {
      depthTest: true,
      depthFunc: 0x0203, // GL.LEQUAL
      blend: wireframe, // Blend only for wireframe
      blendFunc: wireframe ? [0x0302, 0x0303] : undefined,
      cullFace: 0x0405, // GL.BACK
      cullFaceMode: !wireframe,
      polygonOffsetFill: true
    },
    
    // Position accessor - get position from data object
    getPosition: (d: any) => d.position,
    
    // Memoized color to avoid re-computation
    getColor: [0, 255, 225, 255], // Static color for best performance
    
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
 * React hook for Seoul mesh layers with mask support
 * DEPRECATED - Use usePreGeneratedSeoulMeshLayer instead
 */
export function useSeoulMeshLayers(
  data: any[],
  props: SeoulMeshLayerProps = {}
): Array<SimpleMeshLayer | SolidPolygonLayer> {
  console.warn('[useSeoulMeshLayers] DEPRECATED: Use usePreGeneratedSeoulMeshLayer instead')
  
  // Fallback implementation using the new hook
  const { layer } = usePreGeneratedSeoulMeshLayer(props, data)
  
  const layers: Array<SimpleMeshLayer | SolidPolygonLayer> = []
  
  // Create mask layer if masking is explicitly enabled
  if (props.useMask === true) {
    const maskLayer = createSeoulMaskLayer(data)
    if (maskLayer) {
      layers.push(maskLayer)
    }
  }
  
  // Add the mesh layer if available
  if (layer) {
    layers.push(layer)
  }
  
  return layers
}

/**
 * React hook for pre-generated Seoul mesh layer
 * Loads pre-generated mesh data for better performance
 * Supports multiple resolutions with automatic fallback
 * NOW USES OPTIMIZED BINARY LOADER for 10x faster loading
 */
export function usePreGeneratedSeoulMeshLayer(
  props: SeoulMeshLayerProps = {},
  districtData?: any[]
): { layer: SimpleMeshLayer | null; isLoading: boolean } {
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
    salesHeightScale,
    animatedOpacity
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
        
        // Always use binary file loading - no dynamic generation
        const nearestResolution = getNearestAvailableResolution(resolution)
        console.log(`[usePreGeneratedSeoulMeshLayer] Loading binary mesh for resolution ${nearestResolution}`)
        
        const data = await loadStaticSeoulMesh(nearestResolution)
        
        if (!cancelled) {
          setMeshData(data)
          setLoadedResolution(nearestResolution)
          setError(null)
        }
        
      } catch (err) {
        if (!cancelled) {
          console.error('[usePreGeneratedSeoulMeshLayer] Failed to load binary mesh:', err)
          setError(err as Error)
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
  }, [resolution]) // Only resolution matters for binary loading

  // Create layer from loaded data
  const layer = useMemo(() => {
    if (!meshData || loading || !visible) {
      console.log(`[usePreGeneratedSeoulMeshLayer] Not creating layer: meshData=${!!meshData}, loading=${loading}, visible=${visible}`)
      return null
    }

    console.log(`[usePreGeneratedSeoulMeshLayer] Creating layer with resolution ${loadedResolution}, visible=${visible}, wireframe=${wireframe}`)
    return createStaticSeoulMeshLayer(meshData, {
      visible,
      wireframe,
      opacity: animatedOpacity !== undefined ? animatedOpacity : opacity,
      pickable,
      onHover,
      onClick,
      color,
      salesHeightScale  // Pass the height scale parameter
    })
  }, [meshData, loading, visible, wireframe, opacity, animatedOpacity, pickable, onHover, onClick, color, salesHeightScale])
  
  // Return both layer and loading state
  return { layer, isLoading: loading }
}

/**
 * React hook that returns raw mesh geometry data for custom layer implementations
 * Used by AnimatedMeshLayer for GPU-based vertex animations
 */
export function useMeshGeometry(
  resolution: number = 30,
  districtData?: any[]
): { meshData: MeshGeometry | null; loading: boolean; error: Error | null } {
  const [meshData, setMeshData] = useState<MeshGeometry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadMesh = async () => {
      try {
        setLoading(true)
        
        // Always use binary file loading
        const nearestResolution = getNearestAvailableResolution(resolution)
        console.log(`[useMeshGeometry] Loading binary mesh at resolution ${nearestResolution}`)
        
        const data = await loadStaticSeoulMesh(nearestResolution)
        
        if (!cancelled) {
          setMeshData(data)
          setError(null)
        }
        
      } catch (err) {
        if (!cancelled) {
          console.error('[useMeshGeometry] Failed to load binary mesh:', err)
          setError(err as Error)
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
  }, [resolution]) // Only resolution matters for binary loading

  return { meshData, loading, error }
}

/**
 * React hook for static Seoul mesh layer (backward compatibility)
 * Loads pre-generated mesh data for better performance
 */
export function useStaticSeoulMeshLayer(
  props: SeoulMeshLayerProps = {}
): SimpleMeshLayer | null {
  // Use the new hook with default resolution 200 for backward compatibility
  const { layer } = usePreGeneratedSeoulMeshLayer({ ...props, resolution: 200 })
  return layer
}