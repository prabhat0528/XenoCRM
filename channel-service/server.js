const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Helper delay function
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Send callback back to the CRM backend
async function sendCallback(callbackUrl, logId, status) {
  try {
    await axios.post(callbackUrl, { logId, status }, { timeout: 2000 });
    console.log(`[Channel Service] Callback success: Log ID ${logId} -> ${status}`);
  } catch (err) {
    console.error(`[Channel Service] Callback failed for Log ID ${logId} (${status}):`, err.message);
  }
}

// Simulated campaign lifecycle processing function
async function simulateLifecycle(logId, channel, callbackUrl) {
  // Define probabilities based on channel
  const failRate = 0.08; // 8% overall delivery fail rate
  
  let openRate = 0.45;      // Email open rate
  if (channel === 'WhatsApp') openRate = 0.88;
  if (channel === 'SMS') openRate = 0.70;
  if (channel === 'RCS') openRate = 0.80;

  const readRate = 0.85;   // 85% of opened get read
  const clickRate = 0.25;  // 25% CTR
  const purchaseRate = 0.15; // 15% conversion rate for clicks

  try {
    // 1. SENT
    await delay(300 + Math.random() * 500);
    await sendCallback(callbackUrl, logId, 'SENT');

    // 2. DELIVERED or FAILED
    await delay(800 + Math.random() * 1000);
    if (Math.random() < failRate) {
      await sendCallback(callbackUrl, logId, 'FAILED');
      return;
    }
    await sendCallback(callbackUrl, logId, 'DELIVERED');

    // 3. OPENED
    await delay(1200 + Math.random() * 1500);
    if (Math.random() > openRate) return;
    await sendCallback(callbackUrl, logId, 'OPENED');

    // 4. READ
    await delay(600 + Math.random() * 800);
    if (Math.random() > readRate) return;
    await sendCallback(callbackUrl, logId, 'READ');

    // 5. CLICKED
    await delay(1500 + Math.random() * 2000);
    if (Math.random() > clickRate) return;
    await sendCallback(callbackUrl, logId, 'CLICKED');

    // 6. PURCHASED (Conversion)
    await delay(2000 + Math.random() * 2500);
    if (Math.random() > purchaseRate) return;
    await sendCallback(callbackUrl, logId, 'PURCHASED');

  } catch (e) {
    console.error(`[Channel Service] Error in simulation loop for Log ID ${logId}:`, e.message);
  }
}

// Receive message sending requests
app.post('/api/send', (req, res) => {
  const { logId, recipient, channel, message, callbackUrl } = req.body;

  if (!logId || !recipient || !channel || !message || !callbackUrl) {
    return res.status(400).json({ error: 'Missing required dispatch parameters.' });
  }

  console.log(`[Channel Service] Received request to dispatch ${channel} message to ${recipient}. Log ID: ${logId}`);

  // Trigger simulated delivery lifecycle in the background (Non-blocking!)
  simulateLifecycle(logId, channel, callbackUrl);

  // Return success immediately to CRM
  res.json({ success: true, message: 'Message queued for simulated delivery.' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'channel-simulator', timestamp: new Date() });
});

app.listen(3001, () => {
  console.log(`📡 Simulated Channel Service running on port 3001`);
});
