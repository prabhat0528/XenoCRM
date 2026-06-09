import React, { useState, useEffect, useRef } from 'react';
import { chatWithAI } from '../utils/api';

export default function AIChatAssistant({ onApplyCampaign }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([
    {
      user: '',
      assistant: "Hello! I am your CRM AI Co-Pilot. 🤖 I can help you filter segments, write message copy, or suggest campaigns. Try typing:\n\n'Create a WhatsApp campaign for customers who spent more than 5000'"
    }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, isOpen]);

  const handleSend = async () => {
    if (!message.trim()) return;
    const userMsg = message;
    setMessage('');
    
    // Add user message to history
    setHistory((prev) => [...prev, { user: userMsg, assistant: '' }]);
    setLoading(true);

    try {
      // Clean history representation for AI (only send textual histories)
      const cleanHistory = history.map(h => ({
        user: h.user,
        assistant: h.assistant
      }));

      const res = await chatWithAI(userMsg, cleanHistory);
      
      // Update last history entry with AI response
      setHistory((prev) => {
        const copy = [...prev];
        const lastIdx = copy.length - 1;
        copy[lastIdx].assistant = res.response;
        copy[lastIdx].action = res.action; // Save structural action
        return copy;
      });
    } catch (e) {
      console.error('AI chat failed:', e);
      setHistory((prev) => {
        const copy = [...prev];
        const lastIdx = copy.length - 1;
        copy[lastIdx].assistant = 'Error: AI service is currently unavailable. Please verify the AI Flask service is running.';
        return copy;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-floater">
      {/* Floating Toggle Button */}
      <div className="chat-bubble-btn" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? '❌' : '💬'}
      </div>

      {/* Chat Windows drawer */}
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <span className="chat-header-title">🤖 CRM AI Co-Pilot</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>Gemini Enabled</span>
          </div>

          <div className="chat-messages">
            {history.map((msg, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                {msg.user && (
                  <div className="message-bubble user">
                    {msg.user}
                  </div>
                )}
                {msg.assistant && (
                  <div className="message-bubble assistant" style={{ whiteSpace: 'pre-line' }}>
                    {msg.assistant}
                    
                    {/* Render action cards for forms automation */}
                    {msg.action && msg.action.type === 'create_campaign' && (
                      <div className="chat-action-card">
                        <strong style={{ color: 'var(--accent-cyan)' }}>🎯 AI Draft Ready</strong>
                        <div>Name: {msg.action.payload.name}</div>
                        <div>Channel: {msg.action.payload.channel}</div>
                        
                        <button 
                          className="btn btn-accent" 
                          style={{ padding: '6px 12px', fontSize: '0.8rem', marginTop: '8px' }}
                          onClick={() => {
                            onApplyCampaign(msg.action.payload);
                            setIsOpen(false);
                          }}
                        >
                          Apply Draft to Studio
                        </button>
                      </div>
                    )}

                    {msg.action && msg.action.type === 'create_segment' && (
                      <div className="chat-action-card">
                        <strong style={{ color: 'var(--accent-cyan)' }}>🔍 AI Segment Filter Ready</strong>
                        <pre style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          {JSON.stringify(msg.action.payload.criteria, null, 2)}
                        </pre>
                        
                        <button 
                          className="btn btn-accent" 
                          style={{ padding: '6px 12px', fontSize: '0.8rem', marginTop: '8px' }}
                          onClick={() => {
                            onApplyCampaign({
                              segmentCriteria: msg.action.payload.criteria,
                              name: 'AI Segment Draft'
                            });
                            setIsOpen(false);
                          }}
                        >
                          Apply to Creator
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {loading && (
              <div className="message-bubble assistant" style={{ color: 'var(--text-muted)' }}>
                Co-pilot is writing...
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            <input 
              type="text" 
              className="chat-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask me to build a segment or campaign..."
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={loading}
            />
            <button className="chat-send-btn" onClick={handleSend} disabled={loading || !message.trim()}>
              ➔
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
