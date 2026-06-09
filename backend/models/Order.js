const { getModel } = require('../utils/db');

const OrderSchema = {
  customerId: { type: String, required: true },
  amount: { type: Number, required: true },
  orderDate: { type: Date, default: () => new Date() },
  products: { type: [String], default: [] },
  status: { type: String, default: 'Completed' }
};

module.exports = getModel('Order', OrderSchema);
