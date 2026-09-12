const express = require('express');
const EmissionFactor = require('../models/EmissionFactor');
const Intervention = require('../models/Intervention');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /emission-factors
router.get('/emission-factors', authenticate, async (req, res, next) => {
  try {
    const factors = await EmissionFactor.find({});
    res.json({ success: true, data: { emission_factors: factors } });
  } catch (err) { next(err); }
});

// GET /interventions
router.get('/interventions', authenticate, async (req, res, next) => {
  try {
    const interventions = await Intervention.find({});
    res.json({ success: true, data: { interventions } });
  } catch (err) { next(err); }
});

module.exports = router;
