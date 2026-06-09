const { getModel } = require('../utils/db');

const JobSchema = {
  campaignId: { type: String, required: true },
  status: { type: String, default: 'Pending' }, // "Pending", "Processing", "Completed", "Failed"
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  error: { type: String, default: null },
  runAt: { type: Date, default: () => new Date() }
};

module.exports = getModel('Job', JobSchema);
