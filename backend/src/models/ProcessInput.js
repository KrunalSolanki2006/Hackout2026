const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const processInputSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  assessment_id: { type: String, ref: 'Assessment', required: true },
  category: { type: String, enum: ['energy', 'material', 'waste'], required: true },
  subtype: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true },
  treatment: { type: String, enum: ['landfill', 'recycling', 'incineration', 'energy_recovery', 'composting', null], default: null },
  emission_factor_id: { type: String, default: null },
  computed_co2e: { type: Number, default: null },
  unsupported: { type: Boolean, default: false },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('ProcessInput', processInputSchema);
