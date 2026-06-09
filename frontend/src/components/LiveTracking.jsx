import React, { useState, useEffect } from 'react';
import { fetchCampaigns, fetchCampaignDetails } from '../utils/api';

export default function LiveTracking({ initialCampaignId }) {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState(
    initialCampaignId || ''
  );
  const [details, setDetails] = useState(null);

  const loadCampaignList = async () => {
    try {
      const list = await fetchCampaigns();
      setCampaigns(list || []);

      if (list?.length > 0 && !selectedCampaignId) {
        setSelectedCampaignId(list[0]._id);
      }
    } catch (e) {
      console.error('Failed to load campaigns list:', e);
    }
  };

  const loadCampaignLogs = async () => {
    if (!selectedCampaignId) return;

    try {
      const res = await fetchCampaignDetails(selectedCampaignId);
      console.log('Campaign Details:', res);
      setDetails(res);
    } catch (e) {
      console.error('Failed loading campaign logs:', e);
    }
  };

  useEffect(() => {
    loadCampaignList();
  }, []);

  useEffect(() => {
    if (selectedCampaignId) {
      loadCampaignLogs();
    } else {
      setDetails(null);
    }
  }, [selectedCampaignId]);

  useEffect(() => {
    if (!selectedCampaignId) return;

    const shouldPoll =
      details?.campaign?.status === 'Processing' ||
      details?.campaign?.status === 'Queued' ||
      details?.logs?.some((l) =>
        ['PENDING', 'SENT', 'DELIVERED', 'OPENED', 'READ', 'CLICKED'].includes(
          l?.status
        )
      );

    if (shouldPoll) {
      const interval = setInterval(loadCampaignLogs, 1500);
      return () => clearInterval(interval);
    }
  }, [selectedCampaignId, details]);

  const campaign = details?.campaign || {};
  const logs = details?.logs || [];

  return (
    <div>
      <div className="header-container">
        <div>
          <h1 className="view-title">Live dispatch tracker</h1>
          <p className="view-subtitle">
            Monitor outbound dispatches and customer webhook events live
          </p>
        </div>

        {campaigns.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <label>Select Campaign</label>

            <select
              value={selectedCampaignId}
              onChange={(e) =>
                setSelectedCampaignId(e.target.value)
              }
              style={{ minWidth: '240px' }}
            >
              {campaigns.map((c, index) => (
            <option
              key={c._id || `campaign-${index}`}
              value={c._id}
            >
              {c.name} ({c.channel})
            </option>
          ))}
            </select>
          </div>
        )}
      </div>

      {details ? (
        <>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Target Sent</div>
              <div className="metric-value">
                {campaign.sentCount || 0}
              </div>
              <div className="metric-sub">
                Pending callback notifications
              </div>
            </div>

            <div className="metric-card green">
              <div className="metric-label">Delivered</div>
              <div className="metric-value">
                {campaign.deliveredCount || 0}
              </div>
              <div className="metric-sub">
                {campaign.sentCount
                  ? `${(
                      (campaign.deliveredCount /
                        campaign.sentCount) *
                      100
                    ).toFixed(0)}% delivery rate`
                  : '0%'}
              </div>
            </div>

            <div className="metric-card yellow">
              <div className="metric-label">
                Engagements (Opened)
              </div>
              <div className="metric-value">
                {campaign.openedCount || 0}
              </div>
              <div className="metric-sub">
                Unique customers who opened
              </div>
            </div>

            <div className="metric-card pink">
              <div className="metric-label">
                Purchased (Converted)
              </div>

              <div className="metric-value">
                {campaign.conversionCount || 0}
              </div>

              <div
                className="metric-sub"
                style={{
                  color: 'var(--accent-green)',
                  fontWeight: '600'
                }}
              >
                {campaign.deliveredCount
                  ? `${(
                      (campaign.conversionCount /
                        campaign.deliveredCount) *
                      100
                    ).toFixed(1)}% conversion`
                  : '0%'}
              </div>
            </div>
          </div>

          <div
            className="glass-panel"
            style={{
              padding: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <div
                className={
                  ['Processing', 'Queued'].includes(
                    campaign.status
                  )
                    ? 'pulse-icon'
                    : ''
                }
              />

              <span>
                <strong>Campaign Execution Status:</strong>

                <span
                  className={`badge ${String(
                    campaign.status || 'pending'
                  ).toLowerCase()}`}
                  style={{ marginLeft: '10px' }}
                >
                  {campaign.status || 'Pending'}
                </span>
              </span>
            </div>

            <button
              className="btn btn-secondary"
              onClick={loadCampaignLogs}
            >
              🔄 Refresh Logs
            </button>
          </div>

          <div className="glass-panel">
            <div className="panel-header">
              📋 Customer Delivery Audit Records
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Contact</th>
                    <th>Personalized Message</th>
                    <th>Status</th>
                    <th>Delivery Journey Timeline</th>
                  </tr>
                </thead>

                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        style={{
                          textAlign: 'center',
                          color: 'var(--text-muted)'
                        }}
                      >
                        No logs compiled. Campaign might be
                        waiting in queue.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log, index) => (
                      <tr key={log._id || `log-${index}`}>
                        <td style={{ fontWeight: '500' }}>
                          {log.customerName || 'Unknown'}
                        </td>

                        <td
                          style={{
                            fontSize: '0.85rem',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          {log.customerContact || '-'}
                        </td>

                        <td
                          style={{
                            fontSize: '0.85rem',
                            maxWidth: '300px',
                            whiteSpace: 'normal',
                            wordBreak: 'break-word'
                          }}
                        >
                          "{log.message || 'No message'}"
                        </td>

                        <td>
                          <span
                            className={`badge ${String(
                              log.status || 'pending'
                            ).toLowerCase()}`}
                          >
                            {log.status || 'PENDING'}
                          </span>
                        </td>

                        <td>
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '6px',
                              fontSize: '0.75rem'
                            }}
                          >
                            {(log.events || []).map(
                              (ev, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    background:
                                      'rgba(255,255,255,0.05)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    color:
                                      ev?.status ===
                                      'PURCHASED'
                                        ? 'var(--accent-green)'
                                        : ev?.status ===
                                          'FAILED'
                                        ? 'var(--accent-red)'
                                        : 'var(--text-secondary)'
                                  }}
                                >
                                  {ev?.status || 'UNKNOWN'}
                                </span>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div
          className="glass-panel"
          style={{
            textAlign: 'center',
            padding: '60px'
          }}
        >
          <p style={{ color: 'var(--text-muted)' }}>
            No campaign logs to track yet. Go to Data
            Ingestion and Campaign Creator to build and
            run one.
          </p>
        </div>
      )}
    </div>
  );
}