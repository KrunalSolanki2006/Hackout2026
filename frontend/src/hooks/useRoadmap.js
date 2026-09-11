import { useState, useEffect, useCallback } from 'react';
import { roadmapApi } from '../api/roadmap';

export function useRoadmap(assessmentId) {
  const [roadmap, setRoadmap] = useState({ phase_1: [], phase_2: [], phase_3: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRoadmap = useCallback(async () => {
    if (!assessmentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await roadmapApi.get(assessmentId);
      setRoadmap(res.data.roadmap || { phase_1: [], phase_2: [], phase_3: [] });
    } catch (err) {
      setError(err.message || 'Failed to fetch roadmap');
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    fetchRoadmap();
  }, [fetchRoadmap]);

  const updateItem = async (appliedId, updates) => {
    try {
      await roadmapApi.update(assessmentId, appliedId, updates);
      await fetchRoadmap();
      return true;
    } catch (e) {
      throw e;
    }
  };

  const removeItem = async (appliedId) => {
    try {
      await roadmapApi.delete(assessmentId, appliedId);
      await fetchRoadmap();
      return true;
    } catch (e) {
      throw e;
    }
  };

  return { roadmap, loading, error, refetch: fetchRoadmap, updateItem, removeItem };
}
