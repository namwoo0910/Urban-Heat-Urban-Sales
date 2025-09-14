/**
 * GPU-based Data Aggregator
 * Performs spatial aggregation directly on GPU for maximum performance
 * Uses WebGL2 compute-like patterns for data reduction
 */

// Temporarily disabled - unused file
// import { Texture2D, Framebuffer } from '@luma.gl/webgl'
// import { Model, Geometry } from '@luma.gl/engine'
// import GL from '@luma.gl/constants'

export interface GPUAggregatorOptions {
  gridSize: number
  bounds: [[number, number], [number, number]] // [[minLng, minLat], [maxLng, maxLat]]
  aggregationMode: 'sum' | 'mean' | 'max' | 'min'
  weightProperty?: string
}

export interface AggregationResult {
  gridData: Float32Array
  texture: any // Texture2D
  gridSize: number
  bounds: [[number, number], [number, number]]
  stats: {
    min: number
    max: number
    mean: number
    total: number
  }
}

// Vertex shader for point aggregation
const aggregationVS = `\
#version 300 es
precision highp float;

in vec2 positions;
in float values;
in float weights;

uniform vec2 boundsMin;
uniform vec2 boundsMax;
uniform float gridSize;

out float vValue;
out float vWeight;

void main() {
  // Transform position to grid coordinates
  vec2 normalizedPos = (positions - boundsMin) / (boundsMax - boundsMin);
  vec2 gridPos = normalizedPos * gridSize;
  
  // Snap to grid cell center
  gridPos = floor(gridPos) + 0.5;
  vec2 clipPos = (gridPos / gridSize) * 2.0 - 1.0;
  
  gl_Position = vec4(clipPos, 0.0, 1.0);
  gl_PointSize = 1.0;
  
  vValue = values;
  vWeight = weights;
}
`

// Fragment shader for aggregation
const aggregationFS = `\
#version 300 es
precision highp float;

in float vValue;
in float vWeight;

uniform int aggregationMode; // 0=sum, 1=mean, 2=max, 3=min

out vec4 fragColor;

void main() {
  float result = vValue * vWeight;
  
  if (aggregationMode == 2) { // max
    result = vValue;
  } else if (aggregationMode == 3) { // min
    result = vValue;
  }
  
  // Pack value and count for mean calculation
  fragColor = vec4(result, vWeight, 1.0, 1.0);
}
`

// Reduction vertex shader
const reductionVS = `\
#version 300 es
precision highp float;

in vec2 positions;

void main() {
  gl_Position = vec4(positions, 0.0, 1.0);
}
`

// Reduction fragment shader (pyramid reduction)
const reductionFS = `\
#version 300 es
precision highp float;

uniform sampler2D inputTexture;
uniform vec2 texelSize;
uniform int reductionMode; // 0=sum, 1=mean, 2=max, 3=min

out vec4 fragColor;

void main() {
  vec2 texCoord = gl_FragCoord.xy * texelSize;
  
  // Sample 2x2 block
  vec4 s00 = texture(inputTexture, texCoord);
  vec4 s10 = texture(inputTexture, texCoord + vec2(texelSize.x, 0.0));
  vec4 s01 = texture(inputTexture, texCoord + vec2(0.0, texelSize.y));
  vec4 s11 = texture(inputTexture, texCoord + texelSize);
  
  vec4 result;
  
  if (reductionMode == 0 || reductionMode == 1) { // sum or mean
    result = s00 + s10 + s01 + s11;
  } else if (reductionMode == 2) { // max
    result = max(max(s00, s10), max(s01, s11));
  } else { // min
    result = min(min(s00, s10), min(s01, s11));
  }
  
  fragColor = result;
}
`

// Temporarily disabled - unused file
/*
export class GPUAggregator {
  private gl: WebGL2RenderingContext
  private aggregationModel?: Model
  private reductionModel?: Model
  private framebuffers: Map<number, Framebuffer> = new Map()
  private textures: Map<string, Texture2D> = new Map()

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
    this.initializeShaders()
  }

  private initializeShaders() {
    // Create aggregation model
    this.aggregationModel = new Model(this.gl, {
      vs: aggregationVS,
      fs: aggregationFS,
      geometry: new Geometry({
        topology: 'point-list',
        attributes: {}
      }),
      parameters: {
        blend: true,
        blendFunc: [GL.ONE, GL.ONE],
        blendEquation: GL.FUNC_ADD,
        depthTest: false
      }
    })

    // Create reduction model for pyramid reduction
    this.reductionModel = new Model(this.gl, {
      vs: reductionVS,
      fs: reductionFS,
      geometry: new Geometry({
        topology: 'triangle-strip',
        attributes: {
          positions: {
            size: 2,
            value: new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
          }
        }
      }),
      parameters: {
        depthTest: false
      }
    })
  }

  aggregate(
    data: { position: [number, number], value: number, weight?: number }[],
    options: GPUAggregatorOptions
  ): AggregationResult {
    const { gridSize, bounds, aggregationMode } = options
    
    // Create output texture
    const outputTexture = this.createTexture(gridSize, gridSize)
    const framebuffer = this.createFramebuffer(outputTexture)
    
    // Prepare data for GPU
    const positions = new Float32Array(data.length * 2)
    const values = new Float32Array(data.length)
    const weights = new Float32Array(data.length)
    
    data.forEach((item, i) => {
      positions[i * 2] = item.position[0]
      positions[i * 2 + 1] = item.position[1]
      values[i] = item.value
      weights[i] = item.weight || 1.0
    })
    
    // Set up attributes
    this.aggregationModel!.setAttributes({
      positions: { size: 2, value: positions },
      values: { size: 1, value: values },
      weights: { size: 1, value: weights }
    })
    
    // Set uniforms
    const aggregationModeMap = { sum: 0, mean: 1, max: 2, min: 3 }
    this.aggregationModel!.setUniforms({
      boundsMin: bounds[0],
      boundsMax: bounds[1],
      gridSize: gridSize,
      aggregationMode: aggregationModeMap[aggregationMode]
    })
    
    // Render to texture
    framebuffer.bind()
    this.gl.viewport(0, 0, gridSize, gridSize)
    this.gl.clearColor(0, 0, 0, 0)
    this.gl.clear(GL.COLOR_BUFFER_BIT)
    this.aggregationModel!.draw()
    framebuffer.unbind()
    
    // Read back results (can be optimized with async readback)
    const pixels = new Float32Array(gridSize * gridSize * 4)
    framebuffer.bind()
    this.gl.readPixels(0, 0, gridSize, gridSize, GL.RGBA, GL.FLOAT, pixels)
    framebuffer.unbind()
    
    // Calculate statistics
    const stats = this.calculateStats(pixels, gridSize)
    
    // Clean up
    framebuffer.delete()
    
    return {
      gridData: pixels,
      texture: outputTexture,
      gridSize,
      bounds,
      stats
    }
  }

  pyramidReduction(
    inputTexture: Texture2D,
    reductionMode: 'sum' | 'mean' | 'max' | 'min' = 'sum'
  ): number {
    let currentTexture = inputTexture
    let currentSize = inputTexture.width
    
    const reductionModeMap = { sum: 0, mean: 1, max: 2, min: 3 }
    
    // Perform pyramid reduction until we reach 1x1
    while (currentSize > 1) {
      const nextSize = Math.max(1, Math.floor(currentSize / 2))
      const outputTexture = this.createTexture(nextSize, nextSize)
      const framebuffer = this.createFramebuffer(outputTexture)
      
      // Set uniforms
      this.reductionModel!.setUniforms({
        inputTexture: currentTexture,
        texelSize: [1 / currentSize, 1 / currentSize],
        reductionMode: reductionModeMap[reductionMode]
      })
      
      // Render
      framebuffer.bind()
      this.gl.viewport(0, 0, nextSize, nextSize)
      this.reductionModel!.draw()
      framebuffer.unbind()
      
      // Clean up previous texture if it's not the original
      if (currentTexture !== inputTexture) {
        currentTexture.delete()
      }
      
      currentTexture = outputTexture
      currentSize = nextSize
    }
    
    // Read final value
    const result = new Float32Array(4)
    const framebuffer = this.createFramebuffer(currentTexture)
    framebuffer.bind()
    this.gl.readPixels(0, 0, 1, 1, GL.RGBA, GL.FLOAT, result)
    framebuffer.unbind()
    
    // Clean up
    framebuffer.delete()
    if (currentTexture !== inputTexture) {
      currentTexture.delete()
    }
    
    return reductionMode === 'mean' ? result[0] / result[1] : result[0]
  }

  private createTexture(width: number, height: number): Texture2D {
    return new Texture2D(this.gl, {
      width,
      height,
      format: GL.RGBA32F,
      type: GL.FLOAT,
      mipmaps: false,
      parameters: {
        [GL.TEXTURE_MIN_FILTER]: GL.NEAREST,
        [GL.TEXTURE_MAG_FILTER]: GL.NEAREST,
        [GL.TEXTURE_WRAP_S]: GL.CLAMP_TO_EDGE,
        [GL.TEXTURE_WRAP_T]: GL.CLAMP_TO_EDGE
      }
    })
  }

  private createFramebuffer(texture: Texture2D): Framebuffer {
    return new Framebuffer(this.gl, {
      attachments: {
        [GL.COLOR_ATTACHMENT0]: texture
      }
    })
  }

  private calculateStats(data: Float32Array, gridSize: number) {
    let min = Infinity
    let max = -Infinity
    let sum = 0
    let count = 0
    
    for (let i = 0; i < gridSize * gridSize; i++) {
      const value = data[i * 4] // Red channel contains value
      const weight = data[i * 4 + 1] // Green channel contains weight
      
      if (weight > 0) {
        min = Math.min(min, value)
        max = Math.max(max, value)
        sum += value
        count++
      }
    }
    
    return {
      min: min === Infinity ? 0 : min,
      max: max === -Infinity ? 0 : max,
      mean: count > 0 ? sum / count : 0,
      total: sum
    }
  }

  dispose() {
    // Clean up resources
    this.aggregationModel?.delete()
    this.reductionModel?.delete()
    
    this.framebuffers.forEach(fb => fb.delete())
    this.textures.forEach(tex => tex.delete())
    
    this.framebuffers.clear()
    this.textures.clear()
  }
}*/
