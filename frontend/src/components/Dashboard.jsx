import React, { useState, useEffect } from 'react';
import { fetchAnalyticsSummary } from '../utils/api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const summary = await fetchAnalyticsSummary();
      setData(summary);
    } catch (e) {
      console.error('Failed to load dashboard statistics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Poll every 3 seconds for live dashboard updates
    const timer = setInterval(loadData, 3000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)' }}>Loading dashboard analytics...</div>;
  }

  const { summary, campaignPerformance, channelDistribution, topProducts, recentCampaigns } = data || {
    summary: { customerCount: 0, orderCount: 0, totalRevenue: 0, campaignCount: 0 },
    campaignPerformance: { sent: 0, delivered: 0, failed: 0, opened: 0, read: 0, clicked: 0, purchased: 0, rates: {} },
    channelDistribution: { SMS: 0, Email: 0, WhatsApp: 0, RCS: 0 },
    topProducts: [],
    recentCampaigns: []
  };

  const rates = campaignPerformance.rates || {};

  return (
    <div>
      <div className="header-container">
        <div>
          <h1 className="view-title">Marketing Command Center</h1>
          <p className="view-subtitle">Real-time audience insight and campaign tracking</p>
        </div>
        <button className="btn btn-secondary" onClick={loadData}>🔄 Refresh</button>
      </div>

      {/* Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Revenue</div>
          <div className="metric-value">₹{(summary.totalRevenue || 0).toLocaleString()}</div>
          <div className="metric-sub">Generated from {summary.orderCount} orders</div>
        </div>
        <div className="metric-card pink">
          <div className="metric-label">Total Audience</div>
          <div className="metric-value">{summary.customerCount}</div>
          <div className="metric-sub">Profiles managed in CRM</div>
        </div>
        <div className="metric-card green">
          <div className="metric-label">Campaigns Run</div>
          <div className="metric-value">{summary.campaignCount}</div>
          <div className="metric-sub">Across all channels</div>
        </div>
        <div className="metric-card yellow">
          <div className="metric-label">Conversion Rate</div>
          <div className="metric-value">{(rates.conversionRate || 0).toFixed(1)}%</div>
          <div className="metric-sub">Overall purchase conversion</div>
        </div>
      </div>

      <div className="two-column-layout">
        {/* Conversion Funnel */}
        <div className="glass-panel">
          <div className="panel-header">📈 Live Dispatch Performance Funnel</div>
          
          <div className="chart-bar-container">
            <div className="chart-bar-label">
              <span>Messages Sent</span>
              <span>{campaignPerformance.sent}</span>
            </div>
            <div className="chart-bar-bg">
              <div className="chart-bar-fill" style={{ width: campaignPerformance.sent > 0 ? '100%' : '0%' }}></div>
            </div>
          </div>

          <div className="chart-bar-container">
            <div className="chart-bar-label">
              <span>Delivered ({(rates.deliveryRate || 0).toFixed(1)}%)</span>
              <span>{campaignPerformance.delivered}</span>
            </div>
            <div className="chart-bar-bg">
              <div className="chart-bar-fill" style={{ width: `${rates.deliveryRate || 0}%`, background: 'var(--accent-cyan)' }}></div>
            </div>
          </div>

          <div className="chart-bar-container">
            <div className="chart-bar-label">
              <span>Opened ({(rates.openRate || 0).toFixed(1)}%)</span>
              <span>{campaignPerformance.opened}</span>
            </div>
            <div className="chart-bar-bg">
              <div className="chart-bar-fill" style={{ width: `${(rates.openRate || 0) * (rates.deliveryRate || 0) / 100}%`, background: 'var(--accent-violet)' }}></div>
            </div>
          </div>

          <div className="chart-bar-container">
            <div className="chart-bar-label">
              <span>Clicked ({(rates.clickRate || 0).toFixed(1)}%)</span>
              <span>{campaignPerformance.clicked}</span>
            </div>
            <div className="chart-bar-bg">
              <div className="chart-bar-fill" style={{ width: `${(rates.clickRate || 0) * (rates.openRate || 0) * (rates.deliveryRate || 0) / 10000}%`, background: 'var(--accent-pink)' }}></div>
            </div>
          </div>

          <div className="chart-bar-container">
            <div className="chart-bar-label">
              <span>Purchased ({(rates.conversionRate || 0).toFixed(1)}%)</span>
              <span>{campaignPerformance.purchased}</span>
            </div>
            <div className="chart-bar-bg">
              <div className="chart-bar-fill" style={{ width: `${(rates.conversionRate || 0) * (rates.clickRate || 0) * (rates.openRate || 0) * (rates.deliveryRate || 0) / 1000000}%`, background: 'var(--accent-green)' }}></div>
            </div>
          </div>
        </div>

        {/* Channel Share */}
        <div className="glass-panel">
          <div className="panel-header">📡 Channel Share Distribution</div>
          {Object.entries(channelDistribution).map(([channel, count]) => {
            const total = Object.values(channelDistribution).reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? (count / total) * 100 : 0;
            return (
              <div className="chart-bar-container" key={channel}>
                <div className="chart-bar-label">
                  <span>{channel}</span>
                  <span>{count} sent ({percentage.toFixed(0)}%)</span>
                </div>
                <div className="chart-bar-bg">
                  <div className={`chart-bar-fill`} style={{ 
                    width: `${percentage}%`,
                    background: channel === 'WhatsApp' ? 'var(--accent-green)' : channel === 'Email' ? 'var(--accent-cyan)' : channel === 'SMS' ? 'var(--accent-red)' : 'var(--accent-yellow)'
                  }}></div>
                </div>
              </div>
            );
          })}

          <div style={{ marginTop: '30px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
            <h4 style={{ marginBottom: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>🛒 Top Ingested Products</h4>
            {topProducts.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No products ingested yet.</p>
            ) : (
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {topProducts.map((p, idx) => (
                  <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-primary)' }}>🏷️ {p.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{p.count} sales</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Recent Campaigns Table */}
      <div className="glass-panel">
        <div className="panel-header">📢 Recent Campaign Activities</div>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Campaign Name</th>
                <th>Channel</th>
                <th>Status</th>
                <th>Sent</th>
                <th>Delivered</th>
                <th>Opened</th>
                <th>Purchases</th>
                <th>Conv. Rate</th>
              </tr>
            </thead>
            <tbody>
              {recentCampaigns.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No campaigns created yet. Go to Campaign Creator to launch one!</td>
                </tr>
              ) : (
                recentCampaigns.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: '500' }}>{c.name}</td>
                    <td><span className={`badge ${c.channel.toLowerCase()}`}>{c.channel}</span></td>
                    <td><span className={`badge ${c.status.toLowerCase()}`}>{c.status}</span></td>
                    <td>{c.sent}</td>
                    <td>{c.delivered}</td>
                    <td>{c.opened}</td>
                    <td>{c.purchased}</td>
                    <td style={{ fontWeight: '600', color: 'var(--accent-green)' }}>{c.conversionRate.toFixed(1)}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
