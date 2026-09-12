const EmissionFactor = require('../models/EmissionFactor');
const ProcessInput = require('../models/ProcessInput');
const Assessment = require('../models/Assessment');
const AssessmentHistory = require('../models/AssessmentHistory');

// Unit conversion table: converts from input unit to canonical factor unit
// Returns multiplier to apply to quantity BEFORE multiplying by emission factor
const UNIT_CONVERSIONS = {
  // Energy volume
  mwh: { to: 'kwh', factor: 1000 },
  kwh: { to: 'kwh', factor: 1 },
  // Liquid volume
  l: { to: 'litre', factor: 1 },
  litre: { to: 'litre', factor: 1 },
  liter: { to: 'litre', factor: 1 },
  gallon: { to: 'litre', factor: 3.78541 },
  gal: { to: 'litre', factor: 3.78541 },
  // Mass
  kg: { to: 'kg', factor: 1 },
  kilogram: { to: 'kg', factor: 1 },
  lb: { to: 'kg', factor: 0.453592 },
  pound: { to: 'kg', factor: 0.453592 },
  tonne: { to: 'kg', factor: 1000 },
  ton: { to: 'kg', factor: 1000 },
  mt: { to: 'kg', factor: 1000 },
  // Volume (gas/liquid)
  m3: { to: 'm3', factor: 1 },
  // Water (kilolitre = 1000 litres)
  kl: { to: 'kl', factor: 1 },
  kilolitre: { to: 'kl', factor: 1 },
  kiloliter: { to: 'kl', factor: 1 },
};

// Maps canonical emission factor units to lookup keys in emission factors collection
const EF_UNIT_MAP = {
  'kwh': ['kwh', 'kWh'],
  'litre': ['litre', 'l', 'liter'],
  'kg': ['kg'],
  'm3': ['m3'],
  'kl': ['kl'],
};

/**
 * Normalize a unit string to a canonical form
 */
function normalizeUnit(unit) {
  return (unit || '').toLowerCase().trim();
}

/**
 * Look up emission factor for a given category/subtype/unit combination
 * Returns { factor, factorDoc } or null
 */
async function lookupEmissionFactor(category, subtype, unit) {
  const normalUnit = normalizeUnit(unit);

  // Try direct subtype match first
  const factor = await EmissionFactor.findOne({
    category,
    subtype: { $regex: new RegExp(`^${subtype}$`, 'i') },
  });

  if (factor) return factor;

  // If not found, return null
  return null;
}

/**
 * Convert quantity from input unit to emission factor's canonical unit
 * Returns { convertedQuantity, canonicalUnit } or null if conversion unsupported
 */
function convertUnit(quantity, inputUnit, targetUnit) {
  const normInput = normalizeUnit(inputUnit);
  const normTarget = normalizeUnit(targetUnit);

  if (normInput === normTarget) return { convertedQuantity: quantity, canonicalUnit: targetUnit };

  // Check conversion table
  const conv = UNIT_CONVERSIONS[normInput];
  if (conv && conv.to === normTarget) {
    return { convertedQuantity: quantity * conv.factor, canonicalUnit: normTarget };
  }

  // Try reverse
  for (const [key, val] of Object.entries(UNIT_CONVERSIONS)) {
    if (key === normInput && val.to === normTarget) {
      return { convertedQuantity: quantity * val.factor, canonicalUnit: normTarget };
    }
  }

  return null; // unsupported conversion
}

/**
 * Main calculation engine — runs over all ProcessInput rows for an assessment
 * Sets computed_co2e on each input and total_co2e on the assessment
 */
async function calculateEmissions(assessmentId) {
  const assessment = await Assessment.findById(assessmentId);
  if (!assessment) throw new Error('Assessment not found');

  const inputs = await ProcessInput.find({ assessment_id: assessmentId });
  if (inputs.length === 0) {
    throw { code: 'VALIDATION_ERROR', message: 'No process inputs to calculate', status: 400 };
  }

  let totalCo2eKg = 0;
  const unsupportedInputs = [];
  const lineItems = [];

  for (const input of inputs) {
    const efDoc = await lookupEmissionFactor(input.category, input.subtype, input.unit);

    if (!efDoc) {
      // Mark as unsupported — still stored, flagged
      await ProcessInput.findByIdAndUpdate(input._id, { computed_co2e: null, unsupported: true, emission_factor_id: null });
      unsupportedInputs.push({
        input_id: input._id,
        category: input.category,
        subtype: input.subtype,
        unit: input.unit,
        reason: 'no matching emission factor',
      });
      continue;
    }

    // Convert unit
    const convResult = convertUnit(input.quantity, input.unit, efDoc.unit);
    let convertedQty = input.quantity;
    if (convResult) {
      convertedQty = convResult.convertedQuantity;
    }

    // CO2e in kg
    const co2eKg = convertedQty * efDoc.emission_factor;
    // Convert to tonnes for storage
    const co2eTonnes = co2eKg / 1000;

    await ProcessInput.findByIdAndUpdate(input._id, {
      computed_co2e: co2eTonnes,
      emission_factor_id: efDoc._id,
      unsupported: false,
    });

    totalCo2eKg += co2eKg;

    lineItems.push({
      id: input._id,
      category: input.category,
      subtype: input.subtype,
      quantity: input.quantity,
      unit: input.unit,
      emission_factor: efDoc.emission_factor,
      factor_unit: efDoc.factor_unit,
      factor_source: efDoc.source,
      co2e: parseFloat(co2eTonnes.toFixed(4)),
    });
  }

  const totalCo2eTonnes = parseFloat((totalCo2eKg / 1000).toFixed(4));

  // Update assessment
  await Assessment.findByIdAndUpdate(assessmentId, {
    total_co2e: totalCo2eTonnes,
    status: 'complete',
    completed_at: new Date(),
  });

  // Record in history
  await AssessmentHistory.create({
    facility_id: assessment.facility_id,
    assessment_id: assessmentId,
    total_co2e: totalCo2eTonnes,
    recorded_at: new Date(),
  });

  return {
    total_co2e: totalCo2eTonnes,
    unsupported_inputs: unsupportedInputs,
    unsupported_inputs_count: unsupportedInputs.length,
    line_items: lineItems,
  };
}

/**
 * Build summary data (for GET /assessments/:id/summary)
 */
async function buildSummary(assessmentId) {
  const assessment = await Assessment.findById(assessmentId);
  if (!assessment) throw { code: 'NOT_FOUND', message: 'Assessment not found', status: 404 };
  if (assessment.status !== 'complete') {
    throw { code: 'ASSESSMENT_NOT_CALCULATED', message: 'Assessment has not been calculated yet', status: 400 };
  }

  const inputs = await ProcessInput.find({ assessment_id: assessmentId });
  const categoryTotals = { energy: 0, material: 0, waste: 0 };
  const lineItems = [];
  let unsupportedCount = 0;

  for (const input of inputs) {
    if (input.unsupported || input.computed_co2e === null) {
      unsupportedCount++;
      continue;
    }

    categoryTotals[input.category] = (categoryTotals[input.category] || 0) + input.computed_co2e;

    const efDoc = input.emission_factor_id
      ? await EmissionFactor.findById(input.emission_factor_id)
      : null;

    lineItems.push({
      id: input._id,
      category: input.category,
      subtype: input.subtype,
      quantity: input.quantity,
      unit: input.unit,
      emission_factor: efDoc ? efDoc.emission_factor : null,
      factor_unit: efDoc ? efDoc.factor_unit : null,
      factor_source: efDoc ? efDoc.source : null,
      co2e: parseFloat((input.computed_co2e || 0).toFixed(4)),
      pct_contribution: assessment.total_co2e > 0
        ? parseFloat((input.computed_co2e / assessment.total_co2e).toFixed(4))
        : 0,
    });
  }

  // Round category totals
  for (const k of Object.keys(categoryTotals)) {
    categoryTotals[k] = parseFloat(categoryTotals[k].toFixed(4));
  }

  return {
    total_co2e: assessment.total_co2e,
    category_totals: categoryTotals,
    line_items: lineItems,
    unsupported_inputs_count: unsupportedCount,
  };
}

module.exports = { calculateEmissions, buildSummary, lookupEmissionFactor, normalizeUnit };
