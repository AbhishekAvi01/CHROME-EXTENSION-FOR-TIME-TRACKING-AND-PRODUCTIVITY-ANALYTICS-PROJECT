const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  url: { type: String, required: true },
  domain: { type: String, required: true, lowercase: true },
  title: { type: String },
  startTime: { type: Number, required: true },
  endTime: { type: Number, required: true },
  duration: { type: Number, required: true, min: 0 }, // in seconds
  date: { type: String, required: true } // YYYY-MM-DD
}, { timestamps: true });

// Create indexes for efficient queries
activitySchema.index({ userId: 1, date: 1 });
activitySchema.index({ userId: 1, domain: 1 });
activitySchema.index({ date: 1 });
activitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // Auto-delete after 90 days

module.exports = mongoose.model('Activity', activitySchema);
