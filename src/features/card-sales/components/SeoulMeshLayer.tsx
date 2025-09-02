/**
 * Seoul Mesh Layer Component
 * Creates a triangulated mesh visualization of Seoul using deck.gl SimpleMeshLayer
 */

import { SimpleMeshLayer } from '@deck.gl/mesh-layers'
import { SolidPolygonLayer } from '@deck.gl/layers'
import { MaskExtension } from '@deck.gl/extensions'
import { useMemo, useEffect, useState } from 'react'
import { generateGridMesh, getHeightColor, type MeshGeometry, getUnifiedSeoulBoundary } from '../utils/meshGenerator'
import { loadStaticSeoulMesh, checkStaticMeshExists } from '../utils/loadStaticMesh'
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
    onClick
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
    getColor: meshGeometry.colors ? undefined : (() => {
      if (wireframe) {
        return [0, 255, 255, 255]
      }
      return [120, 100, 255, 255]
    }),
    vertexColors: meshGeometry.colors ? true : false,
    material: {
      ambient: 0.5,
      diffuse: 0.8,
      shininess: 64,
      specularColor: wireframe ? [0, 255, 255] : [200, 200, 255]
    },
    pickable,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 100],
    onHover,
    onClick,
    opacity,
    updateTriggers: {
      getColor: [wireframe],
      mesh: [wireframe]
    }
  }

  return new SimpleMeshLayer(layerProps)
}

/**
 * Create a SimpleMeshLayer for Seoul mesh visualization (fallback for dynamic generation)
 */
export function createSeoulMeshLayer(
  data: any[],
  props: SeoulMeshLayerProps = {}
): SimpleMeshLayer | null {
  const {
    visible = true,
    wireframe = false,
    resolution = 60,  // Increased default for better boundary accuracy
    heightScale = 1,
    opacity = 0.8,
    pickable = true,
    onHover,
    onClick,
    useMask = false  // Temporarily disable masking to restore rendering
  } = props

  // Don't create layer if not visible or no data
  if (!visible || !data || data.length === 0) {
    return null
  }

  // Generate mesh geometry
  const meshGeometry = generateGridMesh(data, {
    resolution,
    heightScale,
    wireframe,
    smoothing: true
  })

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
    
    // Color based on height - more vibrant colors for better visibility
    // Use vertex colors if available, otherwise use default colors
    getColor: (() => {
      // For wireframe, use bright cyan color
      if (wireframe) {
        return [0, 255, 255, 255]
      }
      // For solid, use default color (vertex colors will override if present)
      return [120, 100, 255, 255]  // Bright purple-blue, full opacity
    }),
    
    // Enable vertex colors if they exist
    vertexColors: meshGeometry.colors ? true : false,
    
    // Material properties for better 3D effect
    material: {
      ambient: 0.5,  // Increased for better visibility
      diffuse: 0.8,  // Increased for brighter surface
      shininess: 64,  // Higher shine for more visual pop
      specularColor: wireframe ? [0, 255, 255] : [200, 200, 255]  // Purple-tinted specular
    },
    
    // Interaction
    pickable,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 100],
    
    // Events
    onHover,
    onClick,
    
    // Rendering
    opacity,
    
    // Performance
    updateTriggers: {
      getColor: [wireframe],
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
 * React hook for static Seoul mesh layer
 * Loads pre-generated mesh data for better performance
 */
export function useStaticSeoulMeshLayer(
  props: SeoulMeshLayerProps = {}
): SimpleMeshLayer | null {
  const [meshData, setMeshData] = useState<MeshGeometry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Load static mesh data
  useEffect(() => {
    let cancelled = false

    const loadMesh = async () => {
      try {
        setLoading(true)
        const exists = await checkStaticMeshExists()
        
        if (!exists) {
          console.warn('[useStaticSeoulMeshLayer] Static mesh file not found, falling back to dynamic generation')
          setError(new Error('Static mesh file not found'))
          return
        }

        const data = await loadStaticSeoulMesh()
        
        if (!cancelled) {
          setMeshData(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[useStaticSeoulMeshLayer] Failed to load static mesh:', err)
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
  }, [])

  // Create layer from loaded data
  return useMemo(() => {
    if (!meshData || loading || error || !props.visible) {
      return null
    }

    return createStaticSeoulMeshLayer(meshData, props)
  }, [meshData, loading, error, props.visible, props.wireframe, props.opacity, props.pickable])
}