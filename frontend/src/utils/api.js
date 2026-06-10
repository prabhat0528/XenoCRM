const BACKEND_URL = 'https://xenocrm-backend-wuqn.onrender.com';

export async function checkHealth() {
  const res = await fetch(`${BACKEND_URL}/health`);
  return res.json();
}

export async function fetchCustomers() {
  const res = await fetch(`${BACKEND_URL}/api/customers`);
  return res.json();
}

export async function fetchOrders() {
  const res = await fetch(`${BACKEND_URL}/api/orders`);
  return res.json();
}

export async function ingestCustomers(data) {
  const res = await fetch(`${BACKEND_URL}/api/customers/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function ingestOrders(data) {
  const res = await fetch(`${BACKEND_URL}/api/orders/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function clearAllData() {
  await fetch(`${BACKEND_URL}/api/customers/all`, { method: 'DELETE' });
  await fetch(`${BACKEND_URL}/api/orders/all`, { method: 'DELETE' });
  await fetch(`${BACKEND_URL}/api/campaigns/all`, { method: 'DELETE' });
}

export async function evaluateSegment(criteria) {
  const res = await fetch(`${BACKEND_URL}/api/segments/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(criteria)
  });
  return res.json();
}

export async function parseAISegment(query) {
  const res = await fetch(`${BACKEND_URL}/api/segments/ai-parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  return res.json();
}

export async function fetchSegmentMembers(criteria) {
  const res = await fetch(`${BACKEND_URL}/api/segments/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(criteria)
  });
  return res.json();
}

export async function fetchCampaigns() {
  const res = await fetch(`${BACKEND_URL}/api/campaigns`);
  return res.json();
}

export async function fetchCampaignDetails(id) {
  const res = await fetch(`${BACKEND_URL}/api/campaigns/${id}`);
  return res.json();
}

export async function createCampaign(campaign) {
  const res = await fetch(`${BACKEND_URL}/api/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(campaign)
  });
  return res.json();
}

export async function launchCampaign(id) {
  const res = await fetch(`${BACKEND_URL}/api/campaigns/${id}/send`, {
    method: 'POST'
  });
  return res.json();
}

export async function fetchAnalyticsSummary() {
  const res = await fetch(`${BACKEND_URL}/api/analytics/summary`);
  return res.json();
}

// AI Service Direct Utilities
const AI_SERVICE_URL = 'https://xenocrm-ai.onrender.com';

export async function generateAIMessage(prompt, channel) {
  const res = await fetch(`${AI_SERVICE_URL}/api/ai/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, channel })
  });
  return res.json();
}

export async function fetchAIRecommendation(goal) {
  const res = await fetch(`${AI_SERVICE_URL}/api/ai/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal })
  });
  return res.json();
}

export async function chatWithAI(message, history) {
  const res = await fetch(`${AI_SERVICE_URL}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history })
  });
  return res.json();
}
