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
        
        vec3 animateVertex(vec3 position) {
          // Wave effect based on X and Y coordinates
          float waveX = sin(position.x * waveFrequency + animationTime * waveSpeed);
          float waveY = cos(position.y * waveFrequency * 0.7 + animationTime * waveSpeed * 0.5);
          
          // Combined wave effect
          float wave = (waveX + waveY * 0.5) * waveAmplitude;
          
          // Breathing effect
          float breathing = sin(animationTime * 0.3) * breathingScale * waveAmplitude;
          
          // Apply to Z coordinate only for height animation
          vec3 animatedPos = position;
          animatedPos.z += wave + breathing;
          
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