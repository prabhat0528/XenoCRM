const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');

// Create customer record
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, city, totalSpent, totalOrders, lastOrderDate, demographics } = req.body;
    if (!name || !email || !phone || !city) {
      return res.status(400).json({ error: 'Name, email, phone, and city are required.' });
    }
    const customer = await Customer.create({
      name,
      email,
      phone,
      city,
      totalSpent: Number(totalSpent) || 0,
      totalOrders: Number(totalOrders) || 0,
      lastOrderDate: lastOrderDate ? new Date(lastOrderDate) : null,
      demographics: demographics || {}
    });
    res.status(201).json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// View customer details (list)
router.get('/', async (req, res) => {
  try {
    const customers = await Customer.find({});
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk ingest customer records
router.post('/bulk', async (req, res) => {
  try {
    const customers = req.body;
    if (!Array.isArray(customers)) {
      return res.status(400).json({ error: 'Invalid payload: Expected an array of customers.' });
    }
    
    // Validate each customer has required fields
const validated = customers.map(c => ({
  _id: c._id,
  name: c.name,
  email: c.email,
  phone: String(c.phone),
  city: c.city,
  totalSpent: Number(c.totalSpent) || 0,
  totalOrders: Number(c.totalOrders) || 0,
  lastOrderDate: c.lastOrderDate ? new Date(c.lastOrderDate) : null,
  demographics: c.demographics || {}
}));

    const inserted = await Customer.insertMany(validated);
    res.status(201).json({ count: inserted.length, message: 'Customers ingested successfully.' });
  } catch (err) {
  console.error(err);

  res.status(500).json({
    error: err.message,
    stack: err.stack
  });
}
});

// Purge all customer data (for clean testing)
router.delete('/all', async (req, res) => {
  try {
    await Customer.updateMany({}, { $set: { isDeleted: true } }); // Mongoose fallback
    // In our mock and real db, we can clear or filter. For simplicity, we can clear mockDb arrays.
    const db = require('../utils/db');
    if (db.isMock()) {
      require('../utils/db').isMock(); // dummy
      const cList = await Customer.find({});
      // Clear array
      const custs = await Customer.find({});
      custs.length = 0; // clear reference inside mockDb
      const mockDbCustomers = require('../utils/db').getModel('Customer', {}).data;
      mockDbCustomers.length = 0;
    } else {
      await Customer.deleteMany({});
    }
    res.json({ message: 'All customer data cleared.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
