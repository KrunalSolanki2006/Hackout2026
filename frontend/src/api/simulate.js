import { apiClient } from './client';

export const simulateApi = {
  run: (assessmentId, selectedIds) => apiClient.simulate(assessmentId, selectedIds),
};
