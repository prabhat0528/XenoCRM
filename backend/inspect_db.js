require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('./utils/db');
const Campaign = require('./models/Campaign');
const Job = require('./models/Job');
const CommunicationLog = require('./models/CommunicationLog');

async function inspect() {
  try {
    await connectDB();
    console.log('\n--- Campaigns ---');
    const campaigns = await Campaign.find({});
    campaigns.forEach(c => {
      console.log(`ID: ${c._id} | Name: "${c.name}" | Status: ${c.status} | Template: "${c.messageTemplate}" | Channel: ${c.channel}`);
    });

    console.log('\n--- Jobs ---');
    const jobs = await Job.find({});
    jobs.forEach(j => {
      console.log(`ID: ${j._id} | CampaignId: ${j.campaignId} | Status: ${j.status} | Error: ${j.error}`);
    });

    console.log('\n--- Communication Logs ---');
    const logs = await CommunicationLog.find({});
    logs.forEach(l => {
      console.log(`ID: ${l._id} | CampaignId: ${l.campaignId} | Status: ${l.status} | Msg: "${l.message}"`);
    });

  } catch (err) {
    console.error('Inspection failed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

inspect();
