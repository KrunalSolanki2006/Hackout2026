import { apiClient } from './client';

export const recommendationsApi = {
  get: (assessmentId, params) => apiClient.getRecommendations(assessmentId, params),
  apply: (assessmentId, recId, phase) => apiClient.applyRecommendation(assessmentId, recId, phase),
  dismiss: (assessmentId, recId) => apiClient.dismissRecommendation(assessmentId, recId),
};
