const { getModel } = require('../utils/db');

const CustomerSchema = {
  _id: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  city: { type: String, required: true },
  totalSpent: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  lastOrderDate: { type: Date, default: null },
  demographics: { type: Object, default: {} }
};

module.exports = getModel('Customer', CustomerSchema);
