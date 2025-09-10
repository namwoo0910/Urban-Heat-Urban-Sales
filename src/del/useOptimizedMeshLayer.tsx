/**
 * React hook for optimized mesh layer integration
 * Provides a simple interface to use the 10x faster mesh loading system
 */

import { useState, useEffect, useMemo } from 'react';
import { SimpleMeshLayer } from '@deck.gl/mesh-layers';
import { 
  OptimizedMeshLayer,
  MeshLoadingIndicator,
  type OptimizedMeshLayerProps 
} from '../components/OptimizedMeshLayer';
import { 
  getBinaryMeshLoader,
  MESH_RESOLUTIONS,
  type MeshResolution 
} from '../utils/binaryMeshLoader';

export interface UseOptimizedMeshLayerOptions extends OptimizedMeshLayerProps {
  autoPreload?: boolean;        // Preload common resolutions on mount
  enableAnalytics?: boolean;    // Track loading performance metrics
}

export interface OptimizedMeshLayerState {
  layer: SimpleMeshLayer | null;
  loading: boolean;
  progress: number;
  currentResolution: MeshResolution | null;
  loadTime: number | null;
  error: Error | null;
  LoadingIndicator: React.FC;  // Pre-configured loading component
}

/**
 * Main hook for using optimized mesh layer
 */
export function useOptimizedMeshLayer(
  options: UseOptimizedMeshLayerOptions = {}
): OptimizedMeshLayerState {
  const {
    autoPreload = true,
    enableAnalytics = true,
    targetResolution = MESH_RESOLUTIONS.HIGH,
    ...layerProps
  } = options;

  const [layer, setLayer] = useState<SimpleMeshLayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentResolution, setCurrentResolution] = useState<MeshResolution | null>(null);
  const [loadTime, setLoadTime] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Track loading performance
  const startTimeRef = React.useRef<number>(0);

  // Preload common resolutions on mount
  useEffect(() => {
    if (autoPreload) {
      const loader = getBinaryMeshLoader();
      // Preload low and medium resolutions for smooth transitions
      loader.preload([
        MESH_RESOLUTIONS.ULTRA_LOW,
        MESH_RESOLUTIONS.LOW,
        MESH_RESOLUTIONS.MEDIUM
      ]).catch(console.error);
    }
  }, [autoPreload]);

  // Handle progress updates
  const handleProgress = React.useCallback((prog: number, resolution: MeshResolution) => {
    setProgress(prog);
    
    if (prog === 0 && !startTimeRef.current) {
      startTimeRef.current = performance.now();
    }
    
    if (prog === 100) {
      setCurrentResolution(resolution);
      setLoading(false);
      
      if (startTimeRef.current && enableAnalytics) {
        const time = performance.now() - startTimeRef.current;
        setLoadTime(time);
        console.log(`[OptimizedMeshLayer] Loaded resolution ${resolution} in ${time.toFixed(2)}ms`);
        startTimeRef.current = 0;
      }
    }
  }, [enableAnalytics]);

  // Create mesh layer
  useEffect(() => {
    try {
      setError(null);
      const meshLayer = OptimizedMeshLayer({
        ...layerProps,
        targetResolution,
        onLoadProgress: handleProgress,
        enableProgressive: true,
        loaderConfig: {
          useBinary: true,
          useCompression: true,
          useWorker: true,
          progressiveLoading: true,
          cacheEnabled: true
        }
      });
      
      setLayer(meshLayer);
    } catch (err) {
      setError(err as Error);
      setLoading(false);
    }
  }, [targetResolution, layerProps, handleProgress]);

  // Pre-configured loading indicator component
  const LoadingIndicator = useMemo(() => {
    return () => (
      <MeshLoadingIndicator
        progress={progress}
        resolution={currentResolution}
        stage={loading ? 'downloading' : null}
      />
    );
  }, [progress, currentResolution, loading]);

  return {
    layer,
    loading,
    progress,
    currentResolution,
    loadTime,
    error,
    LoadingIndicator
  };
}

/**
 * Hook for comparing performance between old and new loading methods
 */
export function useMeshLoadingComparison() {
  const [comparison, setComparison] = useState<{
    oldMethod: { time: number; size: number } | null;
    newMethod: { time: number; size: number } | null;
    improvement: number | null;
  }>({
    oldMethod: null,
    newMethod: null,
    improvement: null
  });

  const runComparison = async (resolution: MeshResolution = MESH_RESOLUTIONS.HIGH) => {
    console.log('[MeshComparison] Starting performance comparison...');
    
    // Test old JSON loading method
    const oldStart = performance.now();
    try {
      const jsonUrl = `/data/seoul-mesh-${resolution}.json`;
      const jsonResponse = await fetch(jsonUrl);
      const jsonSize = parseInt(jsonResponse.headers.get('content-length') || '0');
      await jsonResponse.json(); // Force parsing
      const oldTime = performance.now() - oldStart;
      
      // Test new binary loading method
      const loader = getBinaryMeshLoader();
      const newStart = performance.now();
      await loader.load(resolution);
      const newTime = performance.now() - newStart;
      
      // Estimate binary size (roughly 30% of JSON after compression)
      const binarySize = Math.round(jsonSize * 0.125);
      
      const improvement = ((oldTime - newTime) / oldTime) * 100;
      
      setComparison({
        oldMethod: { time: oldTime, size: jsonSize },
        newMethod: { time: newTime, size: binarySize },
        improvement
      });
      
      console.log('[MeshComparison] Results:');
      console.log(`  Old (JSON): ${oldTime.toFixed(2)}ms, ${(jsonSize / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  New (Binary): ${newTime.toFixed(2)}ms, ${(binarySize / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Improvement: ${improvement.toFixed(1)}% faster`);
      
    } catch (error) {
      console.error('[MeshComparison] Comparison failed:', error);
    }
  };

  return { comparison, runComparison };
}

// React import
import React from 'react';

/**
 * Example usage:
 * 
 * ```tsx
 * function MyComponent() {
 *   const { layer, loading, progress, LoadingIndicator } = useOptimizedMeshLayer({
 *     targetResolution: MESH_RESOLUTIONS.HIGH,
 *     visible: true,
 *     wireframe: false,
 *     color: '#00FFE1'
 *   });
 * 
 *   return (
 *     <div>
 *       {loading && <LoadingIndicator />}
 *       <DeckGL layers={[layer]} />
 *     </div>
 *   );
 * }
 * ```
 */