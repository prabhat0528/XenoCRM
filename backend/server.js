const envConfig = require('dotenv').config().parsed || {};
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./utils/db');
const { startQueue } = require('./utils/queue');

const app = express();
const PORT = process.env.PORT || envConfig.PORT || 5000;

// Global process error handlers to prevent crashes and print stack traces
process.on('uncaughtException', (err) => {
  console.error('🔥 UNCAUGHT EXCEPTION:', err.stack || err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const customerRoutes = require('./routes/customers');
const orderRoutes = require('./routes/orders');
const segmentRoutes = require('./routes/segments');
const campaignRoutes = require('./routes/campaigns');
const webhookRoutes = require('./routes/webhooks');
const analyticsRoutes = require('./routes/analytics');

app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/segments', segmentRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  const db = require('./utils/db');
  res.json({
    status: 'healthy',
    database: db.isMock() ? 'mock-in-memory' : 'mongodb',
    timestamp: new Date()
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// Initialize DB and Start Server
async function bootstrap() {
  await connectDB();
  
  // Start the background campaign processing worker queue
  startQueue();

  app.listen(PORT, () => {
    console.log(`🚀 CRM Backend Server running on port ${PORT}`);
  });
}

bootstrap();
