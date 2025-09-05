/**
 * WebGL Frame Scheduler for Optimal Rendering Performance
 * Manages frame timing, scheduling, and adaptive quality
 */

export interface FrameStats {
  fps: number
  frameTime: number
  droppedFrames: number
  cpuTime: number
  gpuTime: number
}

export interface QualityLevel {
  level: 'ultra' | 'high' | 'medium' | 'low' | 'minimal'
  renderScale: number
  shadowQuality: number
  particleCount: number
  lodBias: number
}

/**
 * Advanced WebGL Animation Scheduler with adaptive quality
 */
export class WebGLAnimationScheduler {
  private rafId: number | null = null
  private lastFrameTime: number = 0
  private frameCount: number = 0
  private fpsHistory: number[] = []
  private readonly fpsHistorySize: number = 60
  
  // Performance metrics
  private targetFPS: number = 60
  private frameBudgetMs: number = 1000 / 60 // 16.67ms
  private adaptiveQualityEnabled: boolean = true
  private currentQualityLevel: QualityLevel
  
  // Frame timing
  private frameStartTime: number = 0
  private accumulatedTime: number = 0
  private droppedFrames: number = 0
  
  // Callbacks
  private onFrame: ((time: number, deltaTime: number, stats: FrameStats) => void) | null = null
  private onQualityChange: ((quality: QualityLevel) => void) | null = null
  
  // Quality levels
  private readonly qualityLevels: QualityLevel[] = [
    { level: 'ultra', renderScale: 1.0, shadowQuality: 1.0, particleCount: 1.0, lodBias: 0 },
    { level: 'high', renderScale: 0.9, shadowQuality: 0.8, particleCount: 0.8, lodBias: 0.5 },
    { level: 'medium', renderScale: 0.75, shadowQuality: 0.6, particleCount: 0.6, lodBias: 1.0 },
    { level: 'low', renderScale: 0.6, shadowQuality: 0.3, particleCount: 0.4, lodBias: 1.5 },
    { level: 'minimal', renderScale: 0.5, shadowQuality: 0, particleCount: 0.2, lodBias: 2.0 }
  ]
  
  private currentQualityIndex: number = 0
  
  constructor(config?: {
    targetFPS?: number
    adaptiveQuality?: boolean
    initialQuality?: QualityLevel['level']
  }) {
    this.targetFPS = config?.targetFPS || 60
    this.frameBudgetMs = 1000 / this.targetFPS
    this.adaptiveQualityEnabled = config?.adaptiveQuality !== false
    
    // Set initial quality
    const initialLevel = config?.initialQuality || 'high'
    this.currentQualityIndex = this.qualityLevels.findIndex(q => q.level === initialLevel) || 1
    this.currentQualityLevel = this.qualityLevels[this.currentQualityIndex]
  }
  
  /**
   * Start the animation loop
   */
  start(
    onFrame: (time: number, deltaTime: number, stats: FrameStats) => void,
    onQualityChange?: (quality: QualityLevel) => void
  ) {
    this.stop()
    this.onFrame = onFrame
    this.onQualityChange = onQualityChange || null
    
    this.lastFrameTime = performance.now()
    this.scheduleNextFrame()
  }
  
  /**
   * Stop the animation loop
   */
  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.onFrame = null
    this.onQualityChange = null
  }
  
  /**
   * Schedule next frame with timing control
   */
  private scheduleNextFrame() {
    this.rafId = requestAnimationFrame((time) => this.frame(time))
  }
  
  /**
   * Main frame loop with performance monitoring
   */
  private frame(time: DOMHighResTimeStamp) {
    if (!this.onFrame) return
    
    const frameStart = performance.now()
    const deltaTime = time - this.lastFrameTime
    
    // Skip frame if too early (maintain target FPS)
    if (deltaTime < this.frameBudgetMs * 0.95) {
      this.scheduleNextFrame()
      return
    }
    
    // Detect dropped frames
    if (deltaTime > this.frameBudgetMs * 1.5) {
      this.droppedFrames++
    }
    
    // Calculate FPS
    const fps = 1000 / deltaTime
    this.updateFPSHistory(fps)
    
    // Execute frame callback
    const stats = this.getFrameStats(fps, deltaTime)
    this.onFrame(time, deltaTime, stats)
    
    // Measure frame time
    const frameEnd = performance.now()
    const frameTime = frameEnd - frameStart
    
    // Adaptive quality adjustment
    if (this.adaptiveQualityEnabled && this.frameCount % 30 === 0) {
      this.adjustQuality(stats.fps)
    }
    
    this.lastFrameTime = time
    this.frameCount++
    
    // Continue loop
    this.scheduleNextFrame()
  }
  
  /**
   * Update FPS history for averaging
   */
  private updateFPSHistory(fps: number) {
    this.fpsHistory.push(fps)
    if (this.fpsHistory.length > this.fpsHistorySize) {
      this.fpsHistory.shift()
    }
  }
  
  /**
   * Get average FPS from history
   */
  private getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return this.targetFPS
    const sum = this.fpsHistory.reduce((a, b) => a + b, 0)
    return sum / this.fpsHistory.length
  }
  
  /**
   * Get current frame statistics
   */
  private getFrameStats(instantFPS: number, frameTime: number): FrameStats {
    return {
      fps: this.getAverageFPS(),
      frameTime,
      droppedFrames: this.droppedFrames,
      cpuTime: frameTime * 0.7, // Estimate
      gpuTime: frameTime * 0.3  // Estimate
    }
  }
  
  /**
   * Adjust rendering quality based on performance
   */
  private adjustQuality(avgFPS: number) {
    const targetThreshold = this.targetFPS * 0.9
    const degradeThreshold = this.targetFPS * 0.75
    
    if (avgFPS < degradeThreshold && this.currentQualityIndex < this.qualityLevels.length - 1) {
      // Degrade quality
      this.currentQualityIndex++
      this.currentQualityLevel = this.qualityLevels[this.currentQualityIndex]
      this.onQualityChange?.(this.currentQualityLevel)
      console.log(`[WebGL Scheduler] Degrading quality to ${this.currentQualityLevel.level} (FPS: ${avgFPS.toFixed(1)})`)
    } else if (avgFPS > targetThreshold && this.currentQualityIndex > 0) {
      // Improve quality
      this.currentQualityIndex--
      this.currentQualityLevel = this.qualityLevels[this.currentQualityIndex]
      this.onQualityChange?.(this.currentQualityLevel)
      console.log(`[WebGL Scheduler] Improving quality to ${this.currentQualityLevel.level} (FPS: ${avgFPS.toFixed(1)})`)
    }
  }
  
  /**
   * Force a specific quality level
   */
  setQualityLevel(level: QualityLevel['level']) {
    const index = this.qualityLevels.findIndex(q => q.level === level)
    if (index !== -1) {
      this.currentQualityIndex = index
      this.currentQualityLevel = this.qualityLevels[index]
      this.onQualityChange?.(this.currentQualityLevel)
    }
  }
  
  /**
   * Get current quality settings
   */
  getCurrentQuality(): QualityLevel {
    return this.currentQualityLevel
  }
  
  /**
   * Get performance metrics
   */
  getMetrics(): {
    averageFPS: number
    droppedFrames: number
    quality: QualityLevel
  } {
    return {
      averageFPS: this.getAverageFPS(),
      droppedFrames: this.droppedFrames,
      quality: this.currentQualityLevel
    }
  }
  
  /**
   * Reset statistics
   */
  resetStats() {
    this.droppedFrames = 0
    this.fpsHistory = []
    this.frameCount = 0
  }
}

/**
 * Frame-independent animation helper
 */
export class FrameIndependentAnimation {
  private startValue: number
  private endValue: number
  private duration: number
  private startTime: number
  private easingFn: (t: number) => number
  
  constructor(
    start: number,
    end: number,
    duration: number,
    easing: (t: number) => number = (t) => t
  ) {
    this.startValue = start
    this.endValue = end
    this.duration = duration
    this.startTime = performance.now()
    this.easingFn = easing
  }
  
  getValue(currentTime?: number): number {
    const now = currentTime || performance.now()
    const elapsed = now - this.startTime
    const progress = Math.min(elapsed / this.duration, 1)
    const easedProgress = this.easingFn(progress)
    
    return this.startValue + (this.endValue - this.startValue) * easedProgress
  }
  
  isComplete(currentTime?: number): boolean {
    const now = currentTime || performance.now()
    return (now - this.startTime) >= this.duration
  }
  
  reset(startTime?: number) {
    this.startTime = startTime || performance.now()
  }
}

/**
 * Batch update manager for efficient DOM/WebGL updates
 */
export class BatchUpdateManager {
  private updateQueue: Map<string, () => void> = new Map()
  private rafId: number | null = null
  
  /**
   * Queue an update for the next frame
   */
  queueUpdate(id: string, updateFn: () => void) {
    this.updateQueue.set(id, updateFn)
    
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => this.flush())
    }
  }
  
  /**
   * Execute all queued updates
   */
  private flush() {
    const updates = Array.from(this.updateQueue.values())
    this.updateQueue.clear()
    this.rafId = null
    
    // Execute all updates in a single frame
    updates.forEach(update => update())
  }
  
  /**
   * Cancel all pending updates
   */
  clear() {
    this.updateQueue.clear()
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }
}

// Export singleton instance for global use
export const globalScheduler = new WebGLAnimationScheduler({
  targetFPS: 60,
  adaptiveQuality: true,
  initialQuality: 'high'
})

export const batchUpdater = new BatchUpdateManager()