"use client";

import { useState, useRef, useEffect } from 'react';
import { apiRequest } from '@/lib/api';

type Message = {
  id: string;
  role: 'user' | 'ai';
  content: string;
};

const SUGGESTED_PROMPTS = [
  "Berapa total saldoku sekarang?",
  "Apa pengeluaran terbesar saya bulan ini?",
  "Beri saya tips hemat minggu ini.",
  "Bagaimana performa budget saya?"
];

const MiniChart = ({ data }: { data: any }) => {
  if (!data || !data.values || !data.values.length) return null;

  const { type, labels, values, title } = data;
  const max = Math.max(...values, 1);
  const chartHeight = 120;
  const chartWidth = 300;

  if (type === 'pie' || type === 'donut') {
    let total = values.reduce((a: number, b: number) => a + b, 0);
    let currentAngle = 0;
    const colors = ['#f1c74a', '#f9df94', '#9d8120', '#fff7d4', '#eab308'];

    return (
      <div className="mini-chart pie-chart" style={{ marginTop: '16px', background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
        {title && <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#f1c74a' }}>{title}</h4>}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <svg viewBox="0 0 100 100" style={{ width: '100px', height: '100px', transform: 'rotate(-90deg)' }}>
            {values.map((val: number, i: number) => {
              const sliceAngle = (val / total) * 100;
              const dashArray = `${sliceAngle} ${100 - sliceAngle}`;
              const dashOffset = -currentAngle;
              currentAngle += sliceAngle;
              return (
                <circle
                  key={i}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={colors[i % colors.length]}
                  strokeWidth="15"
                  strokeDasharray={dashArray}
                  strokeDashoffset={dashOffset}
                  pathLength="100"
                />
              );
            })}
            <circle cx="50" cy="50" r="30" fill="#171717" />
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            {labels.map((label: string, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#ccc' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors[i % colors.length] }} />
                <span style={{ flex: 1 }}>{label}</span>
                <span style={{ fontWeight: 600 }}>{Math.round((values[i] / total) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'bar') {
    return (
      <div className="mini-chart bar-chart" style={{ marginTop: '16px', background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
        {title && <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#f1c74a' }}>{title}</h4>}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: `${chartHeight}px`, borderLeft: '1px solid rgba(255,255,255,0.2)', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingLeft: '8px', paddingBottom: '4px' }}>
          {values.map((val: number, i: number) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div 
                style={{ 
                  width: '80%', 
                  height: `${(val / max) * (chartHeight - 20)}px`, 
                  background: 'linear-gradient(to top, #f1c74a, #f9df94)', 
                  borderRadius: '2px 2px 0 0',
                  minHeight: '2px'
                }} 
              />
              <span style={{ fontSize: '10px', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>
                {labels[i]}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default to Line Chart
  const points = values.map((val: number, i: number) => {
    const x = (i / (values.length - 1)) * (chartWidth - 60) + 40;
    const y = chartHeight - ((val / max) * (chartHeight - 40) + 20);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="mini-chart line-chart" style={{ marginTop: '16px', background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
      {title && <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#f1c74a' }}>{title}</h4>}
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: 'auto' }}>
        {/* Y Axis */}
        <line x1="30" y1="10" x2="30" y2={chartHeight - 20} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        {/* X Axis */}
        <line x1="30" y1={chartHeight - 20} x2={chartWidth - 10} y2={chartHeight - 20} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        
        <polyline
          fill="none"
          stroke="#f1c74a"
          strokeWidth="2"
          points={points}
        />
        {values.map((val: number, i: number) => {
          const x = (i / (values.length - 1)) * (chartWidth - 60) + 40;
          const y = chartHeight - ((val / max) * (chartHeight - 40) + 20);
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="3" fill="#f1c74a" />
              <text x={x} y={chartHeight - 5} fontSize="8" fill="#aaa" textAnchor="middle">{labels[i]}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export function AiChatView({ userId }: { userId?: number | null }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'model', text: string}[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Derive user-scoped localStorage keys (reset when userId changes)
  const storagePrefix = userId != null ? `u${userId}_` : 'guest_';
  const KEY_MESSAGES = `finansialin_chat_messages_${storagePrefix}`;
  const KEY_HISTORY  = `finansialin_chat_history_${storagePrefix}`;
  const KEY_SESSION  = `finansialin_chat_session_id_${storagePrefix}`;

  // When userId becomes known, load that user's chat data
  useEffect(() => {
    // Reset state first (in case we switched user)
    setMessages([]);
    setChatHistory([]);
    setSessionId('');

    const storedSession = localStorage.getItem(KEY_SESSION);
    if (storedSession) {
      setSessionId(storedSession);
    } else {
      const newSession = `session_${storagePrefix}${Math.random().toString(36).substring(2, 11)}`;
      setSessionId(newSession);
      localStorage.setItem(KEY_SESSION, newSession);
    }

    const storedMessages = localStorage.getItem(KEY_MESSAGES);
    if (storedMessages) {
      try {
        setMessages(JSON.parse(storedMessages));
      } catch (e) {
        console.error("Failed to parse stored messages", e);
      }
    }

    const storedHistory = localStorage.getItem(KEY_HISTORY);
    if (storedHistory) {
      try {
        setChatHistory(JSON.parse(storedHistory));
      } catch (e) {
        console.error("Failed to parse stored chat history", e);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Save messages to localStorage when updated
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(KEY_MESSAGES, JSON.stringify(messages));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Save chat history to localStorage when updated
  useEffect(() => {
    if (chatHistory.length > 0) {
      localStorage.setItem(KEY_HISTORY, JSON.stringify(chatHistory));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatHistory]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleClearChat = () => {
    if (confirm("Apakah Anda yakin ingin menghapus semua riwayat chat?")) {
      setMessages([]);
      setChatHistory([]);
      const newSession = `session_${storagePrefix}${Math.random().toString(36).substring(2, 11)}`;
      setSessionId(newSession);
      localStorage.removeItem(KEY_MESSAGES);
      localStorage.removeItem(KEY_HISTORY);
      localStorage.setItem(KEY_SESSION, newSession);
    }
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage = text.trim();
    setInput('');
    const newMessageId = Math.random().toString(36).substring(2, 9);
    
    // Maintain snapshots for consistent state during async call
    const currentHistory = [...chatHistory];
    
    setMessages(prev => [...prev, { id: newMessageId, role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await apiRequest<{ reply: string, type?: string }>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ 
          message: userMessage, 
          session_id: sessionId,
          history: currentHistory // Send history to backend
        })
      });
      
      const aiReply = response.reply;
      setMessages(prev => [...prev, { 
        id: Math.random().toString(36).substring(2, 9), 
        role: 'ai', 
        content: aiReply 
      }]);

      // Update history for next turn
      setChatHistory(prev => [
        ...prev,
        { role: 'user', text: userMessage },
        { role: 'model', text: aiReply }
      ]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        id: Math.random().toString(36).substring(2, 9), 
        role: 'ai', 
        content: 'Maaf, terjadi gangguan saat menghubungi server. Coba beberapa saat lagi.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    handleSend(input);
  };

  return (
    <div className="ai-chat-view">
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="bot-avatar-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px' }}>
              <rect x="5" y="8" width="14" height="10" rx="2" />
              <circle cx="9" cy="13" r="1" fill="currentColor" />
              <circle cx="15" cy="13" r="1" fill="currentColor" />
              <path d="M10 16s1 1 2 1 2-1 2-1" />
            </svg>
          </span>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#171717' }}>FinBot AI</h3>
            <span style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginTop: '2px' }}>Asisten Keuangan Pribadi</span>
          </div>
        </div>
        {messages.length > 0 && (
          <button className="clear-chat-btn" onClick={handleClearChat} title="Hapus Riwayat Chat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '18px', height: '18px', marginRight: '4px' }}>
              <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
            </svg>
            Hapus Riwayat
          </button>
        )}
      </div>
      <div className="chat-content" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="chat-welcome">
            <div className="bot-avatar-large">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 8V4m0 0L9 7m3-3l3 3" />
                <rect x="5" y="8" width="14" height="10" rx="2" />
                <circle cx="9" cy="13" r="1" fill="currentColor" />
                <circle cx="15" cy="13" r="1" fill="currentColor" />
                <path d="M10 16s1 1 2 1 2-1 2-1" />
              </svg>
            </div>
            <h1>Halo! Saya FinBot AI.</h1>
            <p>Apa yang bisa saya bantu untuk keuangan Anda hari ini?</p>
            
            <div className="suggested-grid">
              {SUGGESTED_PROMPTS.map((prompt, index) => (
                <button 
                  key={index} 
                  className="suggested-card"
                  onClick={() => handleSend(prompt)}
                  disabled={isLoading}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((m) => (
              <div key={m.id} className={`message-row ${m.role}`}>
                <div className="message-container">
                  <div className="avatar-small">
                    {m.role === 'ai' ? (
                       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="5" y="8" width="14" height="10" rx="2" />
                        <circle cx="9" cy="13" r="1" fill="currentColor" />
                        <circle cx="15" cy="13" r="1" fill="currentColor" />
                        <path d="M10 16s1 1 2 1 2-1 2-1" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 0 0-16 0" /></svg>
                    )}
                  </div>
                  <div className="message-text">
                    {(() => {
                      // More robust regex to find the chart block
                      const chartMatch = m.content.match(/\[CHART_DATA:\s*({[\s\S]*?})\]/);
                      const textContent = chartMatch ? m.content.replace(chartMatch[0], '').trim() : m.content;
                      let chartData = null;
                      if (chartMatch) {
                        try {
                          chartData = JSON.parse(chartMatch[1]);
                        } catch (e) {
                          console.error("Failed to parse chart data", e);
                        }
                      }

                      const renderText = (text: string) => {
                        if (!text) return null;
                        return text.split('\n').map((line, i) => {
                          if (!line.trim()) return <div key={i} style={{ height: '8px' }} />;
                          // Handle Bullet Points
                          if (line.trim().startsWith('- ')) {
                            return <li key={i} style={{ marginLeft: '16px', marginBottom: '4px' }}>{parseInline(line.trim().substring(2))}</li>;
                          }
                          // Handle Paragraphs
                          return <p key={i} style={{ marginBottom: '8px' }}>{parseInline(line)}</p>;
                        });
                      };

                      const parseInline = (text: string) => {
                        const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
                        return parts.map((part, i) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={i}>{part.slice(2, -2)}</strong>;
                          }
                          if (part.startsWith('*') && part.endsWith('*')) {
                            return <em key={i}>{part.slice(1, -1)}</em>;
                          }
                          return part;
                        });
                      };

                      return (
                        <>
                          <div className="message-text-content">
                            {renderText(textContent)}
                          </div>
                          {chartData && <MiniChart data={chartData} />}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message-row ai">
                <div className="message-container">
                  <div className="avatar-small">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="5" y="8" width="14" height="10" rx="2" />
                      <circle cx="9" cy="13" r="1" fill="currentColor" />
                      <circle cx="15" cy="13" r="1" fill="currentColor" />
                      <path d="M10 16s1 1 2 1 2-1 2-1" />
                    </svg>
                  </div>
                  <div className="message-text typing">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="chat-input-wrapper">
        <form className="chat-input-form" onSubmit={onSubmit}>
          <textarea 
            placeholder="Tanyakan sesuatu ke FinBot..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e as any);
              }
            }}
            disabled={isLoading}
            rows={1}
          />
          <button type="submit" disabled={!input.trim() || isLoading}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          </button>
        </form>
        <p className="chat-disclaimer">FinBot dapat melakukan kesalahan. Pertimbangkan untuk memeriksa informasi penting.</p>
      </div>

      <style jsx>{`
        .ai-chat-view {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 120px);
          background: #fff;
          border-radius: 32px;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(0,0,0,0.03);
          border: 1px solid #f0f0f0;
          position: relative;
        }

        .chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          border-bottom: 1px solid #f0f0f0;
          background: #fff;
          z-index: 10;
        }

        .bot-avatar-icon {
          width: 36px;
          height: 36px;
          background: #f1c74a;
          color: #171717;
          border-radius: 10px;
          display: grid;
          place-items: center;
        }

        .clear-chat-btn {
          background: transparent;
          border: 1px solid #e0e0e0;
          padding: 8px 12px;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 500;
          color: #666;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: all 0.2s;
        }

        .clear-chat-btn:hover {
          background: #fff5f5;
          border-color: #feb2b2;
          color: #e53e3e;
        }

        .chat-content {
          flex: 1;
          overflow-y: auto;
          padding: 40px 20px;
          display: flex;
          flex-direction: column;
          scroll-behavior: smooth;
        }

        .chat-welcome {
          max-width: 650px;
          margin: 60px auto;
          text-align: center;
        }

        .bot-avatar-large {
          width: 80px;
          height: 80px;
          background: #f1c74a;
          color: #171717;
          border-radius: 24px;
          display: grid;
          place-items: center;
          margin: 0 auto 24px;
          padding: 15px;
          box-shadow: 0 10px 25px rgba(241, 199, 74, 0.3);
        }

        .chat-welcome h1 {
          font-size: 2.2rem;
          font-weight: 800;
          margin-bottom: 12px;
          letter-spacing: -0.03em;
        }

        .chat-welcome p {
          color: #666;
          font-size: 1.1rem;
          margin-bottom: 40px;
        }

        .suggested-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .suggested-card {
          background: #fff;
          border: 1px solid #eee;
          padding: 16px;
          border-radius: 16px;
          font-size: 0.95rem;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s;
          color: #444;
          font-weight: 500;
        }

        .suggested-card:hover {
          background: #fcfbf7;
          border-color: #f1c74a;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .messages-list {
          max-width: 800px;
          width: 100%;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .message-row {
          display: flex;
          width: 100%;
        }

        .message-container {
          display: flex;
          gap: 16px;
          max-width: 85%;
        }

        .message-row.user {
          justify-content: flex-end;
        }

        .message-row.user .message-container {
          flex-direction: row-reverse;
        }

        .avatar-small {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          padding: 8px;
        }

        .message-row.ai .avatar-small {
          background: #f1c74a;
          color: #171717;
        }

        .message-row.user .avatar-small {
          background: #171717;
          color: #fff;
        }

        .message-text {
          padding: 4px 0;
        }

        .message-text p {
          margin-bottom: 12px;
          line-height: 1.6;
          font-size: 1.05rem;
          color: #222;
        }

        .message-text p:last-child {
          margin-bottom: 0;
        }

        .message-row.user .message-text p {
          text-align: right;
        }

        .chat-input-wrapper {
          padding: 20px 20px 30px;
          max-width: 840px;
          width: 100%;
          margin: 0 auto;
        }

        .chat-input-form {
          position: relative;
          background: #f8f8f8;
          border: 1px solid #eee;
          border-radius: 20px;
          padding: 8px 8px 8px 24px;
          display: flex;
          align-items: center;
          transition: all 0.2s;
        }

        .chat-input-form:focus-within {
          background: #fff;
          border-color: #f1c74a;
          box-shadow: 0 0 0 4px rgba(241, 199, 74, 0.1);
        }

        .chat-input-form textarea {
          flex: 1;
          border: none;
          background: transparent;
          padding: 14px 0;
          font-size: 1rem;
          outline: none;
          color: #171717;
          resize: none;
          font-family: inherit;
          max-height: 150px;
          line-height: 1.5;
        }

        .chat-input-form button {
          width: 44px;
          height: 44px;
          background: #171717;
          color: #f1c74a;
          border: none;
          border-radius: 14px;
          display: grid;
          place-items: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .chat-input-form button:hover:not(:disabled) {
          transform: scale(1.05);
          background: #222;
        }

        .chat-input-form button:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .chat-disclaimer {
          text-align: center;
          font-size: 0.75rem;
          color: #999;
          margin-top: 12px;
        }

        .typing {
          display: flex;
          gap: 4px;
          align-items: center;
          padding: 10px 0;
        }
        .dot {
          width: 5px;
          height: 5px;
          background: #aaa;
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out;
        }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1.0); }
        }
      `}</style>
    </div>
  );
}
