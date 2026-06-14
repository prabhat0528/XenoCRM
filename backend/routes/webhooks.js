const express = require('express');
const router = express.Router();
const CommunicationLog = require('../models/CommunicationLog');
const Campaign = require('../models/Campaign');

// Webhook endpoint to receive delivery callbacks
router.post('/delivery-callback', async (req, res) => {
  try {
    const { logId, status } = req.body;
    if (!logId || !status) {
      return res.status(400).json({ error: 'logId and status are required.' });
    }

    const log = await CommunicationLog.findById(logId);
    if (!log) {
      return res.status(404).json({ error: `Communication log ${logId} not found.` });
    }

    // To avoid double counting, check if this status was already logged
    const alreadyExists = log.events.some(e => e.status === status);

    // Capture the state transition
    const oldStatus = log.status;
    log.status = status;
    log.events.push({ status, timestamp: new Date() });
    await log.save();

    console.log(`[Webhook] Log ID ${logId} updated: ${oldStatus} -> ${status}`);

    if (alreadyExists) {
      console.log(`[Webhook] Status ${status} already logged for Log ID ${logId}. Skipping campaign count increment.`);
      return res.json({ success: true, message: `Status ${status} already logged, skipping count increment.` });
    }

    // Update Campaign aggregated counts depending on the event
    // Mongoose `$inc` is atomic and safe
    const updateInc = {};
    
    switch (status) {
      case 'DELIVERED':
        updateInc.deliveredCount = 1;
        break;
      case 'FAILED':
        updateInc.failedCount = 1;
        break;
      case 'OPENED':
        updateInc.openedCount = 1;
        break;
      case 'READ':
        updateInc.readCount = 1;
        break;
      case 'CLICKED':
        updateInc.clickedCount = 1;
        break;
      case 'PURCHASED':
        updateInc.conversionCount = 1;
        break;
      default:
        break;
    }

    if (Object.keys(updateInc).length > 0) {
      await Campaign.updateOne({ _id: log.campaignId }, { $inc: updateInc });
    }

    res.json({ success: true, message: `Status updated to ${status}` });
  } catch (err) {
    console.error('[Webhook Error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
