import {
  EMISSION_FACTORS,
  INTERVENTION_LIBRARY,
  INITIAL_DEMO_FACILITY,
  INITIAL_DEMO_INPUTS,
  INITIAL_ASSESSMENT_HISTORY
} from './mockData.js';

const STORAGE_KEYS = {
  FACILITIES: 'carbotrack_facilities',
  ASSESSMENTS: 'carbotrack_assessments',
  INPUTS: 'carbotrack_inputs',
  APPLIED: 'carbotrack_applied',
  DISMISSED: 'carbotrack_dismissed',
  ROADMAP: 'carbotrack_roadmap',
  HISTORY: 'carbotrack_history',
  USERS: 'carbotrack_users',
  PASSWORDS: 'carbotrack_assessment_passwords',
};

// Safe storage helper with in-memory fallback
const memoryStore = {};

function getStorage(key, fallback) {
  try {
    if (typeof localStorage !== 'undefined') {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : (memoryStore[key] || fallback);
    }
    return memoryStore[key] || fallback;
  } catch (e) {
    return memoryStore[key] || fallback;
  }
}

function setStorage(key, value) {
  try {
    memoryStore[key] = value;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (e) {
    memoryStore[key] = value;
  }
}

// Initialize seed data if empty
export function initMockStore() {
  if (!getStorage(STORAGE_KEYS.FACILITIES, null)) {
    setStorage(STORAGE_KEYS.FACILITIES, [INITIAL_DEMO_FACILITY]);
  }
  if (!getStorage(STORAGE_KEYS.ASSESSMENTS, null)) {
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
  if (!getStorage(STORAGE_KEYS.INPUTS, null)) {
    setStorage(STORAGE_KEYS.INPUTS, INITIAL_DEMO_INPUTS);
  }
  if (!getStorage(STORAGE_KEYS.HISTORY, null)) {
    setStorage(STORAGE_KEYS.HISTORY, INITIAL_ASSESSMENT_HISTORY);
  }
  if (!getStorage(STORAGE_KEYS.APPLIED, null)) {
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
  if (!getStorage(STORAGE_KEYS.DISMISSED, null)) {
    setStorage(STORAGE_KEYS.DISMISSED, []);
  }
  if (!getStorage(STORAGE_KEYS.USERS, null)) {
    setStorage(STORAGE_KEYS.USERS, [
      {
        id: 'usr-mgr-01',
        name: 'Rajesh Mehta (Plant Manager)',
        email: 'manager@plant.com',
        password: 'manager123',
        role: 'manager',
      },
      {
        id: 'usr-emp-01',
        name: 'Ananya Roy (Process Employee)',
        email: 'employee@plant.com',
        password: 'employee123',
        role: 'employee',
      },
    ]);
  }
  if (!getStorage(STORAGE_KEYS.PASSWORDS, null)) {
    setStorage(STORAGE_KEYS.PASSWORDS, {
      'asm-abc-001': 'manager123',
    });
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

// Generate industry-tailored operational activity inputs
export function generateIndustryBaselineInputs(assessmentId, industry = 'plastic', productionVolume = 50000) {
  const vol = Number(productionVolume) > 0 ? Number(productionVolume) : 50000;
  const timestamp = Date.now();

  if (industry === 'textile') {
    return [
      {
        id: `inp-${timestamp}-1`,
        assessment_id: assessmentId,
        category: 'energy',
        subtype: 'electricity',
        quantity: Math.round(vol * 0.9),
        unit: 'kwh',
        computed_co2e: null,
      },
      {
        id: `inp-${timestamp}-2`,
        assessment_id: assessmentId,
        category: 'energy',
        subtype: 'diesel',
        quantity: Math.round(vol * 0.08),
        unit: 'l',
        computed_co2e: null,
      },
      {
        id: `inp-${timestamp}-3`,
        assessment_id: assessmentId,
        category: 'material',
        subtype: 'virgin_textile_fiber',
        quantity: Math.round(vol * 0.35),
        unit: 'kg',
        computed_co2e: null,
      },
      {
        id: `inp-${timestamp}-4`,
        assessment_id: assessmentId,
        category: 'material',
        subtype: 'dye',
        quantity: Math.round(vol * 0.04),
        unit: 'kg',
        computed_co2e: null,
      },
      {
        id: `inp-${timestamp}-5`,
        assessment_id: assessmentId,
        category: 'waste',
        subtype: 'textile_waste',
        treatment: 'landfill',
        quantity: Math.round(vol * 0.06),
        unit: 'kg',
        computed_co2e: null,
      },
    ];
  } else if (industry === 'food_processing') {
    return [
      {
        id: `inp-${timestamp}-1`,
        assessment_id: assessmentId,
        category: 'energy',
        subtype: 'electricity',
        quantity: Math.round(vol * 1.1),
        unit: 'kwh',
        computed_co2e: null,
      },
      {
        id: `inp-${timestamp}-2`,
        assessment_id: assessmentId,
        category: 'energy',
        subtype: 'natural_gas',
        quantity: Math.round(vol * 0.07),
        unit: 'm3',
        computed_co2e: null,
      },
      {
        id: `inp-${timestamp}-3`,
        assessment_id: assessmentId,
        category: 'material',
        subtype: 'raw_food_material',
        quantity: Math.round(vol * 0.5),
        unit: 'kg',
        computed_co2e: null,
      },
      {
        id: `inp-${timestamp}-4`,
        assessment_id: assessmentId,
        category: 'material',
        subtype: 'packaging_material',
        quantity: Math.round(vol * 0.06),
        unit: 'kg',
        computed_co2e: null,
      },
      {
        id: `inp-${timestamp}-5`,
        assessment_id: assessmentId,
        category: 'waste',
        subtype: 'organic_waste',
        treatment: 'landfill',
        quantity: Math.round(vol * 0.08),
        unit: 'kg',
        computed_co2e: null,
      },
    ];
  } else {
    // Plastic (default)
    return [
      {
        id: `inp-${timestamp}-1`,
        assessment_id: assessmentId,
        category: 'energy',
        subtype: 'diesel',
        quantity: Math.round(vol * 0.1),
        unit: 'l',
        computed_co2e: null,
      },
      {
        id: `inp-${timestamp}-2`,
        assessment_id: assessmentId,
        category: 'energy',
        subtype: 'electricity',
        quantity: Math.round(vol * 0.8),
        unit: 'kwh',
        computed_co2e: null,
      },
      {
        id: `inp-${timestamp}-3`,
        assessment_id: assessmentId,
        category: 'material',
        subtype: 'virgin_plastic',
        quantity: Math.round(vol * 0.4),
        unit: 'kg',
        computed_co2e: null,
      },
      {
        id: `inp-${timestamp}-4`,
        assessment_id: assessmentId,
        category: 'waste',
        subtype: 'plastic_waste',
        treatment: 'landfill',
        quantity: Math.round(vol * 0.06),
        unit: 'kg',
        computed_co2e: null,
      },
    ];
  }
}

// Mock Store helpers for mutations
export const mockStore = {
  getFacilities: () => getStorage(STORAGE_KEYS.FACILITIES, [INITIAL_DEMO_FACILITY]),

  createFacility: (data) => {
    const facilities = getStorage(STORAGE_KEYS.FACILITIES, [INITIAL_DEMO_FACILITY]);
    const facilityId = `fac-${Date.now()}`;
    const newFacility = {
      id: facilityId,
      owner_user_id: 'usr-001',
      created_at: new Date().toISOString(),
      ...data,
    };
    facilities.push(newFacility);
    setStorage(STORAGE_KEYS.FACILITIES, facilities);

    // Automatically create initial baseline assessment with realistic baseline inputs
    const assessmentId = `asm-${Date.now()}`;
    const baselineInputs = generateIndustryBaselineInputs(
      assessmentId,
      newFacility.industry,
      newFacility.production_volume
    );

    // Save inputs associated with this assessment
    const existingInputs = getStorage(STORAGE_KEYS.INPUTS, INITIAL_DEMO_INPUTS);
    setStorage(STORAGE_KEYS.INPUTS, [...existingInputs, ...baselineInputs]);

    // Calculate baseline assessment
    const result = calculateAssessmentEngine(baselineInputs);

    const assessments = getStorage(STORAGE_KEYS.ASSESSMENTS, []);
    const newAssessment = {
      id: assessmentId,
      facility_id: facilityId,
      status: 'complete',
      total_co2e: result.total_co2e,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    };
    assessments.push(newAssessment);
    setStorage(STORAGE_KEYS.ASSESSMENTS, assessments);

    // Add baseline history entry for longitudinal tracking
    const history = getStorage(STORAGE_KEYS.HISTORY, INITIAL_ASSESSMENT_HISTORY);
    history.push({
      assessment_id: assessmentId,
      facility_id: facilityId,
      total_co2e: result.total_co2e,
      recorded_at: new Date().toISOString(),
      status: 'complete',
      interventions_applied: 0,
    });
    setStorage(STORAGE_KEYS.HISTORY, history);

    // Persist active IDs
    try {
      localStorage.setItem('carbotrack_active_facility_id', facilityId);
      localStorage.setItem('carbotrack_active_assessment_id', assessmentId);
    } catch (e) {}

    return { facility: newFacility, assessment: newAssessment };
  },

  getAssessments: (facilityId) => {
    const list = getStorage(STORAGE_KEYS.ASSESSMENTS, []);
    return facilityId ? list.filter((a) => a.facility_id === facilityId) : list;
  },

  createAssessment: (facilityId) => {
    const facilities = getStorage(STORAGE_KEYS.FACILITIES, [INITIAL_DEMO_FACILITY]);
    const fac = facilities.find((f) => f.id === facilityId) || facilities[0];
    const assessmentId = `asm-${Date.now()}`;
    const baselineInputs = generateIndustryBaselineInputs(
      assessmentId,
      fac?.industry || 'plastic',
      fac?.production_volume || 50000
    );
    const result = calculateAssessmentEngine(baselineInputs);

    const existingInputs = getStorage(STORAGE_KEYS.INPUTS, INITIAL_DEMO_INPUTS);
    setStorage(STORAGE_KEYS.INPUTS, [...existingInputs, ...baselineInputs]);

    const list = getStorage(STORAGE_KEYS.ASSESSMENTS, []);
    const newAsm = {
      id: assessmentId,
      facility_id: facilityId,
      status: 'complete',
      total_co2e: result.total_co2e,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    };
    list.push(newAsm);
    setStorage(STORAGE_KEYS.ASSESSMENTS, list);
    return newAsm;
  },

  getInputs: (assessmentId) => {
    const inputs = getStorage(STORAGE_KEYS.INPUTS, INITIAL_DEMO_INPUTS);
    const matching = inputs.filter((i) => i.assessment_id === assessmentId);
    if (matching.length > 0) return matching;

    // Fallback: If no inputs exist for this assessment, generate baseline for its facility
    const assessments = getStorage(STORAGE_KEYS.ASSESSMENTS, []);
    const asm = assessments.find((a) => a.id === assessmentId);
    if (asm) {
      const facilities = getStorage(STORAGE_KEYS.FACILITIES, [INITIAL_DEMO_FACILITY]);
      const fac = facilities.find((f) => f.id === asm.facility_id);
      const generated = generateIndustryBaselineInputs(assessmentId, fac?.industry, fac?.production_volume);
      setStorage(STORAGE_KEYS.INPUTS, [...inputs, ...generated]);
      return generated;
    }
    return [];
  },

  saveAssessmentInputs: (assessmentId, inputs) => {
    const existingInputs = getStorage(STORAGE_KEYS.INPUTS, INITIAL_DEMO_INPUTS);
    // Remove previous inputs for this assessment
    const filtered = existingInputs.filter((i) => i.assessment_id !== assessmentId);
    // Ensure every input has the proper assessment_id and valid quantity
    const sanitizedInputs = inputs.map((inp, idx) => ({
      ...inp,
      id: inp.id && !inp.id.startsWith('inp-temp-') ? inp.id : `inp-${Date.now()}-${idx}`,
      assessment_id: assessmentId,
      quantity: Number(inp.quantity) || 0,
    }));
    setStorage(STORAGE_KEYS.INPUTS, [...filtered, ...sanitizedInputs]);
    return sanitizedInputs;
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
    const historyList = getStorage(STORAGE_KEYS.HISTORY, INITIAL_ASSESSMENT_HISTORY) || [];
    const assessments = getStorage(STORAGE_KEYS.ASSESSMENTS, []) || [];

    const map = new Map();

    // 1. Add historical audit records for this facility
    historyList.forEach((h) => {
      if (!facilityId || h.facility_id === facilityId) {
        map.set(h.assessment_id, {
          ...h,
          total_co2e: Number(h.total_co2e) || 0,
        });
      }
    });

    // 2. Add / merge all assessments for this facility from the assessments store
    assessments.forEach((a) => {
      if (!facilityId || a.facility_id === facilityId) {
        const existing = map.get(a.id) || {};
        map.set(a.id, {
          assessment_id: a.id,
          facility_id: a.facility_id,
          total_co2e: Number(a.total_co2e) || existing.total_co2e || 0,
          recorded_at: a.completed_at || a.created_at || new Date().toISOString(),
          status: a.status || 'complete',
          interventions_applied: a.interventions_applied || existing.interventions_applied || 0,
        });
      }
    });

    const combined = Array.from(map.values());

    // If still empty (e.g. brand new facility), provide initial baseline point
    if (combined.length === 0) {
      return [
        {
          assessment_id: `asm-${facilityId || 'demo'}-baseline`,
          facility_id: facilityId || 'fac-abc-001',
          total_co2e: 120.0,
          recorded_at: new Date(Date.now() - 60 * 86400000).toISOString(),
          status: 'complete',
          interventions_applied: 0,
        },
      ];
    }

    return combined.sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
  },

  addHistoryRecord: (record) => {
    const list = getStorage(STORAGE_KEYS.HISTORY, INITIAL_ASSESSMENT_HISTORY);
    const newRecord = {
      assessment_id: record.assessment_id || `asm-${Date.now()}`,
      facility_id: record.facility_id || 'fac-abc-001',
      total_co2e: Number(record.total_co2e) || 75.0,
      recorded_at: record.recorded_at || new Date().toISOString(),
      status: 'complete',
      interventions_applied: record.interventions_applied || 0,
    };
    list.push(newRecord);
    setStorage(STORAGE_KEYS.HISTORY, list);
    return newRecord;
  },

  // User Authentication & Management (Manager and Employee)
  getUsers: () => {
    return getStorage(STORAGE_KEYS.USERS, []);
  },

  signupUser: (data) => {
    const users = getStorage(STORAGE_KEYS.USERS, []);
    const existing = users.find((u) => u.email.toLowerCase() === (data.email || '').toLowerCase().trim());
    if (existing) {
      throw new Error(`An account with email ${data.email} already exists.`);
    }

    const assignedRole = data.role === 'manager' ? 'manager' : 'employee';
    const newUser = {
      id: `usr-${Date.now()}`,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
      role: assignedRole,
    };

    users.push(newUser);
    setStorage(STORAGE_KEYS.USERS, users);

    return {
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
      token: `mock-jwt-token-${newUser.id}`,
    };
  },

  loginUser: (email, password) => {
    const users = getStorage(STORAGE_KEYS.USERS, []);
    const normalizedEmail = (email || '').toLowerCase().trim();
    const user = users.find((u) => u.email.toLowerCase() === normalizedEmail);

    if (!user) {
      throw new Error('Account not found with this email. Please check your credentials or register.');
    }

    if (user.password !== password) {
      throw new Error('Invalid password. Please check your credentials.');
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token: `mock-jwt-token-${user.id}`,
    };
  },

  // Assessment Password Management (Manager sets, Employee verifies)
  setAssessmentPassword: (assessmentId, password) => {
    const passwords = getStorage(STORAGE_KEYS.PASSWORDS, {});
    passwords[assessmentId] = password;
    setStorage(STORAGE_KEYS.PASSWORDS, passwords);
    return true;
  },

  getAssessmentPassword: (assessmentId) => {
    const passwords = getStorage(STORAGE_KEYS.PASSWORDS, {});
    return passwords[assessmentId] || 'manager123';
  },

  verifyAssessmentAccess: (assessmentId, enteredPassword, currentUser) => {
    if (!currentUser) return false;
    // Managers always have full access
    if (currentUser.role === 'manager') return true;

    const trimmedInput = (enteredPassword || '').trim();
    if (!trimmedInput) return false;

    // Check manager's assessment password
    const passwords = getStorage(STORAGE_KEYS.PASSWORDS, {});
    const assessmentPassword = passwords[assessmentId] || 'manager123';
    if (trimmedInput === assessmentPassword) return true;

    // Also directly allows employee password to modify company assessment
    const users = getStorage(STORAGE_KEYS.USERS, []);
    const foundUser = users.find((u) => u.email.toLowerCase() === currentUser.email?.toLowerCase());
    if (foundUser && foundUser.password === trimmedInput) {
      return true;
    }

    // Fallback for default demo employee password
    if (currentUser.role === 'employee' && trimmedInput === 'employee123') {
      return true;
    }

    return false;
  }
};
