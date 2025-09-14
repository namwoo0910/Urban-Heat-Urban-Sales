/**
 * GPU Performance Metrics Hook
 * Monitors and reports GPU utilization and performance metrics for deck.gl layers
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export interface GPUMetrics {
  fps: number;
  frameTime: number;
  gpuTime: number;
  cpuTime: number;
  drawCalls: number;
  triangles: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

export interface UseGPUMetricsOptions {
  enabled?: boolean;
  sampleRate?: number; // How often to sample metrics (ms)
  logToConsole?: boolean;
  warnThreshold?: {
    fps?: number;
    frameTime?: number;
    memoryPercentage?: number;
  };
}

/**
 * Hook for monitoring GPU performance metrics
 */
export function useGPUMetrics(options: UseGPUMetricsOptions = {}) {
  const {
    enabled = true,
    sampleRate = 1000, // Sample every second
    logToConsole = false,
    warnThreshold = {
      fps: 30,
      frameTime: 33, // ~30fps
      memoryPercentage: 80
    }
  } = options;

  const [metrics, setMetrics] = useState<GPUMetrics>({
    fps: 0,
    frameTime: 0,
    gpuTime: 0,
    cpuTime: 0,
    drawCalls: 0,
    triangles: 0,
    memory: {
      used: 0,
      total: 0,
      percentage: 0
    }
  });

  const [isMonitoring, setIsMonitoring] = useState(false);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const rafIdRef = useRef<number | undefined>(undefined);

  // Calculate FPS and frame time
  const measurePerformance = useCallback(() => {
    const now = performance.now();
    const deltaTime = now - lastTimeRef.current;
    
    frameCountRef.current++;
    
    if (deltaTime >= sampleRate) {
      const fps = (frameCountRef.current / deltaTime) * 1000;
      const frameTime = deltaTime / frameCountRef.current;
      
      // Get GPU memory info if available (Chrome only)
      let memoryInfo = { used: 0, total: 0, percentage: 0 };
      if ('memory' in performance) {
        const perfMemory = (performance as any).memory;
        if (perfMemory) {
          memoryInfo = {
            used: perfMemory.usedJSHeapSize / (1024 * 1024), // Convert to MB
            total: perfMemory.jsHeapSizeLimit / (1024 * 1024),
            percentage: (perfMemory.usedJSHeapSize / perfMemory.jsHeapSizeLimit) * 100
          };
        }
      }
      
      const newMetrics: GPUMetrics = {
        fps: Math.round(fps),
        frameTime: Math.round(frameTime * 100) / 100,
        gpuTime: 0, // Would require WebGL extension
        cpuTime: frameTime, // Approximation
        drawCalls: 0, // Would require deck.gl internal access
        triangles: 0, // Would require deck.gl internal access
        memory: memoryInfo
      };
      
      setMetrics(newMetrics);
      
      // Log warnings if thresholds are exceeded
      if (warnThreshold) {
        if (warnThreshold.fps && fps < warnThreshold.fps) {
          console.warn(`⚠️ GPU Performance: Low FPS detected (${Math.round(fps)} fps)`);
        }
        if (warnThreshold.frameTime && frameTime > warnThreshold.frameTime) {
          console.warn(`⚠️ GPU Performance: High frame time detected (${frameTime.toFixed(2)}ms)`);
        }
        if (warnThreshold.memoryPercentage && memoryInfo.percentage > warnThreshold.memoryPercentage) {
          console.warn(`⚠️ GPU Performance: High memory usage (${memoryInfo.percentage.toFixed(1)}%)`);
        }
      }
      
      // Log to console if enabled
      if (logToConsole) {
        console.log('📊 GPU Metrics:', {
          fps: `${Math.round(fps)} fps`,
          frameTime: `${frameTime.toFixed(2)}ms`,
          memory: `${memoryInfo.used.toFixed(0)}MB / ${memoryInfo.total.toFixed(0)}MB (${memoryInfo.percentage.toFixed(1)}%)`
        });
      }
      
      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }
    
    if (enabled) {
      rafIdRef.current = requestAnimationFrame(measurePerformance);
    }
  }, [enabled, sampleRate, logToConsole, warnThreshold]);

  // Start/stop monitoring
  useEffect(() => {
    if (enabled) {
      setIsMonitoring(true);
      rafIdRef.current = requestAnimationFrame(measurePerformance);
    } else {
      setIsMonitoring(false);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    }
    
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [enabled, measurePerformance]);

  // Get deck.gl specific metrics
  const getDeckGLMetrics = useCallback((deckInstance: any) => {
    if (!deckInstance || !deckInstance.metrics) {
      return null;
    }
    
    const deckMetrics = deckInstance.metrics;
    
    return {
      fps: deckMetrics.fps || 0,
      gpuTime: deckMetrics.gpuTime || 0,
      cpuTime: deckMetrics.cpuTime || 0,
      frameCount: deckMetrics.frameCount || 0
    };
  }, []);

  // Performance optimization suggestions
  const getOptimizationSuggestions = useCallback(() => {
    const suggestions: string[] = [];
    
    if (metrics.fps < 30) {
      suggestions.push('Consider reducing polygon complexity or layer count');
    }
    
    if (metrics.frameTime > 16.67) {
      suggestions.push('Enable GPU aggregation for data layers');
    }
    
    if (metrics.memory.percentage > 70) {
      suggestions.push('Reduce data size or enable data filtering');
    }
    
    return suggestions;
  }, [metrics]);

  return {
    metrics,
    isMonitoring,
    getDeckGLMetrics,
    getOptimizationSuggestions
  };
}

/**
 * GPU Metrics Display Component
 */
export function GPUMetricsDisplay({ metrics }: { metrics: GPUMetrics }) {
  const getFPSColor = (fps: number) => {
    if (fps >= 50) return '#10b981'; // green
    if (fps >= 30) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono z-50">
      <div className="text-xs font-bold mb-2">GPU Metrics</div>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span>FPS:</span>
          <span style={{ color: getFPSColor(metrics.fps) }}>{metrics.fps}</span>
        </div>
        <div className="flex justify-between">
          <span>Frame:</span>
          <span>{metrics.frameTime.toFixed(2)}ms</span>
        </div>
        <div className="flex justify-between">
          <span>Memory:</span>
          <span>{metrics.memory.percentage.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}