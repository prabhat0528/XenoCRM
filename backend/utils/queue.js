const axios = require('axios');
const Job = require('../models/Job');
const Campaign = require('../models/Campaign');
const Customer = require('../models/Customer');
const CommunicationLog = require('../models/CommunicationLog');

function buildMongoQuery(criteria) {
  const query = {};
  
  if (!criteria) return query;

  // Direct MongoDB Query if provided by AI
  if (criteria.mongoQuery) {
    // If it's a string, parse it
    if (typeof criteria.mongoQuery === 'string') {
      try {
        return JSON.parse(criteria.mongoQuery);
      } catch (e) {
        console.error('Failed to parse criteria.mongoQuery:', e);
      }
    } else {
      return criteria.mongoQuery;
    }
  }

  // Handle structured rules
  if (criteria.city) {
    query.city = criteria.city;
  }
  
  if (criteria.totalSpentMin !== undefined) {
    query.totalSpent = { $gte: Number(criteria.totalSpentMin) };
  }
  
  if (criteria.totalOrdersMin !== undefined) {
    query.totalOrders = { $gte: Number(criteria.totalOrdersMin) };
  }
  
  if (criteria.inactiveDays !== undefined) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - Number(criteria.inactiveDays));
    query.lastOrderDate = { $lte: cutoffDate };
  }

  if (criteria.gender) {
    query['demographics.gender'] = criteria.gender;
  }

  if (criteria.ageMin !== undefined || criteria.ageMax !== undefined) {
    query['demographics.age'] = {};
    if (criteria.ageMin !== undefined) query['demographics.age'].$gte = Number(criteria.ageMin);
    if (criteria.ageMax !== undefined) query['demographics.age'].$lte = Number(criteria.ageMax);
  }

  return query;
}

function compileTemplate(template, customer) {
  if (!template) return '';
  return template
    .replace(/\{{1,2}(name|customer_name)\}{1,2}/gi, customer.name || '')
    .replace(/\{{1,2}(totalSpent|total_spent)\}{1,2}/gi, customer.totalSpent !== undefined ? customer.totalSpent : 0)
    .replace(/\{{1,2}city\}{1,2}/gi, customer.city || '')
    .replace(/\{{1,2}(totalOrders|total_orders)\}{1,2}/gi, customer.totalOrders !== undefined ? customer.totalOrders : 0);
}

let isProcessing = false;

async function processNextJob() {
  if (isProcessing) return;
  
  // Find one pending job
  const job = await Job.findOne({
    status: 'Pending',
    runAt: { $lte: new Date() }
  });

  if (!job) return;

  isProcessing = true;
  job.status = 'Processing';
  job.attempts += 1;
  await job.save();

  console.log(`[Queue Worker] Processing Job ID: ${job._id} for Campaign ID: ${job.campaignId}`);

  try {
    const campaign = await Campaign.findById(job.campaignId);
    if (!campaign) {
      throw new Error(`Campaign with ID ${job.campaignId} not found`);
    }

    campaign.status = 'Processing';
    await campaign.save();

    // 1. Build Query and find matching customers
    const mongoQuery = buildMongoQuery(campaign.segmentCriteria);
    console.log(`[Queue Worker] Segment Query built:`, JSON.stringify(mongoQuery));
    
    const customers = await Customer.find(mongoQuery);
    console.log(`[Queue Worker] Found ${customers.length} target customers for campaign.`);

    if (customers.length === 0) {
      campaign.status = 'Completed';
      await campaign.save();
      job.status = 'Completed';
      await job.save();
      isProcessing = false;
      return;
    }

    // 2. Dispatch messages sequentially with a small delay to avoid triggering Render's rate limiters
    for (const customer of customers) {
      const personalizedMessage = compileTemplate(campaign.messageTemplate, customer);
      
      // Create a PENDING communication log
      const log = await CommunicationLog.create({
        customerId: customer._id,
        campaignId: campaign._id,
        message: personalizedMessage,
        channel: campaign.channel,
        status: 'PENDING',
        events: [{ status: 'PENDING', timestamp: new Date() }]
      });

      // Recipient address depends on channel
      const recipient = (campaign.channel === 'Email') ? customer.email : customer.phone;

      // Send to Channel Service
      try {
        const payload = {
          logId: log._id,
          recipient,
          channel: campaign.channel,
          message: personalizedMessage,
          callbackUrl: process.env.CALLBACK_URL || 'https://xenocrm-backend-wuqn.onrender.com/api/webhooks/delivery-callback'
        };

        const channelUrl = `${process.env.CHANNEL_SERVICE_URL || 'https://xenocrm-channel-service.onrender.com'}/api/send`;
        
        // Retry logic for rate limits and cold-start timeouts
        let success = false;
        let dispatchAttempts = 0;
        const maxDispatchAttempts = 5;
        
        while (!success && dispatchAttempts < maxDispatchAttempts) {
          try {
            dispatchAttempts++;
            // 45 seconds timeout to allow sleeping Render instances to wake up
            await axios.post(channelUrl, payload, { timeout: 45000 });
            success = true;
          } catch (err) {
            const status = err.response ? err.response.status : null;
            // Retry on rate limit, gateway proxy errors, or request timeouts
            const isRetryable = 
              status === 429 || 
              status === 502 || 
              status === 503 || 
              status === 504 || 
              err.code === 'ECONNABORTED' || 
              err.message.includes('timeout') ||
              !err.response; // Network connection drops/timeouts

            if (isRetryable && dispatchAttempts < maxDispatchAttempts) {
              let retrySeconds = 5; // Default 5 seconds cooldown to let server boot/recover
              if (status === 429) {
                retrySeconds = 3;
                const retryHeader = err.response.headers && err.response.headers['retry-after'];
                if (retryHeader) {
                  const parsed = parseInt(retryHeader, 10);
                  if (!isNaN(parsed)) {
                    retrySeconds = parsed;
                  }
                }
              }
              console.warn(`[Queue Worker] Retryable error (${status || err.code || 'Network/Timeout'}) when sending to ${customer.name}. Retrying in ${retrySeconds}s... (Attempt ${dispatchAttempts}/${maxDispatchAttempts})`);
              await new Promise(resolve => setTimeout(resolve, retrySeconds * 1000));
            } else {
              throw err; // Fail if it's not retryable or we ran out of attempts
            }
          }
        }
        
        // Update local log status to SENT (will be updated further via webhook callbacks)
        log.status = 'SENT';
        log.events.push({ status: 'SENT', timestamp: new Date() });
        await log.save();
        
        // Update campaign aggregated send count
        await Campaign.updateOne({ _id: campaign._id }, { $inc: { sentCount: 1 } });
      } catch (err) {
        console.error(`[Queue Worker] Failed dispatching to customer ${customer.name}:`, err.message);
        log.status = 'FAILED';
        log.events.push({ status: 'FAILED', timestamp: new Date(), error: err.message });
        await log.save();
        
        // Update campaign failed count
        await Campaign.updateOne({ _id: campaign._id }, { $inc: { failedCount: 1 } });
      }

      // Introduce a 1000ms (1s) throttle delay to avoid 429 Too Many Requests from Render's load balancer
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    campaign.status = 'Completed';
    await campaign.save();

    job.status = 'Completed';
    await job.save();
    console.log(`[Queue Worker] Job ID ${job._id} Completed successfully!`);
  } catch (err) {
    console.error(`[Queue Worker] Error executing Job ID ${job._id}:`, err);
    job.status = (job.attempts >= job.maxAttempts) ? 'Failed' : 'Pending';
    job.error = err.message;
    
    // Push runAt forward slightly for retry
    const retryDate = new Date();
    retryDate.setSeconds(retryDate.getSeconds() + 30); // Retry in 30 seconds
    job.runAt = retryDate;
    await job.save();

    if (job.status === 'Failed') {
      await Campaign.updateOne({ _id: job.campaignId }, { $set: { status: 'Failed' } });
    }
  } finally {
    isProcessing = false;
  }
}

// Simple loop to poll for jobs
let intervalId = null;

function startQueue() {
  if (intervalId) return;
  console.log('[Queue Worker] Background queue processing initialized.');
  intervalId = setInterval(async () => {
    try {
      await processNextJob();
    } catch (e) {
      console.error('[Queue Worker] Queue poll error:', e);
    }
  }, 2000); // Poll every 2 seconds
}

function stopQueue() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[Queue Worker] Background queue processing stopped.');
  }
}

module.exports = {
  startQueue,
  stopQueue,
  buildMongoQuery
};
