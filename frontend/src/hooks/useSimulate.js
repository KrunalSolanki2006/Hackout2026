import { useState, useCallback } from 'react';
import { simulateApi } from '../api/simulate';

export function useSimulate(assessmentId) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const simulate = useCallback(
    async (selectedIds) => {
      if (!assessmentId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await simulateApi.run(assessmentId, selectedIds);
        setResult(res.data);
        return res.data;
      } catch (err) {
        setError(err.message || 'Simulation calculation failed');
      } finally {
        setLoading(false);
      }
    },
    [assessmentId]
  );

  return { result, loading, error, simulate };
}
