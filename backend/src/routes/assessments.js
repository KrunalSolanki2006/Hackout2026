const express = require('express');
const Assessment = require('../models/Assessment');
const ProcessInput = require('../models/ProcessInput');
const Recommendation = require('../models/Recommendation');
const AppliedIntervention = require('../models/AppliedIntervention');
const AssessmentHistory = require('../models/AssessmentHistory');
const Facility = require('../models/Facility');
const Intervention = require('../models/Intervention');
const { authenticate } = require('../middleware/auth');
const { calculateEmissions, buildSummary } = require('../services/calculationEngine');
const { getLeakPoints } = require('../services/leakAnalysis');
const { getRecommendations, autoBucketPhase } = require('../services/recommendationEngine');
const { simulate } = require('../services/simulator');
const { generateCSV, generateTextReport } = require('../services/reportGenerator');

const router = express.Router();

const VALID_CATEGORIES = ['energy', 'material', 'waste'];
const VALID_TREATMENTS = ['landfill', 'recycling', 'incineration', 'energy_recovery', 'composting'];
const VALID_ROADMAP_PHASES = [1, 2, 3];
const VALID_ROADMAP_STATUSES = ['planned', 'in_progress', 'completed'];

async function getAssessmentOwned(assessmentId, userId) {
  const assessment = await Assessment.findById(assessmentId);
  if (!assessment || assessment.owner_user_id !== userId) return null;
  return assessment;
}

// GET /assessments/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const assessment = await getAssessmentOwned(req.params.id, req.user._id);
    if (!assessment) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Assessment not found' } });

    const inputs = await ProcessInput.find({ assessment_id: assessment._id });

    res.json({
      success: true,
      data: {
        assessment: {
          id: assessment._id,
          facility_id: assessment.facility_id,
          status: assessment.status,
          total_co2e: assessment.total_co2e,
          created_at: assessment.created_at,
          completed_at: assessment.completed_at,
        },
        inputs: inputs.map((i) => ({
          id: i._id,
          category: i.category,
          subtype: i.subtype,
          quantity: i.quantity,
          unit: i.unit,
          treatment: i.treatment,
          computed_co2e: i.computed_co2e,
        })),
      },
    });
  } catch (err) { next(err); }
});

// POST /assessments/:id/inputs
router.post('/:id/inputs', authenticate, async (req, res, next) => {
  try {
    const assessment = await getAssessmentOwned(req.params.id, req.user._id);
    if (!assessment) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Assessment not found' } });

    // Handle both single input and batch
    const isBatch = Array.isArray(req.body.inputs);
    const inputsToCreate = isBatch ? req.body.inputs : [req.body];

    const createdInputs = [];

    for (const inputData of inputsToCreate) {
      const { category, subtype, quantity, unit, treatment } = inputData;

      if (!category || !VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: `category must be one of: ${VALID_CATEGORIES.join(', ')}`, field: 'category' } });
      }
      if (!subtype) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'subtype is required', field: 'subtype' } });
      if (!quantity || quantity <= 0) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'quantity must be > 0', field: 'quantity' } });
      if (!unit) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'unit is required', field: 'unit' } });
      if (category === 'waste' && treatment && !VALID_TREATMENTS.includes(treatment)) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: `treatment must be one of: ${VALID_TREATMENTS.join(', ')}`, field: 'treatment' } });
      }

      const input = await ProcessInput.create({
        assessment_id: assessment._id,
        category,
        subtype,
        quantity,
        unit,
        treatment: treatment || null,
      });

      createdInputs.push(input);
    }

    if (isBatch) {
      return res.status(201).json({
        success: true,
        data: {
          inputs: createdInputs.map((i) => ({
            id: i._id, assessment_id: i.assessment_id,
            category: i.category, subtype: i.subtype,
            quantity: i.quantity, unit: i.unit,
            treatment: i.treatment, computed_co2e: null,
          })),
        },
        meta: { unsupported_input: false },
      });
    }

    const i = createdInputs[0];
    res.status(201).json({
      success: true,
      data: {
        input: {
          id: i._id, assessment_id: i.assessment_id,
          category: i.category, subtype: i.subtype,
          quantity: i.quantity, unit: i.unit,
          treatment: i.treatment, computed_co2e: null,
        },
      },
      meta: { unsupported_input: false },
    });
  } catch (err) { next(err); }
});

// PATCH /assessments/:id/inputs/:inputId
router.patch('/:id/inputs/:inputId', authenticate, async (req, res, next) => {
  try {
    const assessment = await getAssessmentOwned(req.params.id, req.user._id);
    if (!assessment) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Assessment not found' } });

    const input = await ProcessInput.findOne({ _id: req.params.inputId, assessment_id: assessment._id });
    if (!input) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Input not found' } });

    const { category, subtype, quantity, unit, treatment } = req.body;
    if (category) input.category = category;
    if (subtype) input.subtype = subtype;
    if (quantity !== undefined) input.quantity = quantity;
    if (unit) input.unit = unit;
    if (treatment !== undefined) input.treatment = treatment;

    await input.save();
    res.json({ success: true, data: { input: { id: input._id, category: input.category, subtype: input.subtype, quantity: input.quantity, unit: input.unit, treatment: input.treatment, computed_co2e: input.computed_co2e } } });
  } catch (err) { next(err); }
});

// DELETE /assessments/:id/inputs/:inputId
router.delete('/:id/inputs/:inputId', authenticate, async (req, res, next) => {
  try {
    const assessment = await getAssessmentOwned(req.params.id, req.user._id);
    if (!assessment) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Assessment not found' } });

    const result = await ProcessInput.deleteOne({ _id: req.params.inputId, assessment_id: assessment._id });
    if (result.deletedCount === 0) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Input not found' } });

    res.json({ success: true, data: { deleted: true } });
  } catch (err) { next(err); }
});

// POST /assessments/:id/calculate
router.post('/:id/calculate', authenticate, async (req, res, next) => {
  try {
    const assessment = await getAssessmentOwned(req.params.id, req.user._id);
    if (!assessment) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Assessment not found' } });

    const result = await calculateEmissions(assessment._id);

    res.json({
      success: true,
      data: {
        assessment: {
          id: assessment._id,
          status: 'complete',
          total_co2e: result.total_co2e,
          completed_at: new Date().toISOString(),
        },
        unsupported_inputs: result.unsupported_inputs,
      },
      meta: { unsupported_inputs_count: result.unsupported_inputs_count },
    });
  } catch (err) { next(err); }
});

// GET /assessments/:id/summary
router.get('/:id/summary', authenticate, async (req, res, next) => {
  try {
    const assessment = await getAssessmentOwned(req.params.id, req.user._id);
    if (!assessment) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Assessment not found' } });

    const summary = await buildSummary(assessment._id);
    res.json({ success: true, data: summary });
  } catch (err) { next(err); }
});

// GET /assessments/:id/leak-points
router.get('/:id/leak-points', authenticate, async (req, res, next) => {
  try {
    const assessment = await getAssessmentOwned(req.params.id, req.user._id);
    if (!assessment) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Assessment not found' } });

    const result = await getLeakPoints(assessment._id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// GET /assessments/:id/recommendations
router.get('/:id/recommendations', authenticate, async (req, res, next) => {
  try {
    const assessment = await getAssessmentOwned(req.params.id, req.user._id);
    if (!assessment) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Assessment not found' } });

    const filters = {};
    if (req.query.leak_point) filters.leak_point = req.query.leak_point;
    if (req.query.category) filters.category = req.query.category;

    const recommendations = await getRecommendations(assessment._id, filters);
    res.json({ success: true, data: { recommendations } });
  } catch (err) { next(err); }
});

// POST /assessments/:id/recommendations/:recId/apply
router.post('/:id/recommendations/:recId/apply', authenticate, async (req, res, next) => {
  try {
    const assessment = await getAssessmentOwned(req.params.id, req.user._id);
    if (!assessment) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Assessment not found' } });

    const rec = await Recommendation.findOne({ _id: req.params.recId, assessment_id: assessment._id });
    if (!rec) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Recommendation not found' } });

    let roadmap_phase = req.body.roadmap_phase;
    if (roadmap_phase === undefined || roadmap_phase === null) {
      // Auto-bucket
      const intervention = await Intervention.findById(rec.intervention_id);
      roadmap_phase = intervention ? autoBucketPhase(intervention) : 1;
    }
    if (!VALID_ROADMAP_PHASES.includes(parseInt(roadmap_phase))) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'roadmap_phase must be 1, 2, or 3', field: 'roadmap_phase' } });
    }

    // Update recommendation status
    rec.status = 'applied';
    await rec.save();

    // Create AppliedIntervention
    const applied = await AppliedIntervention.create({
      assessment_id: assessment._id,
      recommendation_id: rec._id,
      roadmap_phase: parseInt(roadmap_phase),
    });

    res.json({
      success: true,
      data: {
        applied_intervention: {
          id: applied._id,
          assessment_id: applied.assessment_id,
          recommendation_id: applied.recommendation_id,
          applied_at: applied.applied_at,
          roadmap_phase: applied.roadmap_phase,
          status: applied.status,
        },
      },
    });
  } catch (err) { next(err); }
});

// POST /assessments/:id/recommendations/:recId/dismiss
router.post('/:id/recommendations/:recId/dismiss', authenticate, async (req, res, next) => {
  try {
    const assessment = await getAssessmentOwned(req.params.id, req.user._id);
    if (!assessment) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Assessment not found' } });

    const rec = await Recommendation.findOne({ _id: req.params.recId, assessment_id: assessment._id });
    if (!rec) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Recommendation not found' } });

    rec.status = 'dismissed';
    await rec.save();

    res.json({ success: true, data: { recommendation: { id: rec._id, status: 'dismissed' } } });
  } catch (err) { next(err); }
});

// POST /assessments/:id/simulate
router.post('/:id/simulate', authenticate, async (req, res, next) => {
  try {
    const assessment = await getAssessmentOwned(req.params.id, req.user._id);
    if (!assessment) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Assessment not found' } });

    const { selected_intervention_ids } = req.body;
    if (!Array.isArray(selected_intervention_ids) || selected_intervention_ids.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'selected_intervention_ids must be a non-empty array', field: 'selected_intervention_ids' } });
    }

    const result = await simulate(assessment._id, selected_intervention_ids);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// GET /assessments/:id/roadmap
router.get('/:id/roadmap', authenticate, async (req, res, next) => {
  try {
    const assessment = await getAssessmentOwned(req.params.id, req.user._id);
    if (!assessment) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Assessment not found' } });

    const appliedItems = await AppliedIntervention.find({ assessment_id: assessment._id });

    const roadmap = { phase_1: [], phase_2: [], phase_3: [] };

    for (const item of appliedItems) {
      const rec = await Recommendation.findById(item.recommendation_id);
      if (!rec) continue;
      const intervention = await Intervention.findById(rec.intervention_id);
      if (!intervention) continue;

      const costMidpoint = (intervention.estimated_cost_min + intervention.estimated_cost_max) / 2;
      const co2Midpoint = (intervention.estimated_co2_reduction_min + intervention.estimated_co2_reduction_max) / 2;

      // Priority based on score / difficulty
      let priority = 'medium';
      if (intervention.implementation_difficulty === 'low' || rec.score >= 70) priority = 'high';
      if (intervention.implementation_difficulty === 'high' && rec.score < 50) priority = 'low';

      const entry = {
        applied_intervention_id: item._id,
        name: intervention.name,
        priority,
        cost: Math.round(costMidpoint),
        co2_reduction: parseFloat(co2Midpoint.toFixed(1)),
        payback_period_months: intervention.payback_period_months,
        difficulty: intervention.implementation_difficulty,
        status: item.status,
      };

      const phaseKey = `phase_${item.roadmap_phase}`;
      if (roadmap[phaseKey]) roadmap[phaseKey].push(entry);
    }

    res.json({ success: true, data: { roadmap } });
  } catch (err) { next(err); }
});

// PATCH /assessments/:id/roadmap/:appliedInterventionId
router.patch('/:id/roadmap/:appliedInterventionId', authenticate, async (req, res, next) => {
  try {
    const assessment = await getAssessmentOwned(req.params.id, req.user._id);
    if (!assessment) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Assessment not found' } });

    const item = await AppliedIntervention.findOne({ _id: req.params.appliedInterventionId, assessment_id: assessment._id });
    if (!item) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Roadmap item not found' } });

    const { roadmap_phase, status } = req.body;
    if (!roadmap_phase && !status) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'At least one of roadmap_phase or status is required' } });
    }
    if (roadmap_phase && !VALID_ROADMAP_PHASES.includes(parseInt(roadmap_phase))) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'roadmap_phase must be 1, 2, or 3', field: 'roadmap_phase' } });
    }
    if (status && !VALID_ROADMAP_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: `status must be one of: ${VALID_ROADMAP_STATUSES.join(', ')}`, field: 'status' } });
    }

    if (roadmap_phase) item.roadmap_phase = parseInt(roadmap_phase);
    if (status) item.status = status;
    await item.save();

    res.json({
      success: true,
      data: {
        applied_intervention: {
          id: item._id, assessment_id: item.assessment_id,
          recommendation_id: item.recommendation_id,
          roadmap_phase: item.roadmap_phase,
          status: item.status,
        },
      },
    });
  } catch (err) { next(err); }
});

// DELETE /assessments/:id/roadmap/:appliedInterventionId
router.delete('/:id/roadmap/:appliedInterventionId', authenticate, async (req, res, next) => {
  try {
    const assessment = await getAssessmentOwned(req.params.id, req.user._id);
    if (!assessment) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Assessment not found' } });

    const item = await AppliedIntervention.findOne({ _id: req.params.appliedInterventionId, assessment_id: assessment._id });
    if (!item) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Roadmap item not found' } });

    // Revert recommendation to suggested
    await Recommendation.findByIdAndUpdate(item.recommendation_id, { status: 'suggested' });
    await item.deleteOne();

    res.json({ success: true, data: { deleted: true } });
  } catch (err) { next(err); }
});

// GET /assessments/:id/history
router.get('/:id/history', authenticate, async (req, res, next) => {
  try {
    const assessment = await getAssessmentOwned(req.params.id, req.user._id);
    if (!assessment) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Assessment not found' } });

    // Return all history for this facility
    const history = await AssessmentHistory.find({ facility_id: assessment.facility_id }).sort({ recorded_at: 1 });

    res.json({
      success: true,
      data: {
        history: history.map((h) => ({
          assessment_id: h.assessment_id,
          total_co2e: h.total_co2e,
          recorded_at: h.recorded_at,
        })),
      },
    });
  } catch (err) { next(err); }
});

// GET /assessments/:id/export
router.get('/:id/export', authenticate, async (req, res, next) => {
  try {
    const assessment = await getAssessmentOwned(req.params.id, req.user._id);
    if (!assessment) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Assessment not found' } });
    if (assessment.status !== 'complete') {
      return res.status(400).json({ success: false, error: { code: 'ASSESSMENT_INCOMPLETE', message: 'Cannot export a draft assessment' } });
    }

    const format = (req.query.format || 'csv').toLowerCase();
    if (!['pdf', 'csv', 'html'].includes(format)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'format must be pdf, csv, or html', field: 'format' } });
    }

    const facility = await Facility.findById(assessment.facility_id);
    const { buildSummary } = require('../services/calculationEngine');
    const { getLeakPoints } = require('../services/leakAnalysis');
    const { getRecommendations } = require('../services/recommendationEngine');

    const summary = await buildSummary(assessment._id);
    const { leak_points } = await getLeakPoints(assessment._id);
    const recommendations = await getRecommendations(assessment._id);

    if (format === 'csv') {
      const csvContent = generateCSV(facility, assessment, summary, leak_points, recommendations);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="emission-report-${assessment._id}.csv"`);
      return res.send(csvContent);
    }

    // PDF & HTML: return text report + metadata response (JSON envelope)
    const textContent = generateTextReport(facility, assessment, summary, leak_points, recommendations);

    if (format === 'pdf' || format === 'html') {
      // For hackathon: serve as downloadable text file
      // In production: use pdfkit to generate actual PDF
      const filename = `emission-report-${assessment._id}.txt`;
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(textContent);
    }
  } catch (err) { next(err); }
});

module.exports = router;
