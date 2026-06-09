const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Campaign = require('../models/Campaign');

router.get('/summary', async (req, res) => {
  try {
    const customers = await Customer.find({});
    const orders = await Order.find({});
    const campaigns = await Campaign.find({});

    // 1. Calculate General CRM Metrics
    const customerCount = customers.length;
    const orderCount = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

    // 2. Calculate Campaign Engagement Rates
    let sent = 0;
    let delivered = 0;
    let failed = 0;
    let opened = 0;
    let read = 0;
    let clicked = 0;
    let purchased = 0;

    campaigns.forEach(c => {
      sent += c.sentCount || 0;
      delivered += c.deliveredCount || 0;
      failed += c.failedCount || 0;
      opened += c.openedCount || 0;
      read += c.readCount || 0;
      clicked += c.clickedCount || 0;
      purchased += c.conversionCount || 0;
    });

    const rates = {
      deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
      openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
      readRate: delivered > 0 ? (read / delivered) * 100 : 0,
      clickRate: delivered > 0 ? (clicked / delivered) * 100 : 0,
      conversionRate: delivered > 0 ? (purchased / delivered) * 100 : 0
    };

    // 3. Channel Distribution
    const channels = { SMS: 0, Email: 0, WhatsApp: 0, RCS: 0 };
    campaigns.forEach(c => {
      if (channels[c.channel] !== undefined) {
        channels[c.channel] += c.sentCount || 0;
      }
    });

    // 4. Product Sales Summary
    const productStats = {};
    orders.forEach(o => {
      if (Array.isArray(o.products)) {
        o.products.forEach(p => {
          productStats[p] = (productStats[p] || 0) + 1;
        });
      }
    });

    const topProducts = Object.entries(productStats)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 5. Recent Campaign Activity
    const recentCampaigns = campaigns
      .slice(0, 5)
      .map(c => ({
        id: c._id,
        name: c.name,
        channel: c.channel,
        status: c.status,
        sent: c.sentCount || 0,
        delivered: c.deliveredCount || 0,
        opened: c.openedCount || 0,
        purchased: c.conversionCount || 0,
        conversionRate: c.deliveredCount > 0 ? ((c.conversionCount || 0) / c.deliveredCount) * 100 : 0
      }));

    res.json({
      summary: {
        customerCount,
        orderCount,
        totalRevenue,
        campaignCount: campaigns.length
      },
      campaignPerformance: {
        sent,
        delivered,
        failed,
        opened,
        read,
        clicked,
        purchased,
        rates
      },
      channelDistribution: channels,
      topProducts,
      recentCampaigns
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
