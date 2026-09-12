const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const assessmentSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  facility_id: { type: String, ref: 'Facility', required: true },
  owner_user_id: { type: String, ref: 'User', required: true },
  status: { type: String, enum: ['draft', 'complete'], default: 'draft' },
  total_co2e: { type: Number, default: null },
  completed_at: { type: Date, default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Assessment', assessmentSchema);
