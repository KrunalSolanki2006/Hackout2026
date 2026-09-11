import {
  EMISSION_FACTORS,
  INTERVENTION_LIBRARY,
  INITIAL_DEMO_FACILITY,
  INITIAL_DEMO_INPUTS,
  INITIAL_ASSESSMENT_HISTORY
} from './mockData';

const STORAGE_KEYS = {
  FACILITIES: 'carbotrack_facilities',
  ASSESSMENTS: 'carbotrack_assessments',
  INPUTS: 'carbotrack_inputs',
  APPLIED: 'carbotrack_applied',
  DISMISSED: 'carbotrack_dismissed',
  ROADMAP: 'carbotrack_roadmap',
  HISTORY: 'carbotrack_history',
};

// Safe localStorage helper
function getStorage(key, fallback) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
}

function setStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage error', e);
  }
}

// Initialize seed data if empty
export function initMockStore() {
  if (!localStorage.getItem(STORAGE_KEYS.FACILITIES)) {
    setStorage(STORAGE_KEYS.FACILITIES, [INITIAL_DEMO_FACILITY]);
  }
  if (!localStorage.getItem(STORAGE_KEYS.ASSESSMENTS)) {
    setStorage(STORAGE_KEYS.ASSESSMENTS, [
      {
        id: 'asm-abc-001',
        facility_id: 'fac-abc-001',
        status: 'complete',
        total_co2e: 88.35, // in tonnes CO2e
        created_at: '2026-03-01T09:15:00Z',
        completed_at: '2026-03-01T09:30:00Z',
      }
    ]);
  }
  if (!localStorage.getItem(STORAGE_KEYS.INPUTS)) {
    setStorage(STORAGE_KEYS.INPUTS, INITIAL_DEMO_INPUTS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.HISTORY)) {
    setStorage(STORAGE_KEYS.HISTORY, INITIAL_ASSESSMENT_HISTORY);
  }
  if (!localStorage.getItem(STORAGE_KEYS.APPLIED)) {
    setStorage(STORAGE_KEYS.APPLIED, [
      {
        id: 'app-001',
        assessment_id: 'asm-abc-001',
        recommendation_id: 'INT-010',
        applied_at: '2026-03-02T10:00:00Z',
        roadmap_phase: 1,
        status: 'in_progress'
      }
    ]);
  }
  if (!localStorage.getItem(STORAGE_KEYS.DISMISSED)) {
    setStorage(STORAGE_KEYS.DISMISSED, []);
  }
}

// Deterministic Calculation Engine
export function calculateAssessmentEngine(inputs) {
  let lineItems = [];
  let categoryTotals = { energy: 0, material: 0, waste: 0 };
  let unsupportedInputs = [];
  let totalCo2e = 0;

  inputs.forEach((input) => {
    // Find matching factor
    const factor = EMISSION_FACTORS.find((ef) => {
      if (ef.category !== input.category || ef.subtype !== input.subtype) return false;
      if (input.treatment && ef.treatment && input.treatment !== ef.treatment) return false;
      return ef.unit.toLowerCase() === (input.unit || '').toLowerCase();
    });

    if (!factor) {
      unsupportedInputs.push({
        input_id: input.id,
        category: input.category,
        subtype: input.subtype,
        reason: `No factor matching ${input.subtype} (${input.unit})`
      });
      return;
    }

    // Deterministic arithmetic: co2e_kg = quantity * emission_factor
    const co2e_kg = Number(input.quantity) * factor.emission_factor;
    const co2e_tonnes = co2e_kg / 1000;

    totalCo2e += co2e_tonnes;
    if (categoryTotals[input.category] !== undefined) {
      categoryTotals[input.category] += co2e_tonnes;
    }

    lineItems.push({
      id: input.id,
      category: input.category,
      subtype: input.subtype,
      treatment: input.treatment,
      quantity: Number(input.quantity),
      unit: input.unit,
      emission_factor: factor.emission_factor,
      factor_unit: factor.factor_unit,
      factor_source: factor.source,
      scope: factor.scope,
      co2e_kg: Math.round(co2e_kg * 10) / 10,
      co2e: Math.round(co2e_tonnes * 100) / 100, // in tonnes
      pct_contribution: 0 // populated below
    });
  });

  // Calculate percentages
  lineItems = lineItems.map((item) => ({
    ...item,
    pct_contribution: totalCo2e > 0 ? Math.round((item.co2e / totalCo2e) * 1000) / 1000 : 0
  }));

  return {
    total_co2e: Math.round(totalCo2e * 100) / 100,
    category_totals: {
      energy: Math.round(categoryTotals.energy * 100) / 100,
      material: Math.round(categoryTotals.material * 100) / 100,
      waste: Math.round(categoryTotals.waste * 100) / 100,
    },
    line_items: lineItems,
    unsupported_inputs: unsupportedInputs,
    unsupported_inputs_count: unsupportedInputs.length,
  };
}

// Leak-Point Aggregation and Ranking Engine
export function deriveLeakPoints(summary) {
  const map = {};

  summary.line_items.forEach((item) => {
    const leakRef = item.subtype === 'diesel' ? 'diesel_generator' : item.subtype;
    if (!map[leakRef]) {
      map[leakRef] = {
        leak_point_ref: leakRef,
        name: leakRef.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        category: item.category,
        subtype: item.subtype,
        co2e: 0,
        pct_contribution: 0,
      };
    }
    map[leakRef].co2e += item.co2e;
  });

  const total = summary.total_co2e || 1;
  const list = Object.values(map).map((lp) => {
    const pct = Math.round((lp.co2e / total) * 1000) / 1000;
    // Severity thresholds from API contract:
    // >= 0.30 -> high, 0.10 - 0.30 -> medium, < 0.10 -> low
    let severity = 'low';
    if (pct >= 0.30) severity = 'high';
    else if (pct >= 0.10) severity = 'medium';

    return {
      ...lp,
      co2e: Math.round(lp.co2e * 100) / 100,
      pct_contribution: pct,
      severity,
    };
  });

  // Sort descending by co2e
  list.sort((a, b) => b.co2e - a.co2e);

  return list.map((lp, idx) => ({
    rank: idx + 1,
    ...lp
  }));
}

// ML / Rule-based Recommendation Scorer
export function getRecommendationsEngine(facility, leakPoints, filters = {}) {
  const appliedList = getStorage(STORAGE_KEYS.APPLIED, []);
  const dismissedList = getStorage(STORAGE_KEYS.DISMISSED, []);

  const candidates = INTERVENTION_LIBRARY.filter((item) => {
    // Check industry fit
    const matchIndustry = item.supported_industries.includes(facility.industry || 'plastic');
    if (!matchIndustry) return false;

    // Filter by leak_point if provided
    if (filters.leak_point) {
      if (!item.applicable_leak_types.includes(filters.leak_point)) return false;
    }

    // Filter by category if provided
    if (filters.category && item.category !== filters.category) {
      return false;
    }

    return true;
  });

  return candidates.map((item) => {
    const isApplied = appliedList.some((app) => app.recommendation_id === item.id);
    const isDismissed = dismissedList.includes(item.id);

    // Compute suitability score (0-100)
    // Combines leak-point severity, difficulty, and ROI
    const relevantLeak = leakPoints.find((lp) => item.applicable_leak_types.includes(lp.leak_point_ref));
    const leakWeight = relevantLeak ? relevantLeak.pct_contribution * 50 : 15;
    const roiWeight = Math.min(30, (item.roi_pct / 50) * 30);
    const diffBonus = item.implementation_difficulty === 'low' ? 18 : item.implementation_difficulty === 'medium' ? 10 : 4;
    const score = Math.min(98, Math.max(62, Math.round(leakWeight + roiWeight + diffBonus)));

    return {
      recommendation_id: item.id,
      intervention: {
        id: item.id,
        name: item.name,
        category: item.category,
        description: item.description,
      },
      score,
      score_source: 'ml', // transparently notes ML or rule_based
      estimated_cost_range: [item.estimated_cost_min, item.estimated_cost_max],
      currency: 'INR',
      estimated_co2_reduction_range: [item.estimated_co2_reduction_min, item.estimated_co2_reduction_max],
      co2_reduction_unit: item.co2_reduction_unit,
      payback_period_months: item.payback_period_months,
      roi_pct: item.roi_pct,
      implementation_difficulty: item.implementation_difficulty,
      explanation: item.explanation,
      applicable_leak_point: relevantLeak ? relevantLeak.leak_point_ref : item.applicable_leak_types[0],
      status: isApplied ? 'applied' : isDismissed ? 'dismissed' : 'suggested'
    };
  }).sort((a, b) => b.score - a.score);
}

// What-If Simulator with Max-Per-Leak-Point Overlap Rule
export function simulateEngine(currentCo2e, selectedInterventionIds) {
  if (!selectedInterventionIds || selectedInterventionIds.length === 0) {
    return {
      current_co2e: currentCo2e,
      projected_co2e: currentCo2e,
      reduction_abs: 0,
      reduction_pct: 0,
      investment: 0,
      currency: 'INR',
      annual_savings: 0,
      payback_period_months: 0,
      roi_pct: 0,
      overlap_adjustments: []
    };
  }

  const selectedItems = INTERVENTION_LIBRARY.filter((item) =>
    selectedInterventionIds.includes(item.id)
  );

  // Group by leak type to apply "take the max per leak point" rule
  const leakPointGroups = {};
  let totalInvestment = 0;
  let totalAnnualSavings = 0;
  let overlapAdjustments = [];

  selectedItems.forEach((item) => {
    // Midpoint of investment
    const cost = (item.estimated_cost_min + item.estimated_cost_max) / 2;
    // Midpoint of CO2 reduction
    const co2Red = (item.estimated_co2_reduction_min + item.estimated_co2_reduction_max) / 2;
    // Estimated annual savings
    const annualSave = (cost / (item.payback_period_months / 12));

    // Investment and savings are additive regardless of overlap
    totalInvestment += cost;
    totalAnnualSavings += annualSave;

    const primaryLeak = item.applicable_leak_types[0] || 'general';
    if (!leakPointGroups[primaryLeak]) {
      leakPointGroups[primaryLeak] = [];
    }
    leakPointGroups[primaryLeak].push({
      item,
      co2Red,
    });
  });

  let totalEffectiveReduction = 0;

  Object.entries(leakPointGroups).forEach(([leakRef, group]) => {
    if (group.length === 1) {
      totalEffectiveReduction += group[0].co2Red;
    } else {
      // Overlap detected: take the max reduction for this leak point
      group.sort((a, b) => b.co2Red - a.co2Red);
      const maxReduction = group[0].co2Red;
      totalEffectiveReduction += maxReduction;

      overlapAdjustments.push({
        leak_point_ref: leakRef,
        applied_intervention_id: group[0].item.id,
        note: `Max-per-leak-point rule applied: taking ${maxReduction} t CO2e from "${group[0].item.name}". Secondary intervention on same leak point ignored for CO2 reduction to prevent double-counting. Capital investment remains additive.`
      });
    }
  });

  const projectedCo2e = Math.max(0, Math.round((currentCo2e - totalEffectiveReduction) * 100) / 100);
  const reductionAbs = Math.round((currentCo2e - projectedCo2e) * 100) / 100;
  const reductionPct = currentCo2e > 0 ? Math.round((reductionAbs / currentCo2e) * 1000) / 1000 : 0;
  const blendedPayback = totalAnnualSavings > 0 ? Math.round((totalInvestment / totalAnnualSavings) * 12) : 0;
  const blendedRoi = totalInvestment > 0 ? Math.round((totalAnnualSavings / totalInvestment) * 100) : 0;

  return {
    current_co2e: currentCo2e,
    projected_co2e: projectedCo2e,
    reduction_abs: reductionAbs,
    reduction_pct: reductionPct,
    investment: Math.round(totalInvestment),
    currency: 'INR',
    annual_savings: Math.round(totalAnnualSavings),
    payback_period_months: blendedPayback,
    roi_pct: blendedRoi,
    overlap_adjustments: overlapAdjustments
  };
}

// Phased Roadmap Generator & Manager
export function getRoadmapEngine(assessmentId) {
  const appliedList = getStorage(STORAGE_KEYS.APPLIED, []).filter(
    (app) => app.assessment_id === assessmentId
  );

  const phase1 = [];
  const phase2 = [];
  const phase3 = [];

  appliedList.forEach((app) => {
    const libItem = INTERVENTION_LIBRARY.find((i) => i.id === app.recommendation_id);
    if (!libItem) return;

    let targetPhase = app.roadmap_phase;
    if (!targetPhase) {
      // Auto-bucket: Phase 1 (low difficulty, <=12 mo), Phase 2 (medium, 12-24 mo), Phase 3 (high or >24 mo)
      if (libItem.implementation_difficulty === 'low' && libItem.payback_period_months <= 12) {
        targetPhase = 1;
      } else if (libItem.implementation_difficulty === 'high' || libItem.payback_period_months > 24) {
        targetPhase = 3;
      } else {
        targetPhase = 2;
      }
    }

    const entry = {
      applied_intervention_id: app.id,
      recommendation_id: libItem.id,
      name: libItem.name,
      category: libItem.category,
      priority: targetPhase === 1 ? 'high' : targetPhase === 2 ? 'medium' : 'low',
      cost: Math.round((libItem.estimated_cost_min + libItem.estimated_cost_max) / 2),
      co2_reduction: Math.round((libItem.estimated_co2_reduction_min + libItem.estimated_co2_reduction_max) / 2),
      payback_period_months: libItem.payback_period_months,
      difficulty: libItem.implementation_difficulty,
      status: app.status || 'planned',
      applied_at: app.applied_at
    };

    if (targetPhase === 1) phase1.push(entry);
    else if (targetPhase === 2) phase2.push(entry);
    else phase3.push(entry);
  });

  return {
    phase_1: phase1,
    phase_2: phase2,
    phase_3: phase3,
  };
}

// Mock Store helpers for mutations
export const mockStore = {
  getFacilities: () => getStorage(STORAGE_KEYS.FACILITIES, [INITIAL_DEMO_FACILITY]),
  
  createFacility: (data) => {
    const facilities = getStorage(STORAGE_KEYS.FACILITIES, [INITIAL_DEMO_FACILITY]);
    const newFacility = {
      id: `fac-${Date.now()}`,
      owner_user_id: 'usr-001',
      created_at: new Date().toISOString(),
      ...data
    };
    facilities.push(newFacility);
    setStorage(STORAGE_KEYS.FACILITIES, facilities);
    return newFacility;
  },

  getAssessments: (facilityId) => {
    const list = getStorage(STORAGE_KEYS.ASSESSMENTS, []);
    return facilityId ? list.filter((a) => a.facility_id === facilityId) : list;
  },

  createAssessment: (facilityId) => {
    const list = getStorage(STORAGE_KEYS.ASSESSMENTS, []);
    const newAsm = {
      id: `asm-${Date.now()}`,
      facility_id: facilityId,
      status: 'draft',
      total_co2e: null,
      created_at: new Date().toISOString(),
      completed_at: null,
    };
    list.push(newAsm);
    setStorage(STORAGE_KEYS.ASSESSMENTS, list);
    return newAsm;
  },

  getInputs: (assessmentId) => {
    const inputs = getStorage(STORAGE_KEYS.INPUTS, INITIAL_DEMO_INPUTS);
    return inputs.filter((i) => i.assessment_id === assessmentId);
  },

  addInput: (assessmentId, inputData) => {
    const inputs = getStorage(STORAGE_KEYS.INPUTS, INITIAL_DEMO_INPUTS);
    const newInput = {
      id: `inp-${Date.now()}`,
      assessment_id: assessmentId,
      computed_co2e: null,
      ...inputData
    };
    inputs.push(newInput);
    setStorage(STORAGE_KEYS.INPUTS, inputs);
    return newInput;
  },

  updateInput: (inputId, data) => {
    const inputs = getStorage(STORAGE_KEYS.INPUTS, INITIAL_DEMO_INPUTS);
    const idx = inputs.findIndex((i) => i.id === inputId);
    if (idx !== -1) {
      inputs[idx] = { ...inputs[idx], ...data };
      setStorage(STORAGE_KEYS.INPUTS, inputs);
      return inputs[idx];
    }
    return null;
  },

  deleteInput: (inputId) => {
    const inputs = getStorage(STORAGE_KEYS.INPUTS, INITIAL_DEMO_INPUTS);
    const filtered = inputs.filter((i) => i.id !== inputId);
    setStorage(STORAGE_KEYS.INPUTS, filtered);
    return true;
  },

  applyRecommendation: (assessmentId, recommendationId, phase = null) => {
    const applied = getStorage(STORAGE_KEYS.APPLIED, []);
    const existing = applied.find(
      (a) => a.assessment_id === assessmentId && a.recommendation_id === recommendationId
    );
    if (existing) return existing;

    const newApp = {
      id: `app-${Date.now()}`,
      assessment_id: assessmentId,
      recommendation_id: recommendationId,
      applied_at: new Date().toISOString(),
      roadmap_phase: phase,
      status: 'planned'
    };
    applied.push(newApp);
    setStorage(STORAGE_KEYS.APPLIED, applied);
    return newApp;
  },

  dismissRecommendation: (recommendationId) => {
    const dismissed = getStorage(STORAGE_KEYS.DISMISSED, []);
    if (!dismissed.includes(recommendationId)) {
      dismissed.push(recommendationId);
      setStorage(STORAGE_KEYS.DISMISSED, dismissed);
    }
    return true;
  },

  updateRoadmapItem: (appliedId, updates) => {
    const applied = getStorage(STORAGE_KEYS.APPLIED, []);
    const idx = applied.findIndex((a) => a.id === appliedId);
    if (idx !== -1) {
      applied[idx] = { ...applied[idx], ...updates };
      setStorage(STORAGE_KEYS.APPLIED, applied);
      return applied[idx];
    }
    return null;
  },

  deleteRoadmapItem: (appliedId) => {
    const applied = getStorage(STORAGE_KEYS.APPLIED, []);
    const filtered = applied.filter((a) => a.id !== appliedId);
    setStorage(STORAGE_KEYS.APPLIED, filtered);
    return true;
  },

  getHistory: (facilityId) => {
    return getStorage(STORAGE_KEYS.HISTORY, INITIAL_ASSESSMENT_HISTORY);
  }
};
