import { useState, useCallback, useEffect } from 'react';

interface UseApiOptions<T> {
  immediate?: boolean;
  initialData?: T | null;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export function useApi<T, P extends any[] = any[]>(
  apiFunc: (...args: P) => Promise<T>,
  initialParams?: P,
  options?: UseApiOptions<T>
) {
  const [data, setData] = useState<T | null>(options?.initialData ?? null);
  const [loading, setLoading] = useState<boolean>(options?.immediate ?? false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (...args: P): Promise<T | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiFunc(...args);
        setData(result);
        if (options?.onSuccess) {
          options.onSuccess(result);
        }
        return result;
      } catch (err: any) {
        const errorMsg = err?.message || 'An error occurred';
        setError(errorMsg);
        if (options?.onError) {
          options.onError(err instanceof Error ? err : new Error(errorMsg));
        }
        return null;
      } finally {
        setLoading(false);
      }
    },
    [apiFunc, options]
  );

  useEffect(() => {
    if (options?.immediate && initialParams) {
      execute(...initialParams);
    }
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    setData,
    setError,
  };
}
