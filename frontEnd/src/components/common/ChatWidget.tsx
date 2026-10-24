import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import { MessageItem } from '../../types';

export const ChatWidget: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [counterpart, setCounterpart] = useState<{ id: string; name: string; email: string; phone?: string; role: string } | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && user) {
      initConversation();
    }
  }, [isOpen, user]);

  // Support programmatic opening from dashboard "Chat with Concierge / Agent" button
  useEffect(() => {
    const handleOpenChatEvent = () => setIsOpen(true);
    window.addEventListener('open:chat', handleOpenChatEvent);
    return () => window.removeEventListener('open:chat', handleOpenChatEvent);
  }, []);

  const initConversation = async () => {
    try {
      let res;
      if (user?.roles.includes('AGENT')) {
        res = await api.post('/conversations/agent-manager');
      } else {
        res = await api.post('/conversations/support');
      }
      const convId = res.data.id;
      setConversationId(convId);
      if (res.data.counterpart) {
        setCounterpart(res.data.counterpart);
      }

      // Fetch messages
      const msgRes = await api.get(`/conversations/${convId}/messages`);
      setMessages(msgRes.data.items || []);
      scrollToBottom();

      // Join socket room
      const s = getSocket();
      s.emit('join:conversation', { conversationId: convId });

      s.on('message:new', (msg: MessageItem) => {
        if (msg.conversation_id === convId) {
          setMessages((prev) => [...prev, msg]);
          scrollToBottom();
        }
      });

      s.on('typing:status', (data: { userId: string; isTyping: boolean }) => {
        if (data.userId !== user?.id) {
          setIsTyping(data.isTyping);
        }
      });
    } catch {
      // ignore
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !conversationId) return;

    const s = getSocket();
    s.emit('message:send', {
      conversationId,
      body: inputMessage.trim(),
    });

    setInputMessage('');
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
    if (!conversationId) return;
    const s = getSocket();
    s.emit('typing', { conversationId, isTyping: e.target.value.length > 0 });
  };

  const isAgent = user?.roles.includes('AGENT');

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-2.5 rounded-full px-5 py-3.5 text-white shadow-xl hover:scale-105 active:scale-95 transition-all group ${
            isAgent
              ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 ring-2 ring-amber-400/40 shadow-amber-900/20'
              : 'bg-primary-600 hover:bg-primary-700'
          }`}
        >
          <MessageSquare className="w-5 h-5 transition-transform group-hover:rotate-12" />
          <span className="font-semibold text-sm">
            {isAgent ? 'Manager Dispute & Support Chat' : 'Need Help? Chat with Us'}
          </span>
        </button>
      )}

      {isOpen && (
        <div className="flex flex-col h-[500px] w-[350px] sm:w-[380px] rounded-3xl bg-white shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div
            className={`flex items-center justify-between px-5 py-4 text-white ${
              isAgent
                ? 'bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900 border-b border-amber-500/30'
                : 'bg-gradient-to-r from-primary-700 to-primary-600'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-sm ${
                  isAgent ? 'bg-amber-500/20 text-amber-300' : 'bg-white/20 text-white'
                }`}
              >
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm leading-tight">
                  {counterpart
                    ? counterpart.name
                    : isAgent
                    ? 'Agency Manager Support & Guidance'
                    : 'ASK Support Concierge'}
                </h4>
                <p className="text-[11px] text-amber-300">
                  {counterpart
                    ? counterpart.role === 'AGENT'
                      ? 'Your Assigned Travel Agent'
                      : 'Agency Operations Manager'
                    : isAgent
                    ? 'Direct Manager Dispute Line'
                    : 'Bahir Dar Operations Office'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1.5 text-white/80 hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/50">
            {!user ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 text-stone-500">
                <UserIcon className="w-10 h-10 text-stone-300 mb-2" />
                <p className="text-xs font-semibold text-stone-700">Please Sign In</p>
                <p className="text-xs text-stone-500 mt-1">
                  Log in to chat in real-time with your assigned travel agent or manager.
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="p-4 text-center text-xs text-stone-500 bg-amber-50/60 rounded-2xl border border-amber-200/50 m-2">
                <p className="font-bold text-stone-800 mb-1">
                  {counterpart
                    ? `Connected with ${counterpart.name}`
                    : isAgent
                    ? 'Agency Manager Support Channel'
                    : 'Welcome to ASK Concierge!'}
                </p>
                <p className="text-[11px] text-stone-600">
                  {counterpart
                    ? `Direct line with ${counterpart.name} (${
                        counterpart.role === 'AGENT' ? 'your dedicated travel agent' : 'agency manager'
                      }). Feel free to ask about your itinerary, custom travel requests, or booking updates!`
                    : isAgent
                    ? 'Use this channel to discuss client moderation, dispute rejected bookings, or request booking assistance directly from your Agency Manager.'
                    : 'Start a conversation! Our concierge team is available to assist you.'}
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.sender_id === user.id;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-[10px] text-stone-400 mb-1 px-1">
                      {isMe ? 'You' : m.sender?.name || 'Support'}
                    </span>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-sm leading-relaxed ${
                        isMe
                          ? 'bg-primary-600 text-white rounded-br-none'
                          : 'bg-white text-stone-800 border border-stone-200 rounded-bl-none'
                      }`}
                    >
                      {m.body}
                    </div>
                  </div>
                );
              })
            )}

            {isTyping && (
              <div className="text-[11px] text-stone-400 italic px-2 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" />
                <span className="inline-block w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="inline-block w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                Support is typing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          {user && (
            <form onSubmit={handleSend} className="p-3 border-t border-stone-100 bg-white flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={handleTyping}
                placeholder="Type your message..."
                maxLength={2000}
                className="flex-1 rounded-xl border border-stone-200 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim()}
                className="flex items-center justify-center rounded-xl bg-primary-600 p-2.5 text-white hover:bg-primary-700 disabled:opacity-40 transition-opacity"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
