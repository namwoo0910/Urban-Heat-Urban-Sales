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

  // Validate geometry structure - check raw TypedArrays
  if (!meshGeometry || 
      !meshGeometry.positions || 
      meshGeometry.positions.length === 0 ||
      !meshGeometry.normals ||
      !meshGeometry.texCoords) {
    console.error('[SeoulMeshLayer] Invalid mesh geometry:', meshGeometry)
    return null
  }
  
  console.log('[SeoulMeshLayer] Mesh geometry created:', {
    positions: meshGeometry.positions.length / 3,  // 3 components per vertex
    normals: meshGeometry.normals.length / 3,      // 3 components per normal
    texCoords: meshGeometry.texCoords.length / 2,  // 2 components per texCoord
    hasIndices: !!meshGeometry.indices,
    indices: meshGeometry.indices ? meshGeometry.indices.length / 3 : 0  // triangles
  })

  // Create mesh object with proper deck.gl format
  // Using uppercase attribute names as expected by deck.gl/luma.gl
  const meshObject = {
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

  // Create SimpleMeshLayer
  return new SimpleMeshLayer({
    id: 'seoul-mesh-layer',
    data: [{ 
      position: [126.978, 37.5765, 0]  // Center position for the mesh
    }],
    
    // Mesh configuration - properly formatted mesh object
    mesh: meshObject,
    sizeScale: 1,
    wireframe,
    
    // Position accessor - get position from data object
    getPosition: (d: any) => d.position,
    
    // Color based on height - more vibrant colors for better visibility
    getColor: () => {
      // For wireframe, use bright cyan color
      if (wireframe) {
        return [0, 255, 255, 255]
      }
      // For solid, use more vibrant blue-purple gradient
      return [120, 100, 255, 255]  // Bright purple-blue, full opacity
    },
    
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
  })
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