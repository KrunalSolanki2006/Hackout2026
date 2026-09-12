const mongoose = require('mongoose');

const interventionSchema = new mongoose.Schema({
  _id: { type: String },
  name: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String },
  supported_industries: [{ type: String }],
  applicable_leak_types: [{ type: String }],
  estimated_cost_min: { type: Number, required: true },
  estimated_cost_max: { type: Number, required: true },
  estimated_co2_reduction_min: { type: Number, required: true },
  estimated_co2_reduction_max: { type: Number, required: true },
  implementation_difficulty: { type: String, enum: ['low', 'medium', 'high'], required: true },
  payback_period_months: { type: Number, required: true },
  roi_pct: { type: Number, required: true },
  explanation: { type: String },
}, { timestamps: false });

module.exports = mongoose.model('Intervention', interventionSchema);
