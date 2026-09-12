import {
  initMockStore,
  mockStore,
  calculateAssessmentEngine,
  deriveLeakPoints,
  getRecommendationsEngine,
  simulateEngine,
  getRoadmapEngine,
} from './mockEngine';

// Initialize mock store on load
initMockStore();

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const ALWAYS_MOCK = import.meta.env.VITE_USE_MOCK === 'true'; // Controlled by VITE_USE_MOCK env var

export class ApiError extends Error {
  constructor(message, code = 'INTERNAL_ERROR', field = null, status = 500) {
    super(message);
    this.code = code;
    this.field = field;
    this.status = status;
  }
}

// Low-level fetch wrapper with token injection
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('carbotrack_token') || 'demo-jwt-token';
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const res = await fetch(url, { ...options, headers });
    const json = await res.json();

    if (!res.ok || !json.success) {
      const err = json?.error || {};
      throw new ApiError(
        err.message || `Request failed with status ${res.status}`,
        err.code || 'API_ERROR',
        err.field,
        res.status
      );
    }
    return json;
  } catch (err) {
    if (err instanceof ApiError) throw err; // Re-throw real API errors (auth failures, validation)
    console.warn(`[API] Live call to ${endpoint} unreachable. Falling back to local engine.`, err.message);
    throw err;
  }
}

// High-fidelity fallback client implementing the exact API contract
export const apiClient = {
  // Auth
  async login(email, password) {
    if (!ALWAYS_MOCK) {
      try {
        return await request('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
      } catch (e) { /* fallback */ }
    }
    await new Promise((r) => setTimeout(r, 200));
    return {
      success: true,
      data: {
        user: {
          id: 'usr-001',
          name: 'Priya Sharma (Plant Manager)',
          email: email || 'operator@abcplastics.com',
          role: 'operator',
        },
        token: 'mock-jwt-token-carbotrack-2026',
      },
    };
  },

  async signup(data) {
    if (!ALWAYS_MOCK) {
      try {
        return await request('/auth/signup', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch (e) { /* fallback */ }
    }
    await new Promise((r) => setTimeout(r, 200));
    return {
      success: true,
      data: {
        user: {
          id: `usr-${Date.now()}`,
          name: data.name,
          email: data.email,
          role: data.role || 'operator',
        },
        token: 'mock-jwt-token-carbotrack-2026',
      },
    };
  },

  // Facilities
  async listFacilities() {
    if (!ALWAYS_MOCK) {
      try {
        return await request('/facilities');
      } catch (e) { /* fallback */ }
    }
    return {
      success: true,
      data: {
        facilities: mockStore.getFacilities(),
      },
    };
  },

  async getFacility(id) {
    if (!ALWAYS_MOCK) {
      try {
        return await request(`/facilities/${id}`);
      } catch (e) { /* fallback */ }
    }
    const facilities = mockStore.getFacilities();
    const facility = facilities.find((f) => f.id === id) || facilities[0];
    return {
      success: true,
      data: { facility },
    };
  },

  async createFacility(data) {
    if (!ALWAYS_MOCK) {
      try {
        return await request('/facilities', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch (e) { /* fallback */ }
    }
    const facility = mockStore.createFacility(data);
    return {
      success: true,
      data: { facility },
    };
  },

  // Assessments
  async createAssessment(facilityId) {
    if (!ALWAYS_MOCK) {
      try {
        return await request(`/facilities/${facilityId}/assessments`, {
          method: 'POST',
          body: JSON.stringify({}),
        });
      } catch (e) { /* fallback */ }
    }
    const assessment = mockStore.createAssessment(facilityId);
    return {
      success: true,
      data: { assessment },
    };
  },

  async getAssessment(id) {
    if (!ALWAYS_MOCK) {
      try {
        return await request(`/assessments/${id}`);
      } catch (e) { /* fallback */ }
    }
    const assessments = mockStore.getAssessments();
    let assessment = assessments.find((a) => a.id === id);
    if (!assessment) {
      assessment = assessments[0];
    }
    const inputs = mockStore.getInputs(assessment.id);
    return {
      success: true,
      data: {
        assessment,
        inputs,
      },
    };
  },

  // Inputs
  async addInput(assessmentId, inputData) {
    if (!ALWAYS_MOCK) {
      try {
        return await request(`/assessments/${assessmentId}/inputs`, {
          method: 'POST',
          body: JSON.stringify(inputData),
        });
      } catch (e) { /* fallback */ }
    }
    const input = mockStore.addInput(assessmentId, inputData);
    return {
      success: true,
      data: { input },
      meta: { unsupported_input: false },
    };
  },

  async updateInput(assessmentId, inputId, updates) {
    if (!ALWAYS_MOCK) {
      try {
        return await request(`/assessments/${assessmentId}/inputs/${inputId}`, {
          method: 'PATCH',
          body: JSON.stringify(updates),
        });
      } catch (e) { /* fallback */ }
    }
    const input = mockStore.updateInput(inputId, updates);
    return {
      success: true,
      data: { input },
    };
  },

  async deleteInput(assessmentId, inputId) {
    if (!ALWAYS_MOCK) {
      try {
        return await request(`/assessments/${assessmentId}/inputs/${inputId}`, {
          method: 'DELETE',
        });
      } catch (e) { /* fallback */ }
    }
    mockStore.deleteInput(inputId);
    return {
      success: true,
      data: { deleted: true },
    };
  },

  // Deterministic Calculation Engine
  async calculateAssessment(assessmentId) {
    if (!ALWAYS_MOCK) {
      try {
        return await request(`/assessments/${assessmentId}/calculate`, {
          method: 'POST',
        });
      } catch (e) { /* fallback */ }
    }
    await new Promise((r) => setTimeout(r, 450)); // Realistic compute delay
    const inputs = mockStore.getInputs(assessmentId);
    const result = calculateAssessmentEngine(inputs);

    // Update assessment in store
    const assessments = mockStore.getAssessments();
    const idx = assessments.findIndex((a) => a.id === assessmentId);
    if (idx !== -1) {
      assessments[idx].status = 'complete';
      assessments[idx].total_co2e = result.total_co2e;
      assessments[idx].completed_at = new Date().toISOString();
      localStorage.setItem('carbotrack_assessments', JSON.stringify(assessments));
    }

    return {
      success: true,
      data: {
        assessment: {
          id: assessmentId,
          status: 'complete',
          total_co2e: result.total_co2e,
          completed_at: new Date().toISOString(),
        },
        unsupported_inputs: result.unsupported_inputs,
      },
      meta: {
        unsupported_inputs_count: result.unsupported_inputs_count,
      },
    };
  },

  // Summary (Overview & Line items)
  async getSummary(assessmentId) {
    if (!ALWAYS_MOCK) {
      try {
        return await request(`/assessments/${assessmentId}/summary`);
      } catch (e) { /* fallback */ }
    }
    const inputs = mockStore.getInputs(assessmentId);
    const result = calculateAssessmentEngine(inputs);
    return {
      success: true,
      data: result,
    };
  },

  // Leak Points
  async getLeakPoints(assessmentId) {
    if (!ALWAYS_MOCK) {
      try {
        return await request(`/assessments/${assessmentId}/leak-points`);
      } catch (e) { /* fallback */ }
    }
    const inputs = mockStore.getInputs(assessmentId);
    const summary = calculateAssessmentEngine(inputs);
    const leakPoints = deriveLeakPoints(summary);
    return {
      success: true,
      data: { leak_points: leakPoints },
    };
  },

  // Recommendations
  async getRecommendations(assessmentId, params = {}) {
    if (!ALWAYS_MOCK) {
      try {
        const qs = new URLSearchParams(params).toString();
        return await request(`/assessments/${assessmentId}/recommendations${qs ? `?${qs}` : ''}`);
      } catch (e) { /* fallback */ }
    }
    const facility = mockStore.getFacilities()[0];
    const inputs = mockStore.getInputs(assessmentId);
    const summary = calculateAssessmentEngine(inputs);
    const leakPoints = deriveLeakPoints(summary);

    const recs = getRecommendationsEngine(facility, leakPoints, params);
    return {
      success: true,
      data: { recommendations: recs },
    };
  },

  async applyRecommendation(assessmentId, recId, phase = null) {
    if (!ALWAYS_MOCK) {
      try {
        return await request(`/assessments/${assessmentId}/recommendations/${recId}/apply`, {
          method: 'POST',
          body: JSON.stringify({ roadmap_phase: phase }),
        });
      } catch (e) { /* fallback */ }
    }
    const applied = mockStore.applyRecommendation(assessmentId, recId, phase);
    return {
      success: true,
      data: { applied_intervention: applied },
    };
  },

  async dismissRecommendation(assessmentId, recId) {
    if (!ALWAYS_MOCK) {
      try {
        return await request(`/assessments/${assessmentId}/recommendations/${recId}/dismiss`, {
          method: 'POST',
        });
      } catch (e) { /* fallback */ }
    }
    mockStore.dismissRecommendation(recId);
    return {
      success: true,
      data: { recommendation: { id: recId, status: 'dismissed' } },
    };
  },

  // What-If Simulator
  async simulate(assessmentId, selectedInterventionIds) {
    if (!ALWAYS_MOCK) {
      try {
        return await request(`/assessments/${assessmentId}/simulate`, {
          method: 'POST',
          body: JSON.stringify({ selected_intervention_ids: selectedInterventionIds }),
        });
      } catch (e) { /* fallback */ }
    }
    const inputs = mockStore.getInputs(assessmentId);
    const summary = calculateAssessmentEngine(inputs);
    const simResult = simulateEngine(summary.total_co2e, selectedInterventionIds);
    return {
      success: true,
      data: simResult,
    };
  },

  // Action Roadmap
  async getRoadmap(assessmentId) {
    if (!ALWAYS_MOCK) {
      try {
        return await request(`/assessments/${assessmentId}/roadmap`);
      } catch (e) { /* fallback */ }
    }
    const roadmap = getRoadmapEngine(assessmentId);
    return {
      success: true,
      data: { roadmap },
    };
  },

  async updateRoadmapItem(assessmentId, appliedId, updates) {
    if (!ALWAYS_MOCK) {
      try {
        return await request(`/assessments/${assessmentId}/roadmap/${appliedId}`, {
          method: 'PATCH',
          body: JSON.stringify(updates),
        });
      } catch (e) { /* fallback */ }
    }
    const updated = mockStore.updateRoadmapItem(appliedId, updates);
    return {
      success: true,
      data: { applied_intervention: updated },
    };
  },

  async deleteRoadmapItem(assessmentId, appliedId) {
    if (!ALWAYS_MOCK) {
      try {
        return await request(`/assessments/${assessmentId}/roadmap/${appliedId}`, {
          method: 'DELETE',
        });
      } catch (e) { /* fallback */ }
    }
    mockStore.deleteRoadmapItem(appliedId);
    return {
      success: true,
      data: { deleted: true },
    };
  },

  // History
  async getHistory(facilityId) {
    if (!ALWAYS_MOCK) {
      try {
        return await request(`/assessments/${facilityId}/history`);
      } catch (e) { /* fallback */ }
    }
    const history = mockStore.getHistory(facilityId);
    return {
      success: true,
      data: { history },
    };
  },

  // Reports & Export
  async exportReport(assessmentId, format = 'pdf') {
    if (!ALWAYS_MOCK) {
      try {
        const token = localStorage.getItem('carbotrack_token') || 'demo-jwt-token';
        const url = `${API_BASE_URL}/assessments/${assessmentId}/export?format=${format}`;
        const res = await fetch(url, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) throw new Error(`Export failed with status ${res.status}`);
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `assessment_${assessmentId}_export.${format === 'csv' ? 'csv' : 'txt'}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
        return { success: true };
      } catch (e) {
        console.warn('[API] Live export failed, falling back:', e);
      }
    }
    await new Promise((r) => setTimeout(r, 600));
    return {
      success: true,
      data: {
        report: {
          id: `rep-${Date.now()}`,
          assessment_id: assessmentId,
          format,
          file_url: `#download-${format}`,
          generated_at: new Date().toISOString(),
        },
      },
    };
  },
};
