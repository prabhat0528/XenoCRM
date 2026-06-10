const express = require('express');
const router = express.Router();
const axios = require('axios');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const { buildMongoQuery } = require('../utils/queue');

// Evaluate segment size based on criteria rules (without saving)
router.post('/evaluate', async (req, res) => {
  try {
    const criteria = req.body;
    const mongoQuery = buildMongoQuery(criteria);
    const count = await Customer.countDocuments(mongoQuery);
    res.json({ count, mongoQuery });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Parse natural language segment query using AI Service
router.post('/ai-parse', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required.' });
    }

    const aiServiceUrl = `${process.env.AI_SERVICE_URL || 'http://localhost:5002'}/api/ai/segment`;
    
    let aiResponse;
    try {
      const response = await axios.post(aiServiceUrl, { query }, { timeout: 3000 });
      aiResponse = response.data;
    } catch (err) {
      console.warn('⚠️ AI Service failed or timed out. Falling back to backend rules parsing.', err.message);
      // Fallback rule parser in Javascript in case AI service is offline
      aiResponse = fallbackNLPParser(query);
    }

    const mongoQuery = buildMongoQuery(aiResponse.criteria);
    const count = await Customer.countDocuments(mongoQuery);

    res.json({
      criteria: aiResponse.criteria,
      mongoQuery: mongoQuery,
      explanation: aiResponse.explanation || 'Backend parsed filter',
      audienceSize: count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Simple regex fallback parser if Python AI service is down
function fallbackNLPParser(text) {
  const queryLower = text.toLowerCase();
  const criteria = {};
  let explanation = 'Offline fallback parsed: ';

  // Match city e.g. "Delhi", "Mumbai"
  const cityMatch = text.match(/in\s+([A-Z][a-z]+)/) || text.match(/from\s+([A-Z][a-z]+)/);
  if (cityMatch) {
    criteria.city = cityMatch[1];
    explanation += `City = ${criteria.city}; `;
  }

  // Match spending e.g. "spent more than 5000", "spending > 5000"
  const spentMatch = queryLower.match(/(spent|spending|spent\s+more\s+than)\s*(?:rs\.?|₹)?\s*(\d+)/i) 
                  || queryLower.match(/>\s*(\d+)/);
  if (spentMatch) {
    criteria.totalSpentMin = Number(spentMatch[2] || spentMatch[1]);
    explanation += `Spent >= ₹${criteria.totalSpentMin}; `;
  }

  // Match orders e.g. "ordered more than 5 times", "orders > 3"
  const ordersMatch = queryLower.match(/(ordered|orders|purchases)\s*(?:more\s+than|>)?\s*(\d+)/i);
  if (ordersMatch) {
    criteria.totalOrdersMin = Number(ordersMatch[2]);
    explanation += `Orders >= ${criteria.totalOrdersMin}; `;
  }

  // Match inactivity e.g. "90 days ago", "3 months ago", "inactive for 60 days"
  const inactiveMatch = queryLower.match(/inactive\s*(?:for)?\s*(\d+)\s*days/i)
                     || queryLower.match(/last\s*order\s*(?:more\s*than)?\s*(\d+)\s*days\s*ago/i);
  if (inactiveMatch) {
    criteria.inactiveDays = Number(inactiveMatch[1]);
    explanation += `Inactive >= ${criteria.inactiveDays} days; `;
  } else if (queryLower.includes('3 months')) {
    criteria.inactiveDays = 90;
    explanation += `Inactive >= 90 days; `;
  }

  if (Object.keys(criteria).length === 0) {
    explanation = 'Could not parse query. Returning all customers.';
  }

  return { criteria, explanation };
}

// Get segment members with their nested orders
router.post('/members', async (req, res) => {
  try {
    const criteria = req.body;
    const mongoQuery = buildMongoQuery(criteria);
    const customers = await Customer.find(mongoQuery).lean();

    // Enrich customers with their order history
    const enrichedMembers = await Promise.all(customers.map(async (c) => {
      const orders = await Order.find({ customerId: c._id }).sort({ orderDate: -1 }).lean();
      return {
        ...c,
        orders
      };
    }));

    res.json(enrichedMembers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
