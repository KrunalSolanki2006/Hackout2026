const express = require('express');
const Facility = require('../models/Facility');
const Assessment = require('../models/Assessment');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const VALID_INDUSTRIES = ['plastic', 'textile', 'food_processing'];
const VALID_SIZES = ['small', 'medium', 'large'];

function formatFacility(f) {
  return {
    id: f._id,
    owner_user_id: f.owner_user_id,
    name: f.name,
    industry: f.industry,
    facility_size: f.facility_size,
    region: f.region,
    production_volume: f.production_volume,
    created_at: f.created_at,
  };
}

// POST /facilities
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { name, industry, facility_size, region, production_volume } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'name is required', field: 'name' } });
    if (!industry || !VALID_INDUSTRIES.includes(industry)) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: `industry must be one of: ${VALID_INDUSTRIES.join(', ')}`, field: 'industry' } });
    if (!facility_size || !VALID_SIZES.includes(facility_size)) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: `facility_size must be one of: ${VALID_SIZES.join(', ')}`, field: 'facility_size' } });
    if (!region || !region.trim()) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'region is required', field: 'region' } });
    if (production_volume !== undefined && production_volume !== null && production_volume <= 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'production_volume must be > 0', field: 'production_volume' } });
    }

    const facility = await Facility.create({
      owner_user_id: req.user._id,
      name: name.trim(),
      industry,
      facility_size,
      region: region.trim(),
      production_volume: production_volume || null,
    });

    res.status(201).json({ success: true, data: { facility: formatFacility(facility) } });
  } catch (err) { next(err); }
});

// GET /facilities
router.get('/', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const page_size = parseInt(req.query.page_size) || 20;
    const skip = (page - 1) * page_size;

    const facilities = await Facility.find({ owner_user_id: req.user._id })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(page_size);

    res.json({ success: true, data: { facilities: facilities.map(formatFacility) } });
  } catch (err) { next(err); }
});

// GET /facilities/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const facility = await Facility.findOne({ _id: req.params.id, owner_user_id: req.user._id });
    if (!facility) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Facility not found' } });
    res.json({ success: true, data: { facility: formatFacility(facility) } });
  } catch (err) { next(err); }
});

// PATCH /facilities/:id
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const facility = await Facility.findOne({ _id: req.params.id, owner_user_id: req.user._id });
    if (!facility) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Facility not found' } });

    const { name, industry, facility_size, region, production_volume } = req.body;
    if (industry && !VALID_INDUSTRIES.includes(industry)) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid industry', field: 'industry' } });
    if (facility_size && !VALID_SIZES.includes(facility_size)) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid facility_size', field: 'facility_size' } });

    if (name) facility.name = name.trim();
    if (industry) facility.industry = industry;
    if (facility_size) facility.facility_size = facility_size;
    if (region) facility.region = region.trim();
    if (production_volume !== undefined) facility.production_volume = production_volume;

    await facility.save();
    res.json({ success: true, data: { facility: formatFacility(facility) } });
  } catch (err) { next(err); }
});

// POST /facilities/:id/assessments
router.post('/:id/assessments', authenticate, async (req, res, next) => {
  try {
    const facility = await Facility.findOne({ _id: req.params.id, owner_user_id: req.user._id });
    if (!facility) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Facility not found' } });

    const assessment = await Assessment.create({
      facility_id: facility._id,
      owner_user_id: req.user._id,
    });

    res.status(201).json({
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
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
