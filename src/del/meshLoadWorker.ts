/**
 * Web Worker for asynchronous mesh loading
 * Handles binary mesh data loading and processing off the main thread
 */

/// <reference lib="webworker" />

import type { MeshGeometry } from '../utils/meshGenerator';

// Message types for worker communication
export interface MeshLoadRequest {
  type: 'LOAD_MESH';
  resolution: number;
  useBinary?: boolean;
  useCompression?: boolean;
  useTransferables?: boolean;
}

export interface MeshLoadProgress {
  type: 'PROGRESS';
  resolution: number;
  progress: number; // 0-100
  stage: 'downloading' | 'decompressing' | 'parsing' | 'transferring';
}

export interface MeshLoadSuccess {
  type: 'SUCCESS';
  resolution: number;
  geometry: MeshGeometry;
  loadTime: number;
}

export interface MeshLoadError {
  type: 'ERROR';
  resolution: number;
  error: string;
}

export type WorkerMessage = MeshLoadRequest;
export type WorkerResponse = MeshLoadProgress | MeshLoadSuccess | MeshLoadError;

// Cache for loaded mesh data
const meshCache = new Map<number, MeshGeometry>();

/**
 * Load binary mesh data
 */
async function loadBinaryMesh(
  resolution: number, 
  useCompression: boolean,
  onProgress?: (progress: number, stage: MeshLoadProgress['stage']) => void
): Promise<MeshGeometry> {
  const startTime = performance.now();
  
  // Check cache first
  if (meshCache.has(resolution)) {
    console.log(`[Worker] Using cached mesh for resolution ${resolution}`);
    return meshCache.get(resolution)!;
  }
  
  try {
    // Load header file
    onProgress?.(10, 'downloading');
    const headerUrl = `/data/binary/seoul-mesh-${resolution}.header.json`;
    const headerResponse = await fetch(headerUrl);
    
    if (!headerResponse.ok) {
      throw new Error(`Failed to load header: ${headerResponse.status}`);
    }
    
    const header = await headerResponse.json();
    onProgress?.(20, 'downloading');
    
    // Load binary data
    const binaryUrl = useCompression 
      ? `/data/binary/seoul-mesh-${resolution}.bin.gz`
      : `/data/binary/seoul-mesh-${resolution}.bin`;
    
    const binaryResponse = await fetch(binaryUrl);
    
    if (!binaryResponse.ok) {
      throw new Error(`Failed to load binary data: ${binaryResponse.status}`);
    }
    
    onProgress?.(50, 'downloading');
    
    // Get binary data
    let arrayBuffer: ArrayBuffer;
    
    if (useCompression) {
      onProgress?.(60, 'decompressing');
      // Decompress if needed (requires DecompressionStream API)
      if ('DecompressionStream' in self) {
        const stream = binaryResponse.body!
          .pipeThrough(new DecompressionStream('gzip'));
        const response = new Response(stream);
        arrayBuffer = await response.arrayBuffer();
      } else {
        // Fallback: server should handle decompression
        arrayBuffer = await binaryResponse.arrayBuffer();
      }
    } else {
      arrayBuffer = await binaryResponse.arrayBuffer();
    }
    
    onProgress?.(80, 'parsing');
    
    // Parse binary data according to header offsets
    const dataView = new DataView(arrayBuffer);
    const geometry: MeshGeometry = {
      metadata: header.metadata
    };
    
    // Extract positions - create a copy to avoid shared ArrayBuffer
    if (header.offsets.positions) {
      const { offset, count, itemSize } = header.offsets.positions;
      const view = new Float32Array(
        arrayBuffer,
        offset,
        count * itemSize
      );
      // Create a copy with its own ArrayBuffer
      geometry.positions = new Float32Array(view);
    }
    
    // Extract normals - create a copy to avoid shared ArrayBuffer
    if (header.offsets.normals) {
      const { offset, count, itemSize } = header.offsets.normals;
      const view = new Float32Array(
        arrayBuffer,
        offset,
        count * itemSize
      );
      // Create a copy with its own ArrayBuffer
      geometry.normals = new Float32Array(view);
    }
    
    // Extract texCoords - create a copy to avoid shared ArrayBuffer
    if (header.offsets.texCoords) {
      const { offset, count, itemSize } = header.offsets.texCoords;
      const view = new Float32Array(
        arrayBuffer,
        offset,
        count * itemSize
      );
      // Create a copy with its own ArrayBuffer
      geometry.texCoords = new Float32Array(view);
    }
    
    // Extract colors - create a copy to avoid shared ArrayBuffer
    if (header.offsets.colors) {
      const { offset, count, itemSize } = header.offsets.colors;
      const view = new Float32Array(
        arrayBuffer,
        offset,
        count * itemSize
      );
      // Create a copy with its own ArrayBuffer
      geometry.colors = new Float32Array(view);
    }
    
    // Extract indices - create a copy to avoid shared ArrayBuffer
    if (header.offsets.indices) {
      const { offset, count } = header.offsets.indices;
      const view = new Uint32Array(
        arrayBuffer,
        offset,
        count
      );
      // Create a copy with its own ArrayBuffer
      geometry.indices = new Uint32Array(view);
    }
    
    onProgress?.(100, 'transferring');
    
    // Cache the result
    meshCache.set(resolution, geometry);
    
    const loadTime = performance.now() - startTime;
    console.log(`[Worker] Loaded mesh resolution ${resolution} in ${loadTime.toFixed(2)}ms`);
    
    return geometry;
    
  } catch (error) {
    console.error(`[Worker] Failed to load binary mesh:`, error);
    // Fall back to JSON loading if binary fails
    return loadJSONMesh(resolution, onProgress);
  }
}

/**
 * Load JSON mesh data (fallback)
 */
async function loadJSONMesh(
  resolution: number,
  onProgress?: (progress: number, stage: MeshLoadProgress['stage']) => void
): Promise<MeshGeometry> {
  const startTime = performance.now();
  
  try {
    onProgress?.(10, 'downloading');
    const url = `/data/seoul-mesh-${resolution}.json`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to load mesh: ${response.status}`);
    }
    
    onProgress?.(50, 'downloading');
    const data = await response.json();
    
    onProgress?.(80, 'parsing');
    
    // Convert to TypedArrays
    const geometry: MeshGeometry = {
      positions: new Float32Array(data.positions),
      normals: new Float32Array(data.normals),
      texCoords: new Float32Array(data.texCoords),
      metadata: data.metadata
    };
    
    if (data.colors) {
      geometry.colors = new Float32Array(data.colors);
    }
    
    if (data.indices) {
      geometry.indices = new Uint32Array(data.indices);
    }
    
    onProgress?.(100, 'transferring');
    
    const loadTime = performance.now() - startTime;
    console.log(`[Worker] Loaded JSON mesh resolution ${resolution} in ${loadTime.toFixed(2)}ms`);
    
    return geometry;
    
  } catch (error) {
    throw new Error(`Failed to load mesh data: ${error}`);
  }
}

/**
 * Handle worker messages
 */
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { data } = event;
  
  if (data.type === 'LOAD_MESH') {
    const { resolution, useBinary = true, useCompression = true, useTransferables = false } = data;
    
    try {
      console.log(`[Worker] Loading mesh resolution ${resolution}...`);
      
      // Progress callback
      const sendProgress = (progress: number, stage: MeshLoadProgress['stage']) => {
        const progressMsg: MeshLoadProgress = {
          type: 'PROGRESS',
          resolution,
          progress,
          stage
        };
        self.postMessage(progressMsg);
      };
      
      // Load mesh data
      const startTime = performance.now();
      const geometry = useBinary
        ? await loadBinaryMesh(resolution, useCompression, sendProgress)
        : await loadJSONMesh(resolution, sendProgress);
      
      const loadTime = performance.now() - startTime;
      
      // Prepare transferable arrays - use Set to avoid duplicates
      const transferableSet = new Set<Transferable>();
      
      // Create response with transferable objects
      const response: MeshLoadSuccess = {
        type: 'SUCCESS',
        resolution,
        geometry,
        loadTime
      };
      
      // Add TypedArray buffers to transferables for zero-copy transfer
      // Use Set to automatically handle duplicate ArrayBuffers
      if (geometry.positions?.buffer) {
        transferableSet.add(geometry.positions.buffer);
      }
      if (geometry.normals?.buffer) {
        transferableSet.add(geometry.normals.buffer);
      }
      if (geometry.texCoords?.buffer) {
        transferableSet.add(geometry.texCoords.buffer);
      }
      if (geometry.colors?.buffer) {
        transferableSet.add(geometry.colors.buffer);
      }
      if (geometry.indices?.buffer) {
        transferableSet.add(geometry.indices.buffer);
      }
      
      // Send response - with or without transferables based on configuration
      if (useTransferables) {
        // Convert Set to Array for postMessage
        const transferables = Array.from(transferableSet);
        
        // Send response with transferable objects
        if (transferables.length > 0) {
          try {
            self.postMessage(response, transferables);
          } catch (error) {
            // Fallback: send without transferables if transfer fails
            console.warn('[Worker] Transfer failed, sending without transferables:', error);
            self.postMessage(response);
          }
        } else {
          self.postMessage(response);
        }
      } else {
        // Send without transferables (safer but slightly slower)
        self.postMessage(response);
      }
      
    } catch (error) {
      const errorMsg: MeshLoadError = {
        type: 'ERROR',
        resolution,
        error: error instanceof Error ? error.message : String(error)
      };
      self.postMessage(errorMsg);
    }
  }
});

// Export for TypeScript (won't actually be used in worker context)
export default {};