import { apiClient } from './client';

export const assessmentsApi = {
  create: (facilityId) => apiClient.createAssessment(facilityId),
  getById: (id) => apiClient.getAssessment(id),
  addInput: (assessmentId, input) => apiClient.addInput(assessmentId, input),
  updateInput: (assessmentId, inputId, updates) => apiClient.updateInput(assessmentId, inputId, updates),
  deleteInput: (assessmentId, inputId) => apiClient.deleteInput(assessmentId, inputId),
  calculate: (assessmentId) => apiClient.calculateAssessment(assessmentId),
  getSummary: (assessmentId) => apiClient.getSummary(assessmentId),
  getLeakPoints: (assessmentId) => apiClient.getLeakPoints(assessmentId),
  getHistory: (facilityId) => apiClient.getHistory(facilityId),
  addHistoryRecord: (record) => apiClient.addHistoryRecord(record),
  saveInputs: (assessmentId, inputs) => apiClient.saveInputs(assessmentId, inputs),
  exportReport: (assessmentId, format) => apiClient.exportReport(assessmentId, format),
  setPassword: (assessmentId, password) => apiClient.setAssessmentPassword(assessmentId, password),
  getPassword: (assessmentId) => apiClient.getAssessmentPassword(assessmentId),
  verifyPassword: (assessmentId, password, currentUser) => apiClient.verifyAssessmentAccess(assessmentId, password, currentUser),
};
