const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const appliedInterventionSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  assessment_id: { type: String, ref: 'Assessment', required: true },
  recommendation_id: { type: String, ref: 'Recommendation', required: true },
  roadmap_phase: { type: Number, enum: [1, 2, 3], required: true },
  status: { type: String, enum: ['planned', 'in_progress', 'completed'], default: 'planned' },
  applied_at: { type: Date, default: Date.now },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('AppliedIntervention', appliedInterventionSchema);
