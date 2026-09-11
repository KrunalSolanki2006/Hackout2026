import { useState, useEffect, useCallback } from 'react';
import { recommendationsApi } from '../api/recommendations';

export function useRecommendations(assessmentId, filters = {}) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRecs = useCallback(async () => {
    if (!assessmentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await recommendationsApi.get(assessmentId, filters);
      setRecommendations(res.data.recommendations || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch recommendations');
    } finally {
      setLoading(false);
    }
  }, [assessmentId, filters.leak_point, filters.category]);

  useEffect(() => {
    fetchRecs();
  }, [fetchRecs]);

  const apply = async (recId, phase = null) => {
    try {
      await recommendationsApi.apply(assessmentId, recId, phase);
      setRecommendations((prev) =>
        prev.map((r) => (r.recommendation_id === recId ? { ...r, status: 'applied' } : r))
      );
      return true;
    } catch (e) {
      throw e;
    }
  };

  const dismiss = async (recId) => {
    try {
      await recommendationsApi.dismiss(assessmentId, recId);
      setRecommendations((prev) =>
        prev.map((r) => (r.recommendation_id === recId ? { ...r, status: 'dismissed' } : r))
      );
      return true;
    } catch (e) {
      throw e;
    }
  };

  return { recommendations, loading, error, refetch: fetchRecs, apply, dismiss };
}
