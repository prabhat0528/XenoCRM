require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  console.warn('Could not set DNS servers:', e.message);
}
const mongoose = require('mongoose');
const { connectDB } = require('./utils/db');
const Campaign = require('./models/Campaign');
const Job = require('./models/Job');

async function test() {
  try {
    await connectDB();
    console.log('Connected to DB.');
    
    // Find a campaign
    const campaign = await Campaign.findOne({});
    if (!campaign) {
      console.log('No campaigns found in DB. Creating one for testing...');
      const newCampaign = await Campaign.create({
        name: 'Test Diagnostic Campaign',
        segmentCriteria: { city: 'Delhi' },
        messageTemplate: 'Hi {{name}}',
        channel: 'WhatsApp',
        status: 'Draft'
      });
      console.log('Created campaign:', newCampaign._id);
      return await runSendLogic(newCampaign);
    }
    
    console.log('Found campaign:', campaign._id);
    await runSendLogic(campaign);
  } catch (err) {
    console.error('Test script crashed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

async function runSendLogic(campaign) {
  try {
    console.log('Attempting to reset tracker fields...');
    campaign.status = 'Queued';
    campaign.sentCount = 0;
    campaign.deliveredCount = 0;
    campaign.failedCount = 0;
    campaign.openedCount = 0;
    campaign.readCount = 0;
    campaign.clickedCount = 0;
    campaign.conversionCount = 0;
    
    await campaign.save();
    console.log('Saved campaign state successfully.');

    console.log('Attempting to create background job...');
    const job = await Job.create({
      campaignId: String(campaign._id),
      status: 'Pending',
      runAt: new Date()
    });
    console.log('Created Job successfully! Job ID:', job._id);
  } catch (err) {
    console.error('CRITICAL ERROR in send logic:', err);
  }
}

test();
