"use client";

import { useState, useRef, useEffect } from 'react';
import { apiRequest } from '@/lib/api';

type Message = {
  id: string;
  role: 'user' | 'ai';
  content: string;
};

const SUGGESTED_PROMPTS = [
  "Tolong cek dong, berapa total saldoku sekarang?",
  "Apa pengeluaran terbesar saya bulan ini?",
  "Beri saya tips hemat minggu ini."
];

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate unique session ID on mount
    setSessionId(`session_user_${Math.random().toString(36).substring(2, 11)}`);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, isOpen]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage = text.trim();
    setInput('');
    const newMessageId = Math.random().toString(36).substring(2, 9);
    setMessages(prev => [...prev, { id: newMessageId, role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await apiRequest<{ reply: string, type?: string }>('/chat', {
        method: 'POST',
        body: JSON.stringify({ message: userMessage, session_id: sessionId })
      });
      
      setMessages(prev => [...prev, { 
        id: Math.random().toString(36).substring(2, 9), 
        role: 'ai', 
        content: response.reply 
      }]);
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

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  return (
    <div className="chatbot-container">
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="chat-avatar-large">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 8V4m0 0L9 7m3-3l3 3" />
                  <rect x="5" y="8" width="14" height="10" rx="2" />
                  <circle cx="9" cy="13" r="1" fill="currentColor" />
                  <circle cx="15" cy="13" r="1" fill="currentColor" />
                  <path d="M10 16s1 1 2 1 2-1 2-1" />
                </svg>
              </div>
              <div>
                <h3>FinBot AI</h3>
                <span className="status-online">Siap membantu</span>
              </div>
            </div>
            <button className="close-chat" onClick={() => setIsOpen(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          
          <div className="chat-messages" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-avatar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 8V4m0 0L9 7m3-3l3 3" />
                    <rect x="5" y="8" width="14" height="10" rx="2" />
                    <circle cx="9" cy="13" r="1" fill="currentColor" />
                    <circle cx="15" cy="13" r="1" fill="currentColor" />
                    <path d="M10 16s1 1 2 1 2-1 2-1" />
                  </svg>
                </div>
                <p className="greeting">Halo! Saya asisten keuangan Finansialin Anda. Ada yang bisa saya bantu hari ini?</p>
                <div className="suggested-prompts">
                  {SUGGESTED_PROMPTS.map((prompt, index) => (
                    <button 
                      key={index} 
                      className="prompt-pill"
                      onClick={() => handleSend(prompt)}
                      disabled={isLoading}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`message-wrapper ${m.role}`}>
                  <div className="message-bubble">
                    {m.content.split('\n').map((line, i) => (
                      <span key={i}>
                        {line}
                        <br />
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
            
            {isLoading && (
              <div className="message-wrapper ai">
                <div className="message-bubble loading">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
            )}
          </div>

          <form className="chat-input-area" onSubmit={onSubmit}>
            <input 
              type="text" 
              placeholder="Ketik pesan..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              autoFocus
              disabled={isLoading}
            />
            <button 
              type="submit" 
              disabled={!input.trim() || isLoading} 
              className="send-btn"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </button>
          </form>
        </div>
      )}

      <button 
        type="button" 
        className={`fab ${isOpen ? 'active' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Chat AI"
      >
        <div className="fab-icon">
          {isOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="5" y="8" width="14" height="10" rx="2" />
              <circle cx="9" cy="13" r="1" fill="currentColor" />
              <circle cx="15" cy="13" r="1" fill="currentColor" />
              <path d="M10 16s1 1 2 1 2-1 2-1" />
              <path d="M12 8V4m0 0L9 7m3-3l3 3" />
            </svg>
          )}
        </div>
        {!isOpen && <span className="fab-badge">1</span>}
      </button>

      <style jsx>{`
        .chatbot-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
        }

        .chat-window {
          position: absolute;
          bottom: 84px;
          right: 0;
          width: 380px;
          max-width: calc(100vw - 48px);
          height: 550px;
          max-height: calc(100vh - 140px);
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 28px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.15), 0 0 1px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          border: 1px solid rgba(255,255,255,0.2);
        }

        @keyframes popIn {
          from { opacity: 0; transform: scale(0.9) translateY(40px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .chat-header {
          padding: 20px;
          background: #171717;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .chat-header-info {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .chat-avatar-large {
          width: 40px;
          height: 40px;
          background: #f1c74a;
          color: #171717;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
        }

        .chat-header h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .status-online {
          font-size: 0.75rem;
          color: #4ade80;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 5px;
          opacity: 0.9;
        }
        .status-online::before {
          content: '';
          width: 6px;
          height: 6px;
          background: currentColor;
          border-radius: 50%;
        }

        .close-chat {
          background: rgba(255,255,255,0.1);
          border: none;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          display: grid;
          place-items: center;
          transition: all 0.2s;
        }
        .close-chat:hover { background: rgba(255,255,255,0.2); }

        .chat-messages {
          flex: 1;
          padding: 24px 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: linear-gradient(to bottom, #ffffff, #f9f9f9);
          scroll-behavior: smooth;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          height: 100%;
          padding: 0 10px;
          animation: fadeIn 0.5s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .empty-avatar {
          width: 56px;
          height: 56px;
          background: #f1c74a;
          color: #171717;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          box-shadow: 0 8px 24px rgba(241, 199, 74, 0.3);
        }

        .empty-avatar svg {
          width: 32px;
          height: 32px;
        }

        .greeting {
          font-size: 1rem;
          color: #171717;
          font-weight: 600;
          line-height: 1.5;
          margin-bottom: 24px;
        }

        .suggested-prompts {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
        }

        .prompt-pill {
          background: white;
          border: 1px solid #e5e5e5;
          padding: 12px 16px;
          border-radius: 20px;
          font-size: 0.85rem;
          color: #4a4a4a;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }

        .prompt-pill:hover:not(:disabled) {
          border-color: #f1c74a;
          background: #fffdf5;
          color: #171717;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(241, 199, 74, 0.1);
        }
        
        .prompt-pill:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .message-wrapper {
          display: flex;
          flex-direction: column;
          animation: messageSlide 0.3s ease-out;
        }

        @keyframes messageSlide {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .message-bubble {
          max-width: 85%;
          padding: 14px 18px;
          border-radius: 20px;
          font-size: 0.92rem;
          line-height: 1.5;
          position: relative;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
          word-wrap: break-word;
        }

        .message-wrapper.ai .message-bubble {
          align-self: flex-start;
          background: white;
          color: #222;
          border-bottom-left-radius: 4px;
          border: 1px solid #eee;
        }

        .message-wrapper.user .message-bubble {
          align-self: flex-end;
          background: #f1c74a;
          color: #171717;
          border-bottom-right-radius: 4px;
          font-weight: 500;
        }

        .loading {
          display: flex;
          gap: 4px;
          padding: 14px 18px !important;
          align-items: center;
          height: 42px;
        }
        .dot {
          width: 6px;
          height: 6px;
          background: #888;
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out;
        }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1.0); }
        }

        .chat-input-area {
          padding: 16px 20px 24px;
          background: white;
          display: flex;
          gap: 12px;
          align-items: center;
          border-top: 1px solid rgba(0,0,0,0.05);
        }

        .chat-input-area input {
          flex: 1;
          background: #f4f4f4;
          border: 1px solid transparent;
          border-radius: 20px;
          padding: 14px 20px;
          font-size: 0.95rem;
          outline: none;
          transition: all 0.2s;
        }

        .chat-input-area input:focus {
          background: white;
          border-color: #f1c74a;
          box-shadow: 0 0 0 4px rgba(241, 199, 74, 0.1);
        }
        
        .chat-input-area input:disabled {
          background: #f9f9f9;
          cursor: not-allowed;
        }

        .send-btn {
          background: #171717;
          color: #f1c74a;
          border: none;
          width: 48px;
          height: 48px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .send-btn:hover:not(:disabled) { 
          transform: scale(1.05); 
          background: #222; 
        }
        .send-btn:active:not(:disabled) { 
          transform: scale(0.95); 
        }
        .send-btn:disabled { 
          opacity: 0.5; 
          cursor: not-allowed; 
          transform: none; 
          background: #e0e0e0;
          color: #a0a0a0;
        }

        .fab {
          width: 64px;
          height: 64px;
          border-radius: 22px;
          background: #171717;
          color: #f1c74a;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          position: relative;
        }

        .fab:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 35px rgba(0,0,0,0.4);
        }

        .fab.active {
          background: #f1c74a;
          color: #171717;
          transform: rotate(90deg);
        }

        .fab-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.3s;
        }
        .fab.active .fab-icon { transform: rotate(-90deg); }

        .fab-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          background: #ff4d4d;
          color: white;
          font-size: 11px;
          font-weight: 700;
          min-width: 20px;
          height: 20px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid #fff;
        }
      `}</style>
    </div>
  );
}

