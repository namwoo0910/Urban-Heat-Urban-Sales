/**
 * WebGL Advanced Optimization Configuration
 * Provides maximum performance through GPU-specific optimizations
 */

// WebGL 2.0 Context Configuration for Maximum Performance
export const WEBGL_CONTEXT_OPTIONS = {
  // Alpha channel disabled for better performance
  alpha: false,
  
  // Anti-aliasing for smooth edges
  antialias: true,
  
  // Depth buffer for 3D rendering
  depth: true,
  
  // Stencil buffer disabled (not needed)
  stencil: false,
  
  // Request high-performance GPU
  powerPreference: 'high-performance' as WebGLPowerPreference,
  
  // Desynchronized for reduced latency
  desynchronized: true,
  
  // Don't preserve drawing buffer for performance
  preserveDrawingBuffer: false,
  
  // Fail if software renderer (force hardware acceleration)
  failIfMajorPerformanceCaveat: false
}

// Advanced GPU Parameters for Deck.gl
export const WEBGL_PARAMETERS = {
  // Depth Testing
  depthTest: true,
  depthFunc: 0x0203, // GL.LEQUAL
  depthRange: [0, 1],
  depthMask: true,
  
  // Blending Configuration
  blend: true,
  blendFunc: [0x0302, 0x0303, 0x0001, 0x0303], // [GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ONE, GL.ONE_MINUS_SRC_ALPHA]
  blendEquation: 0x8006, // GL.FUNC_ADD
  blendColor: [0, 0, 0, 0],
  
  // Face Culling (remove hidden faces)
  cullFace: 0x0405, // GL.BACK
  cullFaceMode: true,
  // Remove frontFace as it's causing compatibility issues
  // frontFace is handled internally by deck.gl
  
  // Polygon Offset (prevent z-fighting)
  polygonOffsetFill: true,
  polygonOffset: [1, 1],
  
  // Disable expensive features
  stencilTest: false,
  dither: false,
  scissorTest: false,
  
  // Color and Clear Configuration
  colorMask: [true, true, true, true],
  clearColor: [0, 0, 0, 0],
  
  // Sample Coverage
  sampleCoverage: [1, false]
  
  // Optimization hints - removed as they may cause compatibility issues
  // hint parameters are handled internally by the rendering engine
}

// Level of Detail (LOD) Configuration
export const LOD_LEVELS = {
  ULTRA: {
    minZoom: 14,
    maxVertices: Infinity,
    simplification: 1.0,
    elevationScale: 1.0,
    opacity: 1.0
  },
  HIGH: {
    minZoom: 12,
    maxVertices: 10000,
    simplification: 0.95,
    elevationScale: 1.0,
    opacity: 1.0
  },
  MEDIUM: {
    minZoom: 10,
    maxVertices: 5000,
    simplification: 0.8,
    elevationScale: 0.95,
    opacity: 0.98
  },
  LOW: {
    minZoom: 8,
    maxVertices: 2500,
    simplification: 0.6,
    elevationScale: 0.9,
    opacity: 0.95
  },
  MINIMAL: {
    minZoom: 0,
    maxVertices: 1000,
    simplification: 0.4,
    elevationScale: 0.85,
    opacity: 0.9
  }
}

// Get LOD level based on zoom
export function getLODLevel(zoom: number) {
  if (zoom >= LOD_LEVELS.ULTRA.minZoom) return LOD_LEVELS.ULTRA
  if (zoom >= LOD_LEVELS.HIGH.minZoom) return LOD_LEVELS.HIGH
  if (zoom >= LOD_LEVELS.MEDIUM.minZoom) return LOD_LEVELS.MEDIUM
  if (zoom >= LOD_LEVELS.LOW.minZoom) return LOD_LEVELS.LOW
  return LOD_LEVELS.MINIMAL
}

// Memory Pool Configuration
export const BUFFER_POOL_CONFIG = {
  // TypedArray pools
  float32Pool: {
    initialSize: 10,
    maxSize: 100,
    growthFactor: 1.5
  },
  uint16Pool: {
    initialSize: 10,
    maxSize: 50,
    growthFactor: 1.5
  },
  uint32Pool: {
    initialSize: 5,
    maxSize: 25,
    growthFactor: 1.5
  }
}

// Instanced Rendering Configuration
export const INSTANCING_CONFIG = {
  // Enable instancing for repeated geometries
  useInstancing: true,
  
  // Maximum instances per draw call
  maxInstances: 10000,
  
  // Instance buffer update strategy
  updateTriggers: {
    getPosition: ['zoom', 'data'],
    getColor: ['colorScale', 'selection'],
    getElevation: ['elevationScale', 'selection']
  }
}

// Texture Atlas Configuration
export const TEXTURE_ATLAS_CONFIG = {
  // Atlas dimensions (power of 2)
  width: 2048,
  height: 2048,
  
  // Texture filtering
  minFilter: 0x2703, // GL.LINEAR_MIPMAP_LINEAR
  magFilter: 0x2601, // GL.LINEAR
  
  // Mipmapping
  generateMipmaps: true,
  
  // Anisotropic filtering level
  anisotropy: 16
}

// Frame Budget Management
export const FRAME_BUDGET = {
  targetFPS: 60,
  frameBudgetMs: 16.67, // 1000/60
  
  // Time allocation per render phase
  phases: {
    update: 4,      // Data updates
    cull: 2,        // Frustum culling
    render: 8,      // GPU rendering
    composite: 2.67 // Final compositing
  },
  
  // Adaptive quality settings
  adaptiveQuality: {
    enabled: true,
    minFPS: 45,
    degradeThreshold: 50, // Start degrading at 50fps
    restoreThreshold: 58  // Restore quality at 58fps
  }
}

// WebGL Extension Requirements
export const REQUIRED_EXTENSIONS = [
  'OES_texture_float',
  'OES_texture_float_linear',
  'OES_element_index_uint',
  'WEBGL_depth_texture',
  'EXT_shader_texture_lod',
  'EXT_texture_filter_anisotropic',
  'WEBGL_compressed_texture_s3tc',
  'WEBGL_compressed_texture_etc1'
]

// GPU Memory Management
export const GPU_MEMORY_CONFIG = {
  // Maximum GPU memory usage (MB)
  maxMemoryMB: 512,
  
  // Memory allocation strategy
  allocation: {
    geometry: 0.4,    // 40% for geometry
    textures: 0.3,    // 30% for textures
    uniforms: 0.1,    // 10% for uniforms
    framebuffers: 0.2 // 20% for framebuffers
  },
  
  // Garbage collection threshold
  gcThreshold: 0.9 // Trigger GC at 90% usage
}

// Batching Configuration
export const BATCHING_CONFIG = {
  // Enable draw call batching
  enabled: true,
  
  // Maximum primitives per batch
  maxBatchSize: 65536,
  
  // Batch sorting strategy
  sortBy: 'material', // 'material' | 'distance' | 'none'
  
  // Dynamic batching for moving objects
  dynamicBatching: true
}

// Check WebGL capabilities
export function checkWebGLCapabilities(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  const capabilities = {
    version: gl.getParameter(gl.VERSION),
    vendor: gl.getParameter(gl.VENDOR),
    renderer: gl.getParameter(gl.RENDERER),
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    maxVertexAttributes: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
    maxVertexUniformVectors: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
    maxFragmentUniformVectors: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
    maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
    maxCombinedTextureUnits: gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
    extensions: gl.getSupportedExtensions()
  }
  
  return capabilities
}

// Optimize layer configuration based on device capabilities
export function optimizeLayerConfig(capabilities: any) {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  const isLowEnd = capabilities.maxTextureSize < 4096 || capabilities.renderer.includes('Intel')
  
  return {
    // Reduce quality on mobile/low-end devices
    useDevicePixels: !isMobile && !isLowEnd,
    
    // Adjust polygon complexity
    maxVertices: isLowEnd ? 5000 : (isMobile ? 10000 : Infinity),
    
    // Shadow quality
    shadowEnabled: !isLowEnd && !isMobile,
    
    // Anti-aliasing samples
    sampleCount: isLowEnd ? 1 : (isMobile ? 2 : 4),
    
    // Texture resolution
    textureResolution: isLowEnd ? 512 : (isMobile ? 1024 : 2048)
  }
}

// Create optimized WebGL parameters based on context
export function createOptimizedParameters(zoom: number, isMobile: boolean = false) {
  const lod = getLODLevel(zoom)
  
  // Start with safe, essential parameters only
  const safeParams: any = {
    // Essential depth testing
    depthTest: true,
    depthFunc: 0x0203, // GL.LEQUAL
    depthMask: true,
    
    // Basic blending for transparency
    blend: true,
    blendFunc: [0x0302, 0x0303], // [GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA]
    blendEquation: 0x8006, // GL.FUNC_ADD
    
    // Face culling for performance
    cullFace: 0x0405, // GL.BACK
    cullFaceMode: true,
    
    // Z-fighting prevention
    polygonOffsetFill: true,
    polygonOffset: [1, 1]
  }
  
  // Adjust based on LOD level
  if (lod === LOD_LEVELS.MINIMAL || lod === LOD_LEVELS.LOW) {
    // Use simpler settings at low detail
    safeParams.depthFunc = 0x0201 // GL.LESS for simpler depth test
  }
  
  // Mobile optimizations
  if (isMobile) {
    // Keep minimal parameters for mobile
    delete safeParams.polygonOffset // Remove polygon offset on mobile
  }
  
  return safeParams
}