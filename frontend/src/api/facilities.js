import { apiClient } from './client';

export const facilitiesApi = {
  list: () => apiClient.listFacilities(),
  getById: (id) => apiClient.getFacility(id),
  create: (data) => apiClient.createFacility(data),
};
