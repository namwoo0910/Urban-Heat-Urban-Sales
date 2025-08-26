/**
 * Custom WebGL Gradient Layer with Full GPU Acceleration
 * Implements shader-based gradient calculations for maximum performance
 * Based on deck.gl's Layer class for direct GPU control
 */

import { Layer, LayerProps, UpdateParameters, LayerContext } from '@deck.gl/core'
import { Model, Geometry } from '@luma.gl/engine'

export interface GPUGradientData {
  dongCode: string
  dongName: string
  center: [number, number]
  value: number
  boundaryIndices?: number[] // Indices for boundary vertices
}

export interface CustomWebGLGradientLayerProps extends LayerProps {
  data: GPUGradientData[]
  // Visual parameters
  gradientRadius?: number
  gradientPower?: number
  colorDomain?: [number, number]
  colorRange?: [number, number, number, number][]
  opacity?: number
  // Performance parameters
  useTextureData?: boolean
  maxTextureSize?: number
  enableLOD?: boolean
  // Callbacks
  onHover?: (info: any) => void
  onClick?: (info: any) => void
}

// Vertex shader with gradient calculation
const vs = `\
#version 300 es
#define SHADER_NAME custom-webgl-gradient-layer-vertex

in vec3 positions;
in vec2 positions64xyLow;
in float instanceValues;
in vec2 instanceCenters;
in float instanceRadii;

out float vGradientFactor;
out float vValue;

void main(void) {
  geometry.worldPosition = positions;
  
  // Calculate distance from center in world space
  vec2 worldPos = positions.xy;
  vec2 center = instanceCenters;
  float distance = length(worldPos - center);
  
  // Calculate gradient factor (0 at center, 1 at boundary)
  float radius = instanceRadii;
  vGradientFactor = smoothstep(0.0, radius, distance);
  vValue = instanceValues;
  
  // Project position
  vec3 pos = vec3(positions.xy, 0.0);
  vec4 position_commonspace = project_position(pos);
  gl_Position = project_common_position_to_clipspace(position_commonspace);
  
  DECKGL_FILTER_GL_POSITION(gl_Position, geometry);
}
`

// Fragment shader with gradient coloring
const fs = `\
#version 300 es
precision highp float;
#define SHADER_NAME custom-webgl-gradient-layer-fragment

uniform sampler2D colorTexture;
uniform vec2 colorDomain;
uniform float opacity;
uniform float gradientPower;

in float vGradientFactor;
in float vValue;

out vec4 fragColor;

vec3 valueToColor(float value) {
  // Normalize value to 0-1 range
  float normalizedValue = (value - colorDomain.x) / (colorDomain.y - colorDomain.x);
  normalizedValue = clamp(normalizedValue, 0.0, 1.0);
  
  // Sample from color texture or use procedural gradient
  vec4 color = texture(colorTexture, vec2(normalizedValue, 0.5));
  
  return color.rgb;
}

void main(void) {
  // Apply gradient power curve
  float gradientFactor = pow(vGradientFactor, gradientPower);
  
  // Get base color from value
  vec3 baseColor = valueToColor(vValue);
  
  // Apply gradient fade
  float alpha = opacity * (1.0 - gradientFactor * 0.8);
  
  fragColor = vec4(baseColor, alpha);
  
  DECKGL_FILTER_COLOR(fragColor, geometry);
}
`

// Optimized vertex shader for texture-based data
const vsTexture = `\
#version 300 es
#define SHADER_NAME custom-webgl-gradient-texture-vertex

in vec3 positions;
in vec2 texCoords;

uniform sampler2D dataTexture;
uniform int textureWidth;

out float vGradientFactor;
out float vValue;
out vec2 vTexCoord;

void main(void) {
  vTexCoord = texCoords;
  
  // Read data from texture
  int pixelIndex = gl_InstanceID;
  int x = pixelIndex % textureWidth;
  int y = pixelIndex / textureWidth;
  vec2 texCoord = vec2(float(x) + 0.5, float(y) + 0.5) / float(textureWidth);
  
  vec4 data = texture(dataTexture, texCoord);
  vec2 center = data.xy;
  float value = data.z;
  float radius = data.w;
  
  // Calculate gradient
  float distance = length(positions.xy - center);
  vGradientFactor = smoothstep(0.0, radius, distance);
  vValue = value;
  
  // Project position
  gl_Position = project_common_position_to_clipspace(vec4(positions, 1.0));
}
`

// Fragment shader for texture-based rendering
const fsTexture = `\
#version 300 es
precision highp float;
#define SHADER_NAME custom-webgl-gradient-texture-fragment

uniform sampler2D colorTexture;
uniform sampler2D dataTexture;
uniform vec2 colorDomain;
uniform float opacity;
uniform float gradientPower;

in float vGradientFactor;
in float vValue;
in vec2 vTexCoord;

out vec4 fragColor;

void main(void) {
  // Read additional data if needed
  vec4 data = texture(dataTexture, vTexCoord);
  
  // Apply gradient power curve
  float gradientFactor = pow(vGradientFactor, gradientPower);
  
  // Sample color based on value
  float normalizedValue = (vValue - colorDomain.x) / (colorDomain.y - colorDomain.x);
  vec4 color = texture(colorTexture, vec2(normalizedValue, 0.5));
  
  // Apply gradient fade
  float alpha = opacity * (1.0 - gradientFactor * 0.8);
  
  fragColor = vec4(color.rgb, alpha);
  
  DECKGL_FILTER_COLOR(fragColor, geometry);
}
`

export class CustomWebGLGradientLayer extends Layer<CustomWebGLGradientLayerProps> {
  static layerName = 'CustomWebGLGradientLayer'
  static defaultProps = {
    gradientRadius: 2000,
    gradientPower: 2.0,
    colorDomain: [0, 1],
    colorRange: [
      [0, 0, 255, 255],     // Blue (low)
      [0, 255, 255, 255],   // Cyan
      [0, 255, 0, 255],     // Green
      [255, 255, 0, 255],   // Yellow
      [255, 0, 0, 255]      // Red (high)
    ],
    opacity: 0.8,
    useTextureData: true,
    maxTextureSize: 4096,
    enableLOD: true
  }

  state!: {
    model: Model
    dataTexture?: any // Simplified for compatibility
    colorTexture?: any // Simplified for compatibility
    attributeManager: any
  }

  getShaders() {
    const { useTextureData } = this.props
    return {
      vs: useTextureData ? vsTexture : vs,
      fs: useTextureData ? fsTexture : fs,
      modules: ['project32', 'picking']
    }
  }

  initializeState(context: LayerContext) {
    const { gl } = context
    
    // Check WebGL2 support
    if (!gl || !(gl instanceof WebGL2RenderingContext)) {
      throw new Error('CustomWebGLGradientLayer requires WebGL2')
    }

    // Create attribute manager for efficient updates
    const attributeManager = this.getAttributeManager()
    
    if (!this.props.useTextureData) {
      // Traditional attribute-based approach
      attributeManager.add({
        positions: {
          size: 3,
          type: 5130, // GL.DOUBLE
          fp64: this.use64bitPositions(),
          accessor: 'getPosition'
        },
        instanceValues: {
          size: 1,
          accessor: 'getValue',
          defaultValue: 0
        },
        instanceCenters: {
          size: 2,
          accessor: 'getCenter'
        },
        instanceRadii: {
          size: 1,
          accessor: 'getRadius',
          defaultValue: this.props.gradientRadius
        }
      })
    }

    // Create color gradient texture
    this.createColorTexture(gl as WebGL2RenderingContext)
    
    // Create data texture if using texture-based approach
    if (this.props.useTextureData) {
      this.createDataTexture(gl as WebGL2RenderingContext)
    }
  }

  createColorTexture(gl: WebGL2RenderingContext) {
    const { colorRange } = this.props
    const textureWidth = 256
    const pixels = new Uint8Array(textureWidth * 4)
    
    // Create gradient in texture
    for (let i = 0; i < textureWidth; i++) {
      const t = i / (textureWidth - 1)
      const color = this.interpolateColor(t, colorRange!)
      const offset = i * 4
      pixels[offset] = color[0]
      pixels[offset + 1] = color[1]
      pixels[offset + 2] = color[2]
      pixels[offset + 3] = color[3]
    }
    
    this.state.colorTexture = new Texture2D(gl, {
      width: textureWidth,
      height: 1,
      format: GL.RGBA,
      type: GL.UNSIGNED_BYTE,
      data: pixels,
      mipmaps: false,
      parameters: {
        [GL.TEXTURE_MIN_FILTER]: GL.LINEAR,
        [GL.TEXTURE_MAG_FILTER]: GL.LINEAR,
        [GL.TEXTURE_WRAP_S]: GL.CLAMP_TO_EDGE,
        [GL.TEXTURE_WRAP_T]: GL.CLAMP_TO_EDGE
      }
    })
  }

  createDataTexture(gl: WebGL2RenderingContext) {
    const { data, maxTextureSize = 4096 } = this.props
    
    // Calculate texture dimensions
    const dataCount = data.length
    const textureWidth = Math.min(dataCount, maxTextureSize)
    const textureHeight = Math.ceil(dataCount / textureWidth)
    
    // Pack data into texture (RGBA = center.x, center.y, value, radius)
    const pixels = new Float32Array(textureWidth * textureHeight * 4)
    
    data.forEach((item, index) => {
      const offset = index * 4
      pixels[offset] = item.center[0]
      pixels[offset + 1] = item.center[1]
      pixels[offset + 2] = item.value
      pixels[offset + 3] = this.props.gradientRadius || 2000
    })
    
    this.state.dataTexture = new Texture2D(gl, {
      width: textureWidth,
      height: textureHeight,
      format: GL.RGBA32F,
      type: GL.FLOAT,
      data: pixels,
      mipmaps: false,
      parameters: {
        [GL.TEXTURE_MIN_FILTER]: GL.NEAREST,
        [GL.TEXTURE_MAG_FILTER]: GL.NEAREST,
        [GL.TEXTURE_WRAP_S]: GL.CLAMP_TO_EDGE,
        [GL.TEXTURE_WRAP_T]: GL.CLAMP_TO_EDGE
      }
    })
  }

  interpolateColor(t: number, colorRange: [number, number, number, number][]) {
    const numColors = colorRange.length
    if (numColors === 0) return [0, 0, 0, 0]
    if (numColors === 1) return colorRange[0]
    
    const scaledT = t * (numColors - 1)
    const index = Math.floor(scaledT)
    const fraction = scaledT - index
    
    if (index >= numColors - 1) return colorRange[numColors - 1]
    
    const color1 = colorRange[index]
    const color2 = colorRange[index + 1]
    
    return [
      Math.round(color1[0] + (color2[0] - color1[0]) * fraction),
      Math.round(color1[1] + (color2[1] - color1[1]) * fraction),
      Math.round(color1[2] + (color2[2] - color1[2]) * fraction),
      Math.round(color1[3] + (color2[3] - color1[3]) * fraction)
    ]
  }

  updateState(params: UpdateParameters<this>) {
    super.updateState(params)
    
    const { props, oldProps } = params
    
    // Update textures if data changed
    if (props.data !== oldProps.data && props.useTextureData) {
      this.createDataTexture(this.context.gl as WebGL2RenderingContext)
    }
    
    // Update color texture if color range changed
    if (props.colorRange !== oldProps.colorRange) {
      this.createColorTexture(this.context.gl as WebGL2RenderingContext)
    }
  }

  draw({ uniforms }: any) {
    const { 
      gradientPower = 2.0, 
      opacity = 0.8,
      colorDomain = [0, 1]
    } = this.props
    
    // Set uniforms
    const customUniforms = {
      ...uniforms,
      gradientPower,
      opacity,
      colorDomain
    }
    
    // Bind textures
    if (this.state.colorTexture) {
      customUniforms.colorTexture = this.state.colorTexture
    }
    
    if (this.state.dataTexture && this.props.useTextureData) {
      customUniforms.dataTexture = this.state.dataTexture
      customUniforms.textureWidth = this.state.dataTexture.width
    }
    
    // Draw model
    if (this.state.model) {
      this.state.model.setUniforms(customUniforms)
      this.state.model.draw(this.context.renderPass)
    }
  }

  // Accessors for attribute-based rendering
  getPosition(d: GPUGradientData) {
    return d.center
  }

  getValue(d: GPUGradientData) {
    return d.value
  }

  getCenter(d: GPUGradientData) {
    return d.center
  }

  getRadius(d: GPUGradientData) {
    return this.props.gradientRadius
  }
}