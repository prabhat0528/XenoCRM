import React, { useState, useEffect } from 'react';
import { checkHealth } from './utils/api';
import Dashboard from './components/Dashboard';
import DataIngestion from './components/DataIngestion';
import SegmentBuilder from './components/SegmentBuilder';
import CampaignCreator from './components/CampaignCreator';
import LiveTracking from './components/LiveTracking';
import AIChatAssistant from './components/AIChatAssistant';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [dbStatus, setDbStatus] = useState('unknown');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Segment bridge states
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [selectedSegmentLabel, setSelectedSegmentLabel] = useState('');
  
  // Campaign creator bridge state (for AI Chat automations)
  const [campaignDraft, setCampaignDraft] = useState(null);
  const [activeCampaignId, setActiveCampaignId] = useState('');

  // Check health on mount and periodically
  const verifyHealth = async () => {
    try {
      const status = await checkHealth();
      setDbStatus(status.database);
    } catch (e) {
      setDbStatus('offline');
    }
  };

  useEffect(() => {
    verifyHealth();
    const interval = setInterval(verifyHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectSegment = (criteria, label) => {
    setSelectedSegment(criteria);
    setSelectedSegmentLabel(label);
    setCurrentView('campaigns');
  };

  const handleNavigateToTracking = (campaignId) => {
    setActiveCampaignId(campaignId);
    setCurrentView('tracking');
  };

  const handleApplyCampaignAI = (payload) => {
    // If AI assistant gives a segment draft or full campaign draft
    if (payload.segmentCriteria) {
      setSelectedSegment(payload.segmentCriteria);
      setSelectedSegmentLabel('AI Chat Assistant Segment');
    }
    
    // Pass entire payload to prefill campaign studio
    setCampaignDraft(payload);
    
    // Switch to campaign creation view
    setCurrentView('campaigns');
  };

  const renderActiveView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'ingest':
        return <DataIngestion />;
      case 'segments':
        return <SegmentBuilder onSelectSegment={handleSelectSegment} />;
      case 'campaigns':
        return (
          <CampaignCreator 
            selectedSegment={selectedSegment}
            selectedSegmentLabel={selectedSegmentLabel}
            campaignDraft={campaignDraft}
            clearCampaignDraft={() => setCampaignDraft(null)}
            onNavigateToTracking={handleNavigateToTracking}
          />
        );
      case 'tracking':
        return <LiveTracking initialCampaignId={activeCampaignId} />;
      default:
        return <Dashboard />;
    }
  };

  // Synchronize campaign creator draft when campaignDraft changes
  // We handle it directly inside CampaignCreator or by clearing it in creator
  useEffect(() => {
    if (campaignDraft) {
      if (campaignDraft.segmentCriteria) {
        setSelectedSegment(campaignDraft.segmentCriteria);
        setSelectedSegmentLabel(campaignDraft.name || 'AI Assistant Selection');
      }
    }
  }, [campaignDraft]);

  return (
    <div className="app-container">
      {/* Mobile Header */}
      <header className="mobile-header">
        <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>
          ☰
        </button>
        <span className="mobile-logo-text">XenoCRM</span>
        <div style={{ width: '24px' }}></div>
      </header>

      {/* Sidebar backdrop scrim */}
      {sidebarOpen && <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)}></div>}

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="logo-container">
          <div className="logo-icon">X</div>
          <span className="logo-text">XenoCRM</span>
        </div>

        <nav className="nav-menu">
          <div 
            className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setCurrentView('dashboard'); setSidebarOpen(false); }}
          >
            <span className="nav-icon">📊</span> Dashboard
          </div>

          <div 
            className={`nav-item ${currentView === 'ingest' ? 'active' : ''}`}
            onClick={() => { setCurrentView('ingest'); setSidebarOpen(false); }}
          >
            <span className="nav-icon">📥</span> Data Ingestion
          </div>

          <div 
            className={`nav-item ${currentView === 'segments' ? 'active' : ''}`}
            onClick={() => { setCurrentView('segments'); setSidebarOpen(false); }}
          >
            <span className="nav-icon">🎯</span> Audience Segments
          </div>

          <div 
            className={`nav-item ${currentView === 'campaigns' ? 'active' : ''}`}
            onClick={() => { setCurrentView('campaigns'); setSidebarOpen(false); }}
          >
            <span className="nav-icon">🚀</span> Campaign Studio
          </div>

          <div 
            className={`nav-item ${currentView === 'tracking' ? 'active' : ''}`}
            onClick={() => { setCurrentView('tracking'); setSidebarOpen(false); }}
          >
            <span className="nav-icon">📡</span> Live Tracker
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="db-status">
            <span className={`status-dot ${dbStatus === 'mock-in-memory' || dbStatus === 'offline' ? 'mock' : ''}`}></span>
            {dbStatus === 'mongodb' ? (
              <span>MongoDB Atlas Connected</span>
            ) : dbStatus === 'mock-in-memory' ? (
              <span>Mock In-Memory DB (Active)</span>
            ) : (
              <span>System Server Offline</span>
            )}
          </div>
        </div>
      </aside>

      {/* Main Dashboard Container */}
      <main className="main-content">
        {renderActiveView()}
      </main>

      {/* Floatable AI Assistant */}
      <AIChatAssistant onApplyCampaign={handleApplyCampaignAI} />
    </div>
  );
}
