/**
 * Seoul Mesh Layer Component
 * Creates a triangulated mesh visualization of Seoul using deck.gl SimpleMeshLayer
 */

import { SimpleMeshLayer } from '@deck.gl/mesh-layers'
import { useMemo } from 'react'
import { generateGridMesh, getHeightColor, type MeshGeometry } from '../utils/meshGenerator'

export interface SeoulMeshLayerProps {
  data: any[]  // GeoJSON features
  visible?: boolean
  wireframe?: boolean
  resolution?: number  // Default changed to 30 in meshGenerator
  heightScale?: number
  opacity?: number
  pickable?: boolean
  onHover?: (info: any) => void
  onClick?: (info: any) => void
}

/**
 * Create a SimpleMeshLayer for Seoul mesh visualization
 */
export function createSeoulMeshLayer(
  data: any[],
  props: SeoulMeshLayerProps = {}
): SimpleMeshLayer | null {
  const {
    visible = true,
    wireframe = false,
    resolution = 30,  // Reduced default for better performance
    heightScale = 1,
    opacity = 0.8,
    pickable = true,
    onHover,
    onClick
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

  // Validate geometry structure
  if (!meshGeometry || 
      !meshGeometry.positions || 
      !meshGeometry.positions.value ||
      meshGeometry.positions.value.length === 0 ||
      !meshGeometry.normals ||
      !meshGeometry.normals.value ||
      !meshGeometry.texCoords ||
      !meshGeometry.texCoords.value) {
    console.error('[SeoulMeshLayer] Invalid mesh geometry:', meshGeometry)
    return null
  }
  
  console.log('[SeoulMeshLayer] Mesh geometry created:', {
    positions: meshGeometry.positions.value.length / meshGeometry.positions.size,
    normals: meshGeometry.normals.value.length / meshGeometry.normals.size,
    texCoords: meshGeometry.texCoords.value.length / meshGeometry.texCoords.size,
    hasIndices: !!meshGeometry.indices
  })

  // Create SimpleMeshLayer
  return new SimpleMeshLayer({
    id: 'seoul-mesh-layer',
    data: [{ 
      position: [126.978, 37.5765, 0]  // Center position for the mesh
    }],
    
    // Mesh configuration - mesh should be the geometry object
    mesh: meshGeometry,
    sizeScale: 1,
    wireframe,
    
    // Position accessor - get position from data object
    getPosition: (d: any) => d.position,
    
    // Color based on height
    getColor: () => {
      // For wireframe, use cyan color
      if (wireframe) {
        return [0, 255, 255, 255]
      }
      // For solid, we'll use vertex colors if available, or a gradient
      return [100, 150, 200, 220]
    },
    
    // Material properties for better 3D effect
    material: {
      ambient: 0.35,
      diffuse: 0.6,
      shininess: 32,
      specularColor: wireframe ? [0, 255, 255] : [255, 255, 255]
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
  })
}

/**
 * React hook for Seoul mesh layer with optimized memoization
 */
export function useSeoulMeshLayer(
  data: any[],
  props: SeoulMeshLayerProps = {}
): SimpleMeshLayer | null {
  // Memoize the data length instead of the full array to avoid unnecessary regeneration
  const dataSignature = useMemo(() => {
    if (!data || data.length === 0) return null
    return `${data.length}_${data[0]?.properties?.ADM_DR_CD || ''}`
  }, [data])
  
  return useMemo(() => {
    console.time('[SeoulMeshLayer] Layer creation')
    const layer = createSeoulMeshLayer(data, props)
    console.timeEnd('[SeoulMeshLayer] Layer creation')
    return layer
  }, [
    dataSignature,  // Use signature instead of full data array
    props.visible,
    props.wireframe,
    props.resolution,
    props.heightScale,
    props.opacity,
    props.pickable
  ])
}