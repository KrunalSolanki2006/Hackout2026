import { apiClient } from './client';

export const roadmapApi = {
  get: (assessmentId) => apiClient.getRoadmap(assessmentId),
  update: (assessmentId, appliedId, updates) => apiClient.updateRoadmapItem(assessmentId, appliedId, updates),
  delete: (assessmentId, appliedId) => apiClient.deleteRoadmapItem(assessmentId, appliedId),
};
