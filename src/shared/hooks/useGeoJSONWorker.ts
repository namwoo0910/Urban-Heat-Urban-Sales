import { useEffect, useRef, useState, useCallback } from 'react';

interface WorkerMessage {
  type: 'parse' | 'filter' | 'simplify';
  data: any;
  id: string;
}

interface WorkerResponse {
  type: 'result' | 'error';
  data: any;
  id: string;
}

export function useGeoJSONWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pendingCallbacks = useRef<Map<string, (data: any) => void>>(new Map());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Create worker
    workerRef.current = new Worker(
      new URL('@/src/shared/utils/geojson-worker.ts', import.meta.url),
      { type: 'module' }
    );

    // Handle messages from worker
    workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { type, data, id } = event.data;
      const callback = pendingCallbacks.current.get(id);
      
      if (callback) {
        if (type === 'result') {
          callback(data);
        } else {
          console.error('Worker error:', data);
          callback(null);
        }
        pendingCallbacks.current.delete(id);
      }
    };

    workerRef.current.onerror = (error) => {
      console.error('Worker error:', error);
    };

    setIsReady(true);

    // Cleanup
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      setIsReady(false);
    };
  }, []);

  const parseGeoJSON = useCallback((jsonString: string): Promise<any> => {
    return new Promise((resolve) => {
      if (!workerRef.current) {
        // Fallback to main thread
        try {
          resolve(JSON.parse(jsonString));
        } catch (e) {
          console.error('Parse error:', e);
          resolve(null);
        }
        return;
      }

      const id = Math.random().toString(36).substr(2, 9);
      pendingCallbacks.current.set(id, resolve);
      
      const message: WorkerMessage = {
        type: 'parse',
        data: jsonString,
        id
      };
      
      workerRef.current.postMessage(message);
    });
  }, []);

  const filterByBounds = useCallback((geojson: any, bounds: [[number, number], [number, number]]): Promise<any> => {
    return new Promise((resolve) => {
      if (!workerRef.current) {
        // Fallback to main thread (simplified version)
        resolve(geojson);
        return;
      }

      const id = Math.random().toString(36).substr(2, 9);
      pendingCallbacks.current.set(id, resolve);
      
      const message: WorkerMessage = {
        type: 'filter',
        data: { geojson, bounds },
        id
      };
      
      workerRef.current.postMessage(message);
    });
  }, []);

  return {
    isReady,
    parseGeoJSON,
    filterByBounds
  };
}