/**
 * AnimatedMeshLayer - GPU-accelerated vertex animation for mesh
 * Extends SimpleMeshLayer with custom vertex shader for wave effects
 */

import { SimpleMeshLayer } from '@deck.gl/mesh-layers'
import type { SimpleMeshLayerProps } from '@deck.gl/mesh-layers'

export interface AnimatedMeshLayerProps extends SimpleMeshLayerProps<any> {
  // Animation parameters
  animationTime?: number
  waveAmplitude?: number
  waveFrequency?: number
  waveSpeed?: number
  breathingScale?: number
}

export class AnimatedMeshLayer extends SimpleMeshLayer<any, AnimatedMeshLayerProps> {
  static layerName = 'AnimatedMeshLayer'
  
  // Default props
  static defaultProps = {
    ...SimpleMeshLayer.defaultProps,
    animationTime: 0,
    waveAmplitude: 30,
    waveFrequency: 0.01,
    waveSpeed: 1,
    breathingScale: 0.1
  }
  
  getShaders() {
    const shaders = super.getShaders()
    
    // Inject animation uniforms and functions
    shaders.inject = {
      'vs:#decl': `
        uniform float animationTime;
        uniform float waveAmplitude;
        uniform float waveFrequency;
        uniform float waveSpeed;
        uniform float breathingScale;
        
        // Improved noise function for turbulence
        float noise(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }
        
        vec3 animateVertex(vec3 position) {
          // Multi-layer wave system with different frequencies
          // Primary wave - large scale undulation
          float wave1 = sin(position.x * waveFrequency + animationTime * waveSpeed) * 0.5;
          float wave2 = cos(position.y * waveFrequency * 0.7 + animationTime * waveSpeed * 0.8) * 0.5;
          
          // Secondary wave - medium frequency
          float wave3 = sin((position.x + position.y) * waveFrequency * 2.0 + animationTime * waveSpeed * 1.5) * 0.3;
          
          // Tertiary wave - high frequency ripples
          float wave4 = sin(position.x * waveFrequency * 4.0 + animationTime * waveSpeed * 2.0) * 0.15;
          float wave5 = cos(position.y * waveFrequency * 3.5 + animationTime * waveSpeed * 2.2) * 0.15;
          
          // Ripple effect from center (circular waves)
          float dist = length(position.xy);
          float ripple = sin(dist * 0.01 - animationTime * waveSpeed * 0.5) * 0.3;
          
          // Turbulence using noise
          float turbulence = noise(position.xy * 0.01 + animationTime * 0.1) * 0.2;
          
          // Combined wave effect with weighted blending
          float combinedWave = (wave1 + wave2) * 0.4 + wave3 * 0.3 + (wave4 + wave5) * 0.2 + ripple * 0.3 + turbulence;
          
          // Enhanced breathing effect with varying speed
          float breathing1 = sin(animationTime * 0.3) * breathingScale;
          float breathing2 = cos(animationTime * 0.2) * breathingScale * 0.5;
          float totalBreathing = (breathing1 + breathing2) * 0.7;
          
          // Height modulation based on position (creates interesting patterns)
          float heightModulation = 1.0 + sin(position.x * 0.001 + position.y * 0.001) * 0.2;
          
          // Apply all effects to Z coordinate
          vec3 animatedPos = position;
          animatedPos.z += (combinedWave * waveAmplitude + totalBreathing * waveAmplitude) * heightModulation;
          
          // Add subtle XY displacement for more organic feel
          animatedPos.x += sin(animationTime * 0.15 + position.y * 0.001) * waveAmplitude * 0.02;
          animatedPos.y += cos(animationTime * 0.15 + position.x * 0.001) * waveAmplitude * 0.02;
          
          return animatedPos;
        }
      `,
      // Inject into color filter which runs earlier in the pipeline
      'vs:DECKGL_FILTER_COLOR': `
        // Animate vertex position before any transformations
        geometry.worldPosition = animateVertex(geometry.worldPosition);
        geometry.position = vec4(geometry.worldPosition, 1.0);
      `,
      // Also ensure the position is properly set for gl_Position
      'vs:DECKGL_FILTER_GL_POSITION': `
        // Ensure animated position is used for final transformation
        geometry.position = vec4(geometry.worldPosition, 1.0);
        gl_Position = geometry.position;
      `
    }
    
    return shaders
  }
  
  draw(params: any) {
    const { animationTime, waveAmplitude, waveFrequency, waveSpeed, breathingScale } = this.props
    
    // Pass animation uniforms to shader
    const uniforms = {
      ...params.uniforms,
      animationTime: animationTime || 0,
      waveAmplitude: waveAmplitude || 30,
      waveFrequency: waveFrequency || 0.01,
      waveSpeed: waveSpeed || 1,
      breathingScale: breathingScale || 0.1
    }
    
    super.draw({ ...params, uniforms })
  }
}

export default AnimatedMeshLayer