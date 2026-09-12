const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const assessmentHistorySchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  facility_id: { type: String, ref: 'Facility', required: true },
  assessment_id: { type: String, ref: 'Assessment', required: true },
  total_co2e: { type: Number, required: true },
  recorded_at: { type: Date, default: Date.now },
}, { timestamps: false });

module.exports = mongoose.model('AssessmentHistory', assessmentHistorySchema);
