import { useState, useEffect, useCallback } from 'react';
import { assessmentsApi } from '../api/assessments';

export function useLeakPoints(assessmentId) {
  const [leakPoints, setLeakPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLeakPoints = useCallback(async () => {
    if (!assessmentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await assessmentsApi.getLeakPoints(assessmentId);
      setLeakPoints(res.data.leak_points || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch leak points');
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    fetchLeakPoints();
  }, [fetchLeakPoints]);

  return { leakPoints, loading, error, refetch: fetchLeakPoints };
}
