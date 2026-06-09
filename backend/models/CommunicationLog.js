const { getModel } = require('../utils/db');

const CommunicationLogSchema = {
  customerId: { type: String, required: true },
  campaignId: { type: String, required: true },
  message: { type: String, required: true }, // Fully personalized message content
  channel: { type: String, required: true }, // "SMS", "Email", "WhatsApp", "RCS"
  status: { type: String, default: 'PENDING' }, // "PENDING", "SENT", "DELIVERED", "FAILED", "OPENED", "READ", "CLICKED", "PURCHASED"
  events: { type: [Object], default: [] } // Historical array of status updates: { status, timestamp }
};

module.exports = getModel('CommunicationLog', CommunicationLogSchema);
