const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const facilitySchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  owner_user_id: { type: String, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  industry: { type: String, enum: ['plastic', 'textile', 'food_processing'], required: true },
  facility_size: { type: String, enum: ['small', 'medium', 'large'], required: true },
  region: { type: String, required: true, trim: true },
  production_volume: { type: Number, min: 0, default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Facility', facilitySchema);
