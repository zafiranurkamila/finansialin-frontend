"use client";

import { useState, useRef, useEffect } from 'react';
import { apiRequest } from '@/lib/api';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Halo! Saya asisten Finansialin. Ada yang bisa saya bantu dengan keuangan Anda? 😊' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await apiRequest<{ reply: string }>('/insights/chat', {
        method: 'POST',
        body: JSON.stringify({ message: userMessage })
      });
      
      setMessages(prev => [...prev, { role: 'assistant', content: response.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Maaf, terjadi kesalahan koneksi ke server AI.' }]);
    } finally {
      setIsLoading(false);
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
            {messages.map((m, i) => (
              <div key={i} className={`message-wrapper ${m.role}`}>
                <div className="message-bubble">
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message-wrapper assistant">
                <div className="message-bubble loading">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
            )}
          </div>

          <form className="chat-input-area" onSubmit={handleSend}>
            <input 
              type="text" 
              placeholder="Tanya soal keuangan..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoFocus
            />
            <button type="submit" disabled={isLoading} className="send-btn">
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
          height: 520px;
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
        }

        .message-wrapper.assistant .message-bubble {
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
        }

        .chat-input-area input {
          flex: 1;
          background: #f4f4f4;
          border: 1px solid transparent;
          border-radius: 16px;
          padding: 12px 18px;
          font-size: 0.95rem;
          outline: none;
          transition: all 0.2s;
        }

        .chat-input-area input:focus {
          background: white;
          border-color: #f1c74a;
          box-shadow: 0 0 0 4px rgba(241, 199, 74, 0.1);
        }

        .send-btn {
          background: #171717;
          color: #f1c74a;
          border: none;
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .send-btn:hover { transform: scale(1.05); background: #222; }
        .send-btn:active { transform: scale(0.95); }
        .send-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

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
