const Assessment = require('../models/Assessment');
const Recommendation = require('../models/Recommendation');
const Intervention = require('../models/Intervention');

/**
 * What-If Simulator
 * Non-overlapping max-per-leak-point CO2 reduction rule
 * Cost & savings are ADDITIVE across all selected interventions
 */
async function simulate(assessmentId, selectedInterventionIds) {
  const assessment = await Assessment.findById(assessmentId);
  if (!assessment) throw { code: 'NOT_FOUND', message: 'Assessment not found', status: 404 };
  if (assessment.status !== 'complete' || assessment.total_co2e === null) {
    throw { code: 'ASSESSMENT_NOT_CALCULATED', message: 'Assessment not calculated', status: 400 };
  }

  if (!selectedInterventionIds || selectedInterventionIds.length === 0) {
    throw { code: 'VALIDATION_ERROR', message: 'selected_intervention_ids must contain at least 1 item', status: 400 };
  }

  const currentCo2e = assessment.total_co2e;

  // Fetch intervention data for each selected ID
  // IDs can be intervention IDs (INT-xxx) or recommendation IDs (uuid)
  const interventionData = [];
  for (const id of selectedInterventionIds) {
    let intervention = await Intervention.findById(id);
    let applicable_leak_point = null;

    if (!intervention) {
      // Try as recommendation ID
      const rec = await Recommendation.findById(id);
      if (rec) {
        intervention = await Intervention.findById(rec.intervention_id);
        applicable_leak_point = rec.applicable_leak_point;
      }
    }

    if (!intervention) {
      throw { code: 'VALIDATION_ERROR', message: `Unknown intervention ID: ${id}`, status: 400 };
    }

    interventionData.push({ intervention, applicable_leak_point, id });
  }

  // Group by leak_point_ref — apply max-per-leak-point rule for CO2 reduction
  const leakPointGroups = {}; // leak_point_ref -> list of {co2_midpoint, intervention, id}
  const noLeakPointItems = [];

  for (const item of interventionData) {
    const co2Midpoint = (item.intervention.estimated_co2_reduction_min + item.intervention.estimated_co2_reduction_max) / 2;
    const lp = item.applicable_leak_point;

    if (lp) {
      if (!leakPointGroups[lp]) leakPointGroups[lp] = [];
      leakPointGroups[lp].push({ ...item, co2Midpoint });
    } else {
      noLeakPointItems.push({ ...item, co2Midpoint });
    }
  }

  let totalCo2Reduction = 0;
  let totalInvestment = 0;
  let totalAnnualSavings = 0;
  let totalPaybackMonths = 0;
  let paybackCount = 0;
  let totalRoi = 0;
  let roiCount = 0;
  const overlapAdjustments = [];

  // Apply max-per-leak-point rule
  for (const [lpRef, items] of Object.entries(leakPointGroups)) {
    // Sort by co2Midpoint descending — take max
    items.sort((a, b) => b.co2Midpoint - a.co2Midpoint);
    const maxItem = items[0];
    totalCo2Reduction += maxItem.co2Midpoint;

    if (items.length > 1) {
      overlapAdjustments.push({
        leak_point_ref: lpRef,
        applied_intervention_id: maxItem.id,
        note: `max-per-leak-point rule applied; ${items.length - 1} overlapping intervention(s) on this leak point ignored for CO2 reduction, cost still counted`,
      });
    }

    // Cost is ADDITIVE for all items in this group
    for (const item of items) {
      const costMidpoint = (item.intervention.estimated_cost_min + item.intervention.estimated_cost_max) / 2;
      totalInvestment += costMidpoint;
      // Annual savings estimate (cost / payback_months * 12)
      const payback = item.intervention.payback_period_months;
      const annualSavings = costMidpoint / (payback / 12);
      totalAnnualSavings += annualSavings;
      totalPaybackMonths += payback;
      paybackCount++;
      totalRoi += item.intervention.roi_pct;
      roiCount++;
    }
  }

  // Non-grouped items (no leak point) — simple addition
  for (const item of noLeakPointItems) {
    totalCo2Reduction += item.co2Midpoint;
    const costMidpoint = (item.intervention.estimated_cost_min + item.intervention.estimated_cost_max) / 2;
    totalInvestment += costMidpoint;
    const payback = item.intervention.payback_period_months;
    const annualSavings = costMidpoint / (payback / 12);
    totalAnnualSavings += annualSavings;
    totalPaybackMonths += payback;
    paybackCount++;
    totalRoi += item.intervention.roi_pct;
    roiCount++;
  }

  // Cap reduction at 90% of current CO2e
  const maxReduction = currentCo2e * 0.90;
  if (totalCo2Reduction > maxReduction) {
    totalCo2Reduction = maxReduction;
  }

  const projectedCo2e = Math.max(0, currentCo2e - totalCo2Reduction);
  const reductionAbs = currentCo2e - projectedCo2e;
  const reductionPct = currentCo2e > 0 ? reductionAbs / currentCo2e : 0;

  const avgPayback = paybackCount > 0 ? Math.round(totalPaybackMonths / paybackCount) : 0;
  const avgRoi = roiCount > 0 ? parseFloat((totalRoi / roiCount).toFixed(1)) : 0;

  return {
    current_co2e: parseFloat(currentCo2e.toFixed(4)),
    projected_co2e: parseFloat(projectedCo2e.toFixed(4)),
    reduction_abs: parseFloat(reductionAbs.toFixed(4)),
    reduction_pct: parseFloat(reductionPct.toFixed(4)),
    investment: Math.round(totalInvestment),
    currency: 'USD',
    annual_savings: Math.round(totalAnnualSavings),
    payback_period_months: avgPayback,
    roi_pct: avgRoi,
    overlap_adjustments: overlapAdjustments,
  };
}

module.exports = { simulate };
