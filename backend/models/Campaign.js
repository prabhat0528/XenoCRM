const { getModel } = require('../utils/db');

const CampaignSchema = {
  name: { type: String, required: true },
  segmentCriteria: { type: Object, required: true }, // Filter parameters or NLP queries
  messageTemplate: { type: String, required: true }, // e.g. "Hi {{name}}, we have 20% off for you!"
  channel: { type: String, required: true }, // "SMS", "Email", "WhatsApp", "RCS"
  status: { type: String, default: 'Draft' }, // "Draft", "Queued", "Processing", "Completed", "Failed"
  sentCount: { type: Number, default: 0 },
  deliveredCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  openedCount: { type: Number, default: 0 },
  readCount: { type: Number, default: 0 },
  clickedCount: { type: Number, default: 0 },
  conversionCount: { type: Number, default: 0 }
};

module.exports = getModel('Campaign', CampaignSchema);
