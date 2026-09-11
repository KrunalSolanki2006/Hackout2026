import { useState, useEffect, useCallback } from 'react';
import { assessmentsApi } from '../api/assessments';

export function useAssessmentSummary(assessmentId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = useCallback(async () => {
    if (!assessmentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await assessmentsApi.getSummary(assessmentId);
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load assessment summary');
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { data, loading, error, refetch: fetchSummary };
}
