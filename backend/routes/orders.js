const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Customer = require('../models/Customer');

// Helper to update customer stats based on new order(s)
async function updateCustomerStats(customerId) {
  try {
    const orders = await Order.find({ customerId });
    if (orders.length === 0) return;

    let totalSpent = 0;
    let totalOrders = orders.length;
    let lastOrderDate = orders[0].orderDate;

    orders.forEach(o => {
      totalSpent += Number(o.amount) || 0;
      if (new Date(o.orderDate) > new Date(lastOrderDate)) {
        lastOrderDate = o.orderDate;
      }
    });

    await Customer.updateOne(
      { _id: customerId },
      { 
        $set: { 
          totalSpent, 
          totalOrders, 
          lastOrderDate 
        } 
      }
    );
  } catch (err) {
    console.error(`Failed to update customer stats for ${customerId}:`, err.message);
  }
}

// Store customer order
router.post('/', async (req, res) => {
  try {
    const { customerId, amount, orderDate, products, status } = req.body;
    if (!customerId || amount === undefined) {
      return res.status(400).json({ error: 'CustomerId and amount are required.' });
    }

    // Verify customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ error: `Customer with ID ${customerId} not found.` });
    }

    const order = await Order.create({
      customerId,
      amount: Number(amount),
      orderDate: orderDate ? new Date(orderDate) : new Date(),
      products: products || [],
      status: status || 'Completed'
    });

    // Recalculate customer metrics
    await updateCustomerStats(customerId);

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// View customer orders
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find({});
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk ingest order records
router.post('/bulk', async (req, res) => {
  try {
    const orders = req.body;
    if (!Array.isArray(orders)) {
      return res.status(400).json({ error: 'Invalid payload: Expected an array of orders.' });
    }

    const validated = orders.map(o => ({
      customerId: o.customerId,
      amount: Number(o.amount) || 0,
      orderDate: o.orderDate ? new Date(o.orderDate) : new Date(),
      products: o.products || [],
      status: o.status || 'Completed'
    }));

    const inserted = await Order.insertMany(validated);

    // Get unique customerIds from batch
    const uniqueCustomerIds = [...new Set(validated.map(o => o.customerId))];
    
    // Update aggregates for each customer
    for (const cId of uniqueCustomerIds) {
      await updateCustomerStats(cId);
    }

    res.status(201).json({ count: inserted.length, message: 'Orders ingested and customer stats recalculated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Purge all order data
router.delete('/all', async (req, res) => {
  try {
    await Order.deleteMany({});
    
    // Reset customer aggregates to 0
    await Customer.updateMany({}, {
      $set: {
        totalSpent: 0,
        totalOrders: 0,
        lastOrderDate: null
      }
    });

    res.json({ message: 'All order data cleared. Customer stats reset.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
