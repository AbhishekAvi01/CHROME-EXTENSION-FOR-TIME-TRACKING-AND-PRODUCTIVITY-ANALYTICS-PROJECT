const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  domain: { type: String, required: true, lowercase: true },
  type: { type: String, enum: ['productive', 'unproductive', 'neutral'], default: 'neutral' }
}, { timestamps: true });


categorySchema.index({ userId: 1, domain: 1 }, { unique: true });
categorySchema.index({ userId: 1 });

module.exports = mongoose.model('Category', categorySchema);
