import React, { useState } from 'react';
import { ingestCustomers, ingestOrders, clearAllData } from '../utils/api';

export default function DataIngestion() {
  const [customerJson, setCustomerJson] = useState('');
  const [orderJson, setOrderJson] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const addLog = (message, type = 'info') => {
    setLogs((prev) => [{ time: new Date().toLocaleTimeString(), message, type }, ...prev]);
  };

  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to delete all customers, orders, and campaigns?')) return;
    setLoading(true);
    try {
      await clearAllData();
      addLog('All customer, order, and campaign logs have been purged.', 'warning');
    } catch (e) {
      addLog(`Failed to clear database: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleIngestCustomers = async () => {
    if (!customerJson.trim()) return;
    setLoading(true);
    try {
      const parsed = JSON.parse(customerJson);
      const res = await ingestCustomers(Array.isArray(parsed) ? parsed : [parsed]);
      addLog(`Success: Ingested ${res.count} customer records.`, 'success');
      setCustomerJson('');
    } catch (e) {
      addLog(`Failed parsing/uploading customer JSON: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleIngestOrders = async () => {
    if (!orderJson.trim()) return;
    setLoading(true);
    try {
      const parsed = JSON.parse(orderJson);
      const res = await ingestOrders(Array.isArray(parsed) ? parsed : [parsed]);
      addLog(`Success: Ingested ${res.count} order records and updated customer metrics.`, 'success');
      setOrderJson('');
    } catch (e) {
      addLog(`Failed parsing/uploading order JSON: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSampleDataset = async () => {
    setLoading(true);
    try {
      // 1. Defined Sample Customers
      const sampleCustomers = [
        { _id: "cust_1", name: "Rahul Sharma", email: "rahul@gmail.com", phone: "9876543210", city: "Delhi", demographics: { gender: "Male", age: 28 } },
        { _id: "cust_2", name: "Simran Kaur", email: "simran@yahoo.com", phone: "8765432109", city: "Delhi", demographics: { gender: "Female", age: 24 } },
        { _id: "cust_3", name: "Priya Nair", email: "priya@outlook.com", phone: "7654321098", city: "Mumbai", demographics: { gender: "Female", age: 31 } },
        { _id: "cust_4", name: "Amit Patel", email: "amit@gmail.com", phone: "9812345678", city: "Mumbai", demographics: { gender: "Male", age: 35 } },
        { _id: "cust_5", name: "Ananya Rao", email: "ananya@gmail.com", phone: "8899001122", city: "Bangalore", demographics: { gender: "Female", age: 29 } },
        { _id: "cust_6", name: "Kunal Shah", email: "kunal@gmail.com", phone: "9988776655", city: "Bangalore", demographics: { gender: "Male", age: 42 } },
        { _id: "cust_7", name: "Vikram Sen", email: "vikram@yahoo.com", phone: "7766554433", city: "Delhi", demographics: { gender: "Male", age: 19 } },
        { _id: "cust_8", name: "Neha Gupta", email: "neha@outlook.com", phone: "8877665544", city: "Pune", demographics: { gender: "Female", age: 27 } }
      ];

      addLog('Ingesting 8 sample customer profiles...', 'info');
      const custRes = await ingestCustomers(sampleCustomers);
      addLog(`Ingested ${custRes.count} customers.`, 'success');

      // 2. Defined Sample Orders
      // We will spread these across dates to simulate inactivity (90 days limit)
      const dateAgo = (days) => {
        const d = new Date();
        d.setDate(d.getDate() - days);
        return d.toISOString();
      };

      const sampleOrders = [
        { customerId: "cust_1", amount: 6500, orderDate: dateAgo(10), products: ["Coffee Maker", "Coffee Beans"] },
        { customerId: "cust_1", amount: 2000, orderDate: dateAgo(5), products: ["Mug"] },
        { customerId: "cust_2", amount: 1500, orderDate: dateAgo(95), products: ["Lipstick"] },
        { customerId: "cust_3", amount: 8000, orderDate: dateAgo(20), products: ["Running Shoes", "Socks"] },
        { customerId: "cust_3", amount: 4500, orderDate: dateAgo(15), products: ["Fitness Tracker"] },
        { customerId: "cust_4", amount: 12000, orderDate: dateAgo(120), products: ["Smart Watch"] },
        { customerId: "cust_4", amount: 300, orderDate: dateAgo(110), products: ["Screen Guard"] },
        { customerId: "cust_5", amount: 9500, orderDate: dateAgo(45), products: ["Laptop Bag", "Keyboard"] },
        { customerId: "cust_6", amount: 450, orderDate: dateAgo(8), products: ["Notebook"] },
        { customerId: "cust_7", amount: 1200, orderDate: dateAgo(105), products: ["T-shirt"] },
        { customerId: "cust_8", amount: 5500, orderDate: dateAgo(12), products: ["AirPods"] },
        { customerId: "cust_8", amount: 2500, orderDate: dateAgo(4), products: ["Phone Case"] }
      ];

      addLog('Ingesting 12 historical order records...', 'info');
      const ordRes = await ingestOrders(sampleOrders);
      addLog(`Ingested ${ordRes.count} orders. Recalculated customer total spent, order counts, and last purchase dates.`, 'success');
      
    } catch (e) {
      addLog(`Failed to load sample dataset: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="header-container">
        <div>
          <h1 className="view-title">Data Ingestion Hub</h1>
          <p className="view-subtitle">Bulk import customer profiles and order logs</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-accent" onClick={loadSampleDataset} disabled={loading}>
            ⚡ Ingest Sample Dataset
          </button>
          <button className="btn btn-danger" onClick={handleClear} disabled={loading}>
            🗑️ Reset Database
          </button>
        </div>
      </div>

      <div className="ingest-box-grid">
        {/* Customer Ingestion */}
        <div className="glass-panel">
          <div className="panel-header">👤 Ingest Customer Profiles</div>
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label>Paste JSON Array of Customers</label>
            <textarea
              rows="8"
              value={customerJson}
              onChange={(e) => setCustomerJson(e.target.value)}
              placeholder={`[\n  {\n    "name": "Arjun Kumar",\n    "email": "arjun@gmail.com",\n    "phone": "9988776655",\n    "city": "Mumbai",\n    "demographics": { "gender": "Male", "age": 30 }\n  }\n]`}
            ></textarea>
          </div>
          <button className="btn btn-primary" onClick={handleIngestCustomers} disabled={loading || !customerJson.trim()}>
            Ingest Customers
          </button>
        </div>

        {/* Order Ingestion */}
        <div className="glass-panel">
          <div className="panel-header">🛍️ Ingest Order Records</div>
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label>Paste JSON Array of Orders</label>
            <textarea
              rows="8"
              value={orderJson}
              onChange={(e) => setOrderJson(e.target.value)}
              placeholder={`[\n  {\n    "customerId": "cust_1",\n    "amount": 2500,\n    "products": ["Headphones"],\n    "orderDate": "2026-06-01T10:00:00.000Z"\n  }\n]`}
            ></textarea>
          </div>
          <button className="btn btn-primary" onClick={handleIngestOrders} disabled={loading || !orderJson.trim()}>
            Ingest Orders
          </button>
        </div>
      </div>

      {/* Live Ingestion Logs */}
      <div className="glass-panel">
        <div className="panel-header">📃 Event Log Console</div>
        <div className="live-stream" style={{ minHeight: '150px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '10px' }}>
          {logs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Ingestion logs will print here. Click "Ingest Sample Dataset" to see it in action.</p>
          ) : (
            logs.map((l, idx) => (
              <div key={idx} style={{ 
                fontSize: '0.85rem', 
                marginBottom: '8px', 
                color: l.type === 'success' ? 'var(--accent-green)' : l.type === 'error' ? 'var(--accent-red)' : l.type === 'warning' ? 'var(--accent-yellow)' : 'var(--text-primary)'
              }}>
                <span style={{ color: 'var(--text-muted)', marginRight: '10px' }}>[{l.time}]</span>
                {l.message}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
