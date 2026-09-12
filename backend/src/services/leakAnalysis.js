const ProcessInput = require('../models/ProcessInput');
const Assessment = require('../models/Assessment');

/**
 * Determine severity badge based on percentage contribution
 */
function getSeverity(pctContribution) {
  if (pctContribution >= 0.30) return 'high';
  if (pctContribution >= 0.10) return 'medium';
  return 'low';
}

/**
 * Rank emission leak points for an assessment
 * Aggregates by (category, subtype), calculates contribution, assigns severity
 */
async function getLeakPoints(assessmentId) {
  const assessment = await Assessment.findById(assessmentId);
  if (!assessment) throw { code: 'NOT_FOUND', message: 'Assessment not found', status: 404 };
  if (assessment.status !== 'complete') {
    throw { code: 'ASSESSMENT_NOT_CALCULATED', message: 'Assessment has not been calculated yet', status: 400 };
  }

  const inputs = await ProcessInput.find({
    assessment_id: assessmentId,
    computed_co2e: { $ne: null },
    unsupported: false,
  });

  if (!inputs.length) {
    return { leak_points: [] };
  }

  // Aggregate by (category, subtype)
  const aggregated = {};
  for (const input of inputs) {
    const key = `${input.category}__${input.subtype}`;
    if (!aggregated[key]) {
      aggregated[key] = {
        category: input.category,
        subtype: input.subtype,
        co2e: 0,
      };
    }
    aggregated[key].co2e += input.computed_co2e || 0;
  }

  const totalCo2e = assessment.total_co2e || 1;

  // Build ranked list
  const leakPoints = Object.values(aggregated)
    .map((lp) => {
      const pct = totalCo2e > 0 ? lp.co2e / totalCo2e : 0;
      return {
        leak_point_ref: lp.subtype,
        category: lp.category,
        subtype: lp.subtype,
        co2e: parseFloat(lp.co2e.toFixed(4)),
        pct_contribution: parseFloat(pct.toFixed(4)),
        severity: getSeverity(pct),
      };
    })
    .sort((a, b) => b.co2e - a.co2e)
    .map((lp, idx) => ({ rank: idx + 1, ...lp }));

  return { leak_points: leakPoints };
}

module.exports = { getLeakPoints, getSeverity };
