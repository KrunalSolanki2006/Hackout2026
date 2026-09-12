const { spawnSync } = require('child_process');
const path = require('path');
const Intervention = require('../models/Intervention');
const Recommendation = require('../models/Recommendation');
const Assessment = require('../models/Assessment');
const Facility = require('../models/Facility');
const { getLeakPoints } = require('./leakAnalysis');

/**
 * Rule-based scorer — deterministic scoring matching rule_based_scorer.py
 * Scores each candidate intervention 0-100 based on:
 *   - Industry fit:                    up to 35 pts
 *   - Leak point match & contribution: up to 35 pts
 *   - CO2 reduction potential:         up to 15 pts
 *   - Implementation difficulty + ROI: up to 15 pts
 */
function ruleBasedScore(intervention, facility, leakPoint) {
  let score = 0;
  const explanations = [];

  // 1. Industry fit (35 pts)
  if (intervention.supported_industries.includes(facility.industry)) {
    score += 35;
    explanations.push('Strong industry fit');
  } else {
    score += 5;
    explanations.push('Partial industry fit');
  }

  // 2. Leak point match (35 pts)
  if (leakPoint && intervention.applicable_leak_types.some(
    (lt) => lt === leakPoint.leak_point_ref || lt === leakPoint.subtype
  )) {
    const pct = leakPoint.pct_contribution || 0;
    const leakScore = Math.min(35, Math.round(pct * 100));
    score += leakScore;
    if (pct >= 0.30) {
      explanations.push('High emission contribution — direct match');
    } else if (pct >= 0.10) {
      explanations.push('Medium emission contribution match');
    } else {
      explanations.push('Leak point match');
    }
  } else if (leakPoint) {
    // General category match
    if (intervention.category === leakPoint.category) {
      score += 10;
      explanations.push('Category-level match');
    }
  }

  // 3. CO2 reduction potential (15 pts)
  const co2Midpoint = (intervention.estimated_co2_reduction_min + intervention.estimated_co2_reduction_max) / 2;
  if (co2Midpoint >= 20) {
    score += 15;
    explanations.push('Very high CO2 reduction potential');
  } else if (co2Midpoint >= 12) {
    score += 10;
    explanations.push('High CO2 reduction potential');
  } else if (co2Midpoint >= 6) {
    score += 6;
    explanations.push('Moderate CO2 reduction potential');
  } else {
    score += 3;
    explanations.push('Low-to-moderate CO2 reduction potential');
  }

  // 4. Implementation difficulty & ROI (15 pts)
  if (intervention.implementation_difficulty === 'low') {
    score += 15;
    explanations.push('Easy to implement — quick win');
  } else if (intervention.implementation_difficulty === 'medium') {
    score += 9;
    explanations.push('Moderate implementation effort');
  } else {
    score += 4;
    explanations.push('High implementation complexity');
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    score_source: 'rule_based',
    explanation_flags: explanations,
  };
}

/**
 * Attempt to call Python ML bridge for scoring
 * Falls back to rule-based if Python unavailable or ML fails
 */
function mlBridgeScore(intervention, facility, leakPoint) {
  try {
    const mlModelPath = process.env.ML_MODEL_PATH || '../ml/models/recommender_v1.joblib';
    const scriptPath = path.resolve(__dirname, '../../../ml/inference/ranker_bridge.py');

    const input = JSON.stringify({
      facility_profile: {
        industry: facility.industry,
        facility_size: facility.facility_size,
        region: facility.region,
      },
      leak_points: leakPoint ? [leakPoint] : [],
      candidate_interventions: [intervention],
      model_path: mlModelPath,
    });

    const result = spawnSync('python', [scriptPath, input], {
      timeout: 5000,
      encoding: 'utf8',
    });

    if (result.status === 0 && result.stdout) {
      const parsed = JSON.parse(result.stdout);
      if (parsed && parsed[0]) {
        return {
          score: parsed[0].score,
          score_source: 'ml',
          explanation_flags: parsed[0].explanation_flags || [],
        };
      }
    }
  } catch (e) {
    // Silently fall through to rule-based
  }
  return null;
}

/**
 * Auto-bucket phase from difficulty + payback
 */
function autoBucketPhase(intervention) {
  const payback = intervention.payback_period_months || 24;
  const diff = intervention.implementation_difficulty;
  if (diff === 'low' || payback <= 12) return 1;
  if (diff === 'high' || payback >= 30) return 3;
  return 2;
}

/**
 * Generate and persist recommendations for an assessment
 */
async function generateRecommendations(assessmentId) {
  const assessment = await Assessment.findById(assessmentId);
  if (!assessment) throw { code: 'NOT_FOUND', message: 'Assessment not found', status: 404 };
  if (assessment.status !== 'complete') {
    throw { code: 'ASSESSMENT_NOT_CALCULATED', message: 'Assessment not calculated', status: 400 };
  }

  const facility = await Facility.findById(assessment.facility_id);
  if (!facility) throw { code: 'NOT_FOUND', message: 'Facility not found', status: 404 };

  const { leak_points } = await getLeakPoints(assessmentId);

  // Delete old recommendations for fresh generation
  await Recommendation.deleteMany({ assessment_id: assessmentId, status: 'suggested' });

  const interventions = await Intervention.find({});
  const recommendations = [];

  for (const intervention of interventions) {
    // Filter: must support this industry
    if (!intervention.supported_industries.includes(facility.industry)) continue;

    // Find best matching leak point for this intervention
    const matchingLeak = leak_points.find((lp) =>
      intervention.applicable_leak_types.some(
        (lt) => lt === lp.leak_point_ref || lt === lp.subtype
      )
    );

    // Score: try ML first, fallback to rule-based
    let scored = mlBridgeScore(intervention, facility, matchingLeak || leak_points[0]);
    if (!scored) {
      scored = ruleBasedScore(intervention, facility, matchingLeak || leak_points[0]);
    }

    const rec = await Recommendation.create({
      assessment_id: assessmentId,
      intervention_id: intervention._id,
      score: scored.score,
      score_source: scored.score_source,
      explanation: scored.explanation_flags,
      applicable_leak_point: matchingLeak ? matchingLeak.leak_point_ref : (leak_points[0] ? leak_points[0].leak_point_ref : null),
      status: 'suggested',
    });

    recommendations.push({
      recommendation_id: rec._id,
      intervention: {
        id: intervention._id,
        name: intervention.name,
        category: intervention.category,
        description: intervention.description,
      },
      score: rec.score,
      score_source: rec.score_source,
      estimated_cost_range: [intervention.estimated_cost_min, intervention.estimated_cost_max],
      currency: 'USD',
      estimated_co2_reduction_range: [intervention.estimated_co2_reduction_min, intervention.estimated_co2_reduction_max],
      co2_reduction_unit: 't CO2e/year',
      payback_period_months: intervention.payback_period_months,
      roi_pct: intervention.roi_pct,
      implementation_difficulty: intervention.implementation_difficulty,
      explanation: rec.explanation,
      applicable_leak_point: rec.applicable_leak_point,
      status: rec.status,
    });
  }

  // Sort by score descending
  return recommendations.sort((a, b) => b.score - a.score);
}

/**
 * Get persisted recommendations for an assessment (filtered)
 */
async function getRecommendations(assessmentId, filters = {}) {
  const assessment = await Assessment.findById(assessmentId);
  if (!assessment) throw { code: 'NOT_FOUND', message: 'Assessment not found', status: 404 };
  if (assessment.status !== 'complete') {
    throw { code: 'ASSESSMENT_NOT_CALCULATED', message: 'Assessment not calculated', status: 400 };
  }

  // Check if recommendations already exist
  let existingRecs = await Recommendation.find({ assessment_id: assessmentId, status: { $ne: 'dismissed' } });

  // Generate if none exist
  if (existingRecs.length === 0) {
    return await generateRecommendations(assessmentId);
  }

  // Build response from persisted data
  const results = [];
  for (const rec of existingRecs) {
    const intervention = await Intervention.findById(rec.intervention_id);
    if (!intervention) continue;

    // Apply filters
    if (filters.leak_point && rec.applicable_leak_point !== filters.leak_point) continue;
    if (filters.category && intervention.category !== filters.category) continue;

    results.push({
      recommendation_id: rec._id,
      intervention: {
        id: intervention._id,
        name: intervention.name,
        category: intervention.category,
        description: intervention.description,
      },
      score: rec.score,
      score_source: rec.score_source,
      estimated_cost_range: [intervention.estimated_cost_min, intervention.estimated_cost_max],
      currency: 'USD',
      estimated_co2_reduction_range: [intervention.estimated_co2_reduction_min, intervention.estimated_co2_reduction_max],
      co2_reduction_unit: 't CO2e/year',
      payback_period_months: intervention.payback_period_months,
      roi_pct: intervention.roi_pct,
      implementation_difficulty: intervention.implementation_difficulty,
      explanation: rec.explanation,
      applicable_leak_point: rec.applicable_leak_point,
      status: rec.status,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

module.exports = { generateRecommendations, getRecommendations, autoBucketPhase };
