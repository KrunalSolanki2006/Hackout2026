const mongoose = require('mongoose');

const emissionFactorSchema = new mongoose.Schema({
  _id: { type: String },
  category: { type: String, required: true },
  subtype: { type: String, required: true },
  unit: { type: String, required: true },
  emission_factor: { type: Number, required: true },
  factor_unit: { type: String, required: true },
  source: { type: String, required: true },
  scope: { type: Number, enum: [1, 2, 3], required: true },
  last_updated: { type: String },
}, { timestamps: false });

// Compound index for efficient lookup
emissionFactorSchema.index({ category: 1, subtype: 1 });

module.exports = mongoose.model('EmissionFactor', emissionFactorSchema);
