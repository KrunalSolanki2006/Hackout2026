import { useState, useEffect, useCallback } from 'react';
import { assessmentsApi } from '../api/assessments';

export function useHistory(facilityId) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHistory = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await assessmentsApi.getHistory(facilityId);
      setHistory(res.data.history || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch assessment history');
    } finally {
      setLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { history, loading, error, refetch: fetchHistory };
}
