const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const recommendationSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  assessment_id: { type: String, ref: 'Assessment', required: true },
  intervention_id: { type: String, ref: 'Intervention', required: true },
  score: { type: Number, required: true },
  score_source: { type: String, enum: ['ml', 'rule_based'], required: true },
  explanation: [{ type: String }],
  applicable_leak_point: { type: String, default: null },
  status: { type: String, enum: ['suggested', 'applied', 'dismissed'], default: 'suggested' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Recommendation', recommendationSchema);
