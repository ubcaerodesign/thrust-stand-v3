import { useRef, useCallback } from 'react';

export function useCanvasPlotBuffer<T>(maxPoints: number = 300) {
  const buffer = useRef<T[]>([]);

  const appendSample = useCallback((sample: T) => {
    buffer.current.push(sample);
    if (buffer.current.length > maxPoints) {
      buffer.current.shift();
    }
  }, [maxPoints]);

  const clear = useCallback(() => {
    buffer.current = [];
  }, []);

  return { buffer, appendSample, clear };
}