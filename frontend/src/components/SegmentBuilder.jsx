import React, { useState, useEffect } from 'react';
import { evaluateSegment, parseAISegment } from '../utils/api';

export default function SegmentBuilder({ onSelectSegment }) {
  const [activeTab, setActiveTab] = useState('rules'); // 'rules' or 'nlp'
  
  // Rule State
  const [rules, setRules] = useState({
    city: '',
    totalSpentMin: '',
    totalOrdersMin: '',
    inactiveDays: '',
    gender: '',
    ageMin: '',
    ageMax: ''
  });
  
  const [ruleCount, setRuleCount] = useState(0);
  const [ruleMongoQuery, setRuleMongoQuery] = useState({});

  // NLP State
  const [nlpQuery, setNlpQuery] = useState('');
  const [nlpParsed, setNlpParsed] = useState(null);
  const [nlpLoading, setNlpLoading] = useState(false);

  // Evaluate Rules on Change
  const evaluateRules = async () => {
    try {
      const cleanRules = {};
      if (rules.city) cleanRules.city = rules.city;
      if (rules.totalSpentMin) cleanRules.totalSpentMin = Number(rules.totalSpentMin);
      if (rules.totalOrdersMin) cleanRules.totalOrdersMin = Number(rules.totalOrdersMin);
      if (rules.inactiveDays) cleanRules.inactiveDays = Number(rules.inactiveDays);
      if (rules.gender) cleanRules.gender = rules.gender;
      if (rules.ageMin) cleanRules.ageMin = Number(rules.ageMin);
      if (rules.ageMax) cleanRules.ageMax = Number(rules.ageMax);

      const res = await evaluateSegment(cleanRules);
      setRuleCount(res.count);
      setRuleMongoQuery(res.mongoQuery);
    } catch (e) {
      console.error('Failed evaluating rules size:', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'rules') {
      evaluateRules();
    }
  }, [rules, activeTab]);

  // Run AI query parsing
  const handleNLPAnalyze = async () => {
    if (!nlpQuery.trim()) return;
    setNlpLoading(true);
    setNlpParsed(null);
    try {
      const parsed = await parseAISegment(nlpQuery);
      setNlpParsed(parsed);
    } catch (e) {
      console.error('Failed AI parse:', e);
      alert('AI analysis failed. Please check the AI Python service.');
    } finally {
      setNlpLoading(false);
    }
  };

  const handleApplyRulesSegment = () => {
    const cleanRules = {};
    if (rules.city) cleanRules.city = rules.city;
    if (rules.totalSpentMin) cleanRules.totalSpentMin = Number(rules.totalSpentMin);
    if (rules.totalOrdersMin) cleanRules.totalOrdersMin = Number(rules.totalOrdersMin);
    if (rules.inactiveDays) cleanRules.inactiveDays = Number(rules.inactiveDays);
    if (rules.gender) cleanRules.gender = rules.gender;
    if (rules.ageMin) cleanRules.ageMin = Number(rules.ageMin);
    if (rules.ageMax) cleanRules.ageMax = Number(rules.ageMax);

    onSelectSegment(cleanRules, `Rules: City=${rules.city || 'All'}, Spent>=₹${rules.totalSpentMin || 0}`);
  };

  const handleApplyNLPSegment = () => {
    if (!nlpParsed) return;
    onSelectSegment(nlpParsed.criteria, `AI: "${nlpQuery}"`);
  };

  return (
    <div>
      <div className="header-container">
        <div>
          <h1 className="view-title">Audience Segmentation Builder</h1>
          <p className="view-subtitle">Select targeted cohorts based on traits, orders, or AI queries</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
        <button 
          className={`btn ${activeTab === 'rules' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('rules')}
        >
          📋 Standard Filter Rules
        </button>
        <button 
          className={`btn ${activeTab === 'nlp' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('nlp')}
        >
          🧠 AI Natural Language Builder
        </button>
      </div>

      {activeTab === 'rules' ? (
        <div className="two-column-layout">
          {/* Rules Form */}
          <div className="glass-panel">
            <div className="panel-header">🔧 Define Filtering Criteria</div>
            
            <div className="form-grid">
              <div className="form-group">
                <label>Location (City)</label>
                <select value={rules.city} onChange={(e) => setRules({...rules, city: e.target.value})}>
                  <option value="">All Cities</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Bangalore">Bangalore</option>
                  <option value="Pune">Pune</option>
                </select>
              </div>

              <div className="form-group">
                <label>Gender</label>
                <select value={rules.gender} onChange={(e) => setRules({...rules, gender: e.target.value})}>
                  <option value="">All Genders</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div className="form-group">
                <label>Minimum Total Spent (₹)</label>
                <input 
                  type="number" 
                  value={rules.totalSpentMin} 
                  onChange={(e) => setRules({...rules, totalSpentMin: e.target.value})}
                  placeholder="e.g. 5000"
                />
              </div>

              <div className="form-group">
                <label>Minimum Orders Placed</label>
                <input 
                  type="number" 
                  value={rules.totalOrdersMin} 
                  onChange={(e) => setRules({...rules, totalOrdersMin: e.target.value})}
                  placeholder="e.g. 3"
                />
              </div>

              <div className="form-group">
                <label>Inactive Days (Last order older than)</label>
                <input 
                  type="number" 
                  value={rules.inactiveDays} 
                  onChange={(e) => setRules({...rules, inactiveDays: e.target.value})}
                  placeholder="e.g. 90"
                />
              </div>

              <div className="form-group">
                <label>Age Range (Min - Max)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="number" 
                    placeholder="Min" 
                    value={rules.ageMin} 
                    onChange={(e) => setRules({...rules, ageMin: e.target.value})} 
                  />
                  <input 
                    type="number" 
                    placeholder="Max" 
                    value={rules.ageMax} 
                    onChange={(e) => setRules({...rules, ageMax: e.target.value})} 
                  />
                </div>
              </div>
            </div>
            
            <button className="btn btn-secondary" onClick={() => setRules({
              city: '', totalSpentMin: '', totalOrdersMin: '', inactiveDays: '', gender: '', ageMin: '', ageMax: ''
            })}>
              Reset Filters
            </button>
          </div>

          {/* Sizing result */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifySpace: 'space-between' }}>
            <div>
              <div className="panel-header">🎯 Target Audience Sizing</div>
              <div style={{ textAlign: 'center', margin: '30px 0' }}>
                <div style={{ fontSize: '4.5rem', fontWeight: '700', color: 'var(--accent-cyan)' }}>{ruleCount}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Matching Customers</div>
              </div>
              
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>Generated MongoDB filter:</h4>
                <pre style={{ 
                  background: 'rgba(0,0,0,0.3)', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  fontSize: '0.8rem', 
                  color: 'var(--accent-violet)',
                  overflowX: 'auto'
                }}>
                  {JSON.stringify(ruleMongoQuery, null, 2)}
                </pre>
              </div>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '30px' }}
              onClick={handleApplyRulesSegment}
              disabled={ruleCount === 0}
            >
              Draft Campaign for this Segment
            </button>
          </div>
        </div>
      ) : (
        <div className="two-column-layout">
          {/* AI Input */}
          <div className="glass-panel">
            <div className="panel-header">🧠 Ask AI to Create the Segment</div>
            
            <div className="nlp-box-container">
              <input 
                type="text" 
                className="nlp-input"
                value={nlpQuery}
                onChange={(e) => setNlpQuery(e.target.value)}
                placeholder="Find customers who live in Delhi, spent more than ₹5000 and haven't purchased in 3 months"
                onKeyDown={(e) => e.key === 'Enter' && handleNLPAnalyze()}
              />
              <button className="btn btn-accent" onClick={handleNLPAnalyze} disabled={nlpLoading || !nlpQuery.trim()}>
                {nlpLoading ? 'Analyzing...' : 'Parse Query'}
              </button>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              💡 Example requests: <br />
              - "Show inactive females who bought items more than 3 times"<br />
              - "Find shoppers from Mumbai with age above 30 who spent more than 4000"
            </p>
          </div>

          {/* Sizing & JSON output */}
          <div className="glass-panel">
            <div className="panel-header">📊 Segment Estimation Result</div>
            {nlpLoading ? (
              <div style={{ textAlign: 'center', margin: '40px 0', color: 'var(--text-secondary)' }}>
                Parsing query through Gemini Flash...
              </div>
            ) : nlpParsed ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '4.5rem', fontWeight: '700', color: 'var(--accent-pink)' }}>{nlpParsed.audienceSize}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Matching Customers</div>
                </div>
                
                <div>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>AI Explanation:</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: '4px', borderLeft: '2px solid var(--accent-pink)', paddingLeft: '8px' }}>
                    {nlpParsed.explanation}
                  </p>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Extracted Segment Rules:</h4>
                  <pre style={{ 
                    background: 'rgba(0,0,0,0.3)', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    fontSize: '0.8rem', 
                    color: 'var(--accent-cyan)',
                    overflowX: 'auto',
                    marginTop: '4px'
                  }}>
                    {JSON.stringify(nlpParsed.criteria, null, 2)}
                  </pre>
                </div>

                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', marginTop: '10px' }}
                  onClick={handleApplyNLPSegment}
                  disabled={nlpParsed.audienceSize === 0}
                >
                  Draft Campaign for this Segment
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', margin: '40px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Type an instruction on the left and click "Parse Query" to generate your audience.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
