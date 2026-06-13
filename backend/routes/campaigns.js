const express = require('express');
const router = express.Router();
const Campaign = require('../models/Campaign');
const Job = require('../models/Job');
const CommunicationLog = require('../models/CommunicationLog');
const Customer = require('../models/Customer');

// Create a campaign
router.post('/', async (req, res) => {
  try {
    const { name, segmentCriteria, messageTemplate, channel } = req.body;
    if (!name || !segmentCriteria || !messageTemplate || !channel) {
      return res.status(400).json({ error: 'All fields (name, segmentCriteria, messageTemplate, channel) are required.' });
    }

    const campaign = await Campaign.create({
      name,
      segmentCriteria,
      messageTemplate,
      channel,
      status: 'Draft'
    });
    res.status(201).json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all campaigns
router.get('/', async (req, res) => {
  try {
    const campaigns = await Campaign.find({});
    // Sort newest first
    campaigns.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get campaign details and logs
router.get('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Fetch communication logs
    const logs = await CommunicationLog.find({ campaignId: campaign._id });
    
    // Enrich logs with customer details
    const enrichedLogs = await Promise.all(logs.map(async (logDoc) => {
      const log = typeof logDoc.toObject === 'function' ? logDoc.toObject() : logDoc;
      const customer = await Customer.findById(log.customerId);
      return {
        ...log,
        customerName: customer ? customer.name : 'Unknown',
        customerContact: customer ? (campaign.channel === 'Email' ? customer.email : customer.phone) : 'N/A'
      };
    }));

    res.json({
      campaign,
      logs: enrichedLogs
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Launch campaign (dispatch background job)
router.post('/:id/send', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status === 'Processing' || campaign.status === 'Queued') {
      return res.status(400).json({ error: 'Campaign is already queued or processing.' });
    }

    // Defensive fallback: if segmentCriteria is undefined/missing in DB, default it to {}
    if (!campaign.segmentCriteria) {
      campaign.segmentCriteria = {};
    }

    // Reset status trackers for retry/re-run
    campaign.status = 'Queued';
    campaign.sentCount = 0;
    campaign.deliveredCount = 0;
    campaign.failedCount = 0;
    campaign.openedCount = 0;
    campaign.readCount = 0;
    campaign.clickedCount = 0;
    campaign.conversionCount = 0;
    await campaign.save();

    // Create queue execution Job
    const job = await Job.create({
      campaignId: String(campaign._id),
      status: 'Pending',
      runAt: new Date()
    });

    res.json({ message: 'Campaign queued for dispatch.', campaign, jobId: job._id });
  } catch (err) {
    console.error('[Campaign Send Endpoint Error]', err);
    res.status(500).json({ error: err.message });
  }
});


// Clear all campaign data (for clean testing)
router.delete('/all', async (req, res) => {
  try {
    await Campaign.deleteMany({});
    await Job.deleteMany({});
    await CommunicationLog.deleteMany({});
    res.json({ message: 'All campaigns, background jobs, and dispatch logs cleared.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
