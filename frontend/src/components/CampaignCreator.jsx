import React, { useState, useEffect } from 'react';
import { createCampaign, launchCampaign, generateAIMessage, fetchAIRecommendation, fetchSegmentMembers } from '../utils/api';

export default function CampaignCreator({ selectedSegment, selectedSegmentLabel, campaignDraft, clearCampaignDraft, onNavigateToTracking }) {
  // Campaign Form State
  const [campaign, setCampaign] = useState({
    name: '',
    channel: 'WhatsApp',
    messageTemplate: '',
    segmentCriteria: null
  });

  // Preview States
  const [previewMembers, setPreviewMembers] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);

  // Keep segment in sync with parent select
  useEffect(() => {
    if (selectedSegment) {
      setCampaign((prev) => ({
        ...prev,
        segmentCriteria: selectedSegment
      }));
      setShowPreview(false);
      setPreviewMembers([]);
    }
  }, [selectedSegment]);

  // Sync with AI chat campaign drafts
  useEffect(() => {
    if (campaignDraft) {
      setCampaign({
        name: campaignDraft.name || 'AI Generated Campaign',
        channel: campaignDraft.channel || 'WhatsApp',
        messageTemplate: campaignDraft.messageTemplate || '',
        segmentCriteria: campaignDraft.segmentCriteria || selectedSegment
      });
      clearCampaignDraft();
      setShowPreview(false);
      setPreviewMembers([]);
    }
  }, [campaignDraft]);

  const handleTogglePreview = async () => {
    if (showPreview) {
      setShowPreview(false);
      return;
    }

    if (!campaign.segmentCriteria) return;

    setPreviewLoading(true);
    try {
      const data = await fetchSegmentMembers(campaign.segmentCriteria);
      setPreviewMembers(data || []);
      setShowPreview(true);
      setExpandedCustomerId(null);
    } catch (e) {
      console.error('Failed fetching preview members:', e);
      alert('Failed loading target shopper details.');
    } finally {
      setPreviewLoading(false);
    }
  };

  // AI Message Helper State
  const [aiPrompt, setAiPrompt] = useState('');
  const [drafting, setDrafting] = useState(false);

  // AI Recommendation State
  const [selectedGoal, setSelectedGoal] = useState('repeat');
  const [recommendation, setRecommendation] = useState(null);
  const [loadingRec, setLoadingRec] = useState(false);
  const [loadingLaunch, setLoadingLaunch] = useState(false);

  // Draft Message with AI
  const handleAIDraft = async () => {
    if (!aiPrompt.trim()) return;
    setDrafting(true);
    try {
      const res = await generateAIMessage(aiPrompt, campaign.channel);
      setCampaign((prev) => ({
        ...prev,
        messageTemplate: res.message
      }));
    } catch (e) {
      console.error('Failed generating AI message:', e);
      alert('AI service error. Please verify the AI Python service is running.');
    } finally {
      setDrafting(false);
    }
  };

  // Get AI Strategy Recommendations
  const fetchStrategy = async () => {
    setLoadingRec(true);
    setRecommendation(null);
    
    let goalText = 'Increase repeat purchases';
    if (selectedGoal === 'winback') goalText = 'Win back cold inactive customers';
    if (selectedGoal === 'premium') goalText = 'Promote high-value luxury products';

    try {
      const rec = await fetchAIRecommendation(goalText);
      setRecommendation(rec);
    } catch (e) {
      console.error('Failed fetching AI recommendation:', e);
      alert('Failed getting AI strategy recommendation.');
    } finally {
      setLoadingRec(false);
    }
  };

  // Apply AI Recommendation
  const applyRecommendation = () => {
    if (!recommendation) return;
    setCampaign({
      name: `AI Strategy: ${selectedGoal === 'repeat' ? 'Repeat Buyers' : selectedGoal === 'winback' ? 'Win Back Campaign' : 'Premium VIP Offer'}`,
      channel: recommendation.channel || 'WhatsApp',
      messageTemplate: recommendation.message || '',
      segmentCriteria: recommendation.segment || {}
    });
    alert('AI Strategy recommendations applied to campaign form!');
  };

  // Launch Campaign
  const handleLaunch = async () => {
    if (!campaign.name || !campaign.messageTemplate || !campaign.segmentCriteria) {
      alert('Please fill out all fields. Ensure you select/parse a segment first.');
      return;
    }

    setLoadingLaunch(true);
    try {
      // 1. Create the campaign
      const created = await createCampaign(campaign);
      
      // 2. Trigger asynchronous background send
      await launchCampaign(created._id);

      alert('🚀 Campaign successfully queued and launched in background!');
      
      // Navigate to Live tracking dashboard
      onNavigateToTracking(created._id);
    } catch (e) {
      console.error('Failed campaign launch:', e);
      alert(`Launch failed: ${e.message}`);
    } finally {
      setLoadingLaunch(false);
    }
  };

  return (
    <div>
      <div className="header-container">
        <div>
          <h1 className="view-title">Campaign Creation Studio</h1>
          <p className="view-subtitle">Draft templates, design copy with AI, and launch audience dispatches</p>
        </div>
      </div>

      <div className="two-column-layout">
        {/* Campaign Draft Form */}
        <div className="glass-panel">
          <div className="panel-header">📝 Configure Campaign Details</div>
          
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Campaign Name</label>
              <input 
                type="text" 
                value={campaign.name}
                onChange={(e) => setCampaign({...campaign, name: e.target.value})}
                placeholder="e.g. June Monsoon Discount WhatsApp Campaign"
              />
            </div>

            <div className="form-group">
              <label>Target Audience Segment</label>
              <div style={{ 
                padding: '12px', 
                background: 'rgba(255,255,255,0.03)', 
                borderRadius: '10px', 
                border: '1px solid rgba(255,255,255,0.05)',
                fontSize: '0.9rem'
              }}>
                {campaign.segmentCriteria ? (
                  <div>
                    <span style={{ color: 'var(--accent-green)', fontWeight: '600' }}>✓ Target Selected:</span>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', overflowX: 'auto' }}>
                      {selectedSegmentLabel || 'Custom/AI Segment'}
                      <pre style={{ color: 'var(--accent-cyan)', marginTop: '4px', fontSize: '0.75rem' }}>
                        {JSON.stringify(campaign.segmentCriteria, null, 2)}
                      </pre>
                    </div>
                    
                    <button 
                      className="btn btn-secondary btn-sm" 
                      style={{ width: '100%', marginTop: '12px' }}
                      onClick={handleTogglePreview}
                      disabled={previewLoading}
                    >
                      {previewLoading ? '⏳ Loading Candidates...' : showPreview ? '👁️ Hide Candidate List' : '🔍 Preview Target Customers'}
                    </button>
                  </div>
                ) : (
                  <span style={{ color: 'var(--accent-red)' }}>⚠️ No segment selected. Please configure target segment first.</span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Communication Channel</label>
              <select 
                value={campaign.channel}
                onChange={(e) => setCampaign({...campaign, channel: e.target.value})}
              >
                <option value="WhatsApp">WhatsApp (Simulated)</option>
                <option value="Email">Email (Simulated)</option>
                <option value="SMS">SMS (Simulated)</option>
                <option value="RCS">RCS (Simulated)</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label>Message Content Template</label>
              <textarea 
                rows="6"
                value={campaign.messageTemplate}
                onChange={(e) => setCampaign({...campaign, messageTemplate: e.target.value})}
                placeholder="Hi {{name}}, enjoy 20% off your purchase. Since you've spent {{totalSpent}} with us, you are a VIP in {{city}}!"
              ></textarea>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                💡 Placeholders available: <code>{"{{name}}"}</code>, <code>{"{{totalSpent}}"}</code>, <code>{"{{city}}"}</code>, <code>{"{{totalOrders}}"}</code>. They will resolve dynamically during dispatch.
              </p>
            </div>
          </div>

          <button 
            className="btn btn-accent" 
            style={{ width: '100%' }}
            onClick={handleLaunch}
            disabled={loadingLaunch || !campaign.segmentCriteria}
          >
            {loadingLaunch ? 'Launching...' : '🚀 Queue & Launch Campaign'}
          </button>
        </div>

        {/* AI Co-Pilot Panel */}
        <div>
          {/* AI message generator helper */}
          <div className="glass-panel" style={{ marginBottom: '24px' }}>
            <div className="panel-header">✏️ AI Copywriter Assistance</div>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Describe target/promo code goals</label>
              <input 
                type="text" 
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. discount discount code MONSOON20 for active users"
              />
            </div>
            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleAIDraft} disabled={drafting || !aiPrompt.trim()}>
              {drafting ? 'Writing copy...' : '🤖 Draft Template using AI'}
            </button>
          </div>

          {/* AI Recommendation Strategy */}
          <div className="glass-panel">
            <div className="panel-header">💡 AI Strategy Recommender</div>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Select Marketing Goal</label>
              <select value={selectedGoal} onChange={(e) => setSelectedGoal(e.target.value)}>
                <option value="repeat">Increase Repeat Purchases</option>
                <option value="winback">Win back cold inactive buyers</option>
                <option value="premium">Promote premium luxury lines</option>
              </select>
            </div>
            
            <button className="btn btn-secondary" style={{ width: '100%', marginBottom: '16px' }} onClick={fetchStrategy} disabled={loadingRec}>
              {loadingRec ? 'Generating Strategy...' : '🧠 Request Strategy Recommendation'}
            </button>

            {recommendation && (
              <div className="recs-container">
                <div className="rec-card">
                  <div>
                    <span className="rec-badge">{recommendation.channel} Channel Suggested</span>
                  </div>
                  
                  <div className="rec-reasoning">
                    <strong>Reasoning:</strong> {recommendation.reasoning}
                  </div>
                  
                  <div>
                    <strong style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Segment Suggested:</strong>
                    <pre style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px', fontSize: '0.75rem', marginTop: '4px', overflowX: 'auto' }}>
                      {JSON.stringify(recommendation.segment, null, 2)}
                    </pre>
                  </div>
                  
                  <div>
                    <strong style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Message Draft:</strong>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px', fontSize: '0.8rem', whiteSpace: 'pre-line', marginTop: '4px' }}>
                      {recommendation.message}
                    </div>
                  </div>

                  <button className="btn btn-accent" onClick={applyRecommendation}>
                    🎯 Apply Campaign Strategy
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shopper Details Preview Section */}
      {showPreview && (
        <div className="glass-panel" style={{ marginTop: '24px', animation: 'fadeIn 0.3s ease-in-out' }}>
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <span>👥 Target Campaign Shoppers Details ({previewMembers.length} found)</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowPreview(false)}>✕ Close</button>
          </div>
          
          {previewMembers.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No candidates found matching the target segment criteria.
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table" style={{ fontSize: '0.9rem' }}>
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Contact Info</th>
                    <th>Location</th>
                    <th>Aggregates</th>
                    <th>Demographics</th>
                    <th>Last Active</th>
                    <th>Order History</th>
                  </tr>
                </thead>
                <tbody>
                  {previewMembers.map((member) => {
                    const isExpanded = expandedCustomerId === member._id;
                    return (
                      <React.Fragment key={member._id}>
                        <tr>
                          <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                            {member.name}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.8rem' }}>
                              <span>📧 {member.email}</span>
                              <span>📞 {member.phone}</span>
                            </div>
                          </td>
                          <td>{member.city}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.8rem' }}>
                              <span>Spent: <strong>₹{member.totalSpent || 0}</strong></span>
                              <span>Orders: <strong>{member.totalOrders || 0}</strong></span>
                            </div>
                          </td>
                          <td>
                            <span className="badge pending" style={{ fontSize: '0.75rem', marginRight: '6px' }}>
                              {member.demographics?.gender || 'N/A'}
                            </span>
                            <span className="badge sent" style={{ fontSize: '0.75rem' }}>
                              Age: {member.demographics?.age || 'N/A'}
                            </span>
                          </td>
                          <td>
                            {member.lastOrderDate 
                              ? new Date(member.lastOrderDate).toLocaleDateString()
                              : 'Never'
                            }
                          </td>
                          <td>
                            <button 
                              className={`btn btn-sm ${isExpanded ? 'btn-secondary' : 'btn-accent'}`}
                              onClick={() => setExpandedCustomerId(isExpanded ? null : member._id)}
                            >
                              {isExpanded ? '🔼 Close Orders' : `🔽 View Orders (${member.orders?.length || 0})`}
                            </button>
                          </td>
                        </tr>
                        
                        {/* Nested Orders Row (Accordion) */}
                        {isExpanded && (
                          <tr>
                            <td colSpan="7" style={{ background: 'rgba(255,255,255,0.02)', padding: '15px 25px' }}>
                              <div style={{ padding: '10px 0' }}>
                                <h4 style={{ fontSize: '0.85rem', marginBottom: '10px', color: 'var(--accent-cyan)' }}>
                                  📦 Order History for {member.name}
                                </h4>
                                
                                {(!member.orders || member.orders.length === 0) ? (
                                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '10px 0' }}>
                                    No purchase orders logged for this customer.
                                  </p>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {member.orders.map((ord, idx) => (
                                      <div 
                                        key={ord._id || idx}
                                        style={{ 
                                          display: 'flex', 
                                          flexDirection: 'column',
                                          gap: '8px',
                                          padding: '12px',
                                          background: 'rgba(0,0,0,0.2)',
                                          border: '1px solid rgba(255,255,255,0.03)',
                                          borderRadius: '8px',
                                          fontSize: '0.85rem'
                                        }}
                                      >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                                          <span><strong>Order ID:</strong> <code style={{ color: 'var(--accent-violet)' }}>{ord._id}</code></span>
                                          <span><strong>Date:</strong> {new Date(ord.orderDate).toLocaleDateString()}</span>
                                          <span><strong>Amount:</strong> <span style={{ color: 'var(--accent-green)', fontWeight: '600' }}>₹{ord.amount}</span></span>
                                          <span>
                                            <span className={`badge ${ord.status === 'Completed' ? 'delivered' : 'failed'}`}>
                                              {ord.status || 'Completed'}
                                            </span>
                                          </span>
                                        </div>
                                        <div>
                                          <strong>Products:</strong>{' '}
                                          {ord.products && ord.products.length > 0 
                                            ? ord.products.join(', ') 
                                            : 'No products listed'
                                          }
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
