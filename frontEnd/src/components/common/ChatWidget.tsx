import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  X,
  Send,
  Bot,
  User as UserIcon,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  LogIn,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { connectSocket, getSocket } from '../../services/socket';
import { MessageItem } from '../../types';

const QUICK_SUGGESTIONS = [
  'What tours are available?',
  'How much do expeditions cost?',
  'How can I pay (Telebirr / CBE)?',
  'How do I join the Agent Network?',
];

export const ChatWidget: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [counterpart, setCounterpart] = useState<{
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
  } | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
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
    const s = connectSocket();
    setIsConnected(s.connected);

    s.on('connect', () => setIsConnected(true));
    s.on('disconnect', () => setIsConnected(false));

    if (user) {
      try {
        let res;
        if (user.roles?.includes('AGENT')) {
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
        setTimeout(scrollToBottom, 100);

        // Join socket room
        s.emit('join:conversation', { conversationId: convId });
      } catch (err) {
        console.error('Failed to init user conversation:', err);
      }
    } else {
      // Guest public visitor chat
      let guestId = sessionStorage.getItem('ask_guest_chat_id');
      if (!guestId) {
        guestId = 'guest_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
        sessionStorage.setItem('ask_guest_chat_id', guestId);
      }
      setConversationId(guestId);
      setCounterpart({
        id: 'concierge_support',
        name: 'ASK Live Concierge',
        email: 'owner@askdigital.et',
        role: 'CONCIERGE',
      });

      // Initial welcome message if fresh guest
      if (messages.length === 0) {
        setMessages([
          {
            id: 'welcome_1',
            conversation_id: guestId,
            sender_id: 'concierge_support',
            body: 'Hello! Welcome to ASK Ethiopian Tour & Travel. I am your real-time concierge connected via live WebSocket. How can we assist you with our tour packages or bookings today?',
            created_at: new Date().toISOString(),
            sender: { id: 'concierge_support', name: 'ASK Live Concierge' } as any,
          },
        ]);
      }

      s.emit('join:conversation', { conversationId: guestId });
    }

    // Socket message listener
    s.off('message:new');
    s.on('message:new', (msg: MessageItem) => {
      setMessages((prev) => {
        // Prevent duplicate messages
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setTimeout(scrollToBottom, 50);
    });

    // Typing listener
    s.off('typing:status');
    s.on('typing:status', (data: { userId: string; isTyping: boolean }) => {
      if (data.userId !== user?.id) {
        setIsTyping(data.isTyping);
        setTimeout(scrollToBottom, 50);
      }
    });
  };

  const sendMessageText = (text: string) => {
    if (!text.trim() || !conversationId) return;

    const s = getSocket();
    s.emit('message:send', {
      conversationId,
      body: text.trim(),
    });

    setInputMessage('');
    s.emit('typing', { conversationId, isTyping: false });
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessageText(inputMessage);
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
    if (!conversationId) return;
    const s = getSocket();
    s.emit('typing', { conversationId, isTyping: e.target.value.length > 0 });
  };

  const isAgent = user?.roles?.includes('AGENT');

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-2.5 rounded-full px-5 py-3.5 text-white shadow-2xl hover:scale-105 active:scale-95 transition-all group cursor-pointer ${
            isAgent
              ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 ring-2 ring-amber-400/40 shadow-amber-900/20'
              : 'bg-primary-600 hover:bg-primary-700 shadow-primary-700/30'
          }`}
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5 transition-transform group-hover:rotate-12" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <span className="font-semibold text-sm">
            {isAgent ? 'Manager Dispute & Support Chat' : 'Need Help? Chat with Us'}
          </span>
        </button>
      )}

      {isOpen && (
        <div className="flex flex-col h-[520px] w-[350px] sm:w-[390px] rounded-3xl bg-white shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
                <h4 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                  <span>
                    {counterpart
                      ? counterpart.name
                      : isAgent
                      ? 'Agency Manager Support'
                      : 'ASK Concierge'}
                  </span>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" title="Online (WebSocket Live)" />
                </h4>
                <p className="text-[11px] text-amber-200 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  <span>Real-Time Support • Bahir Dar</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1.5 text-white/80 hover:bg-white/20 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Member Banner or Sign In Notice */}
          {!user && (
            <div className="bg-amber-50 px-4 py-2 text-[11px] text-amber-900 border-b border-amber-200/60 flex items-center justify-between">
              <span>Chatting live as Guest.</span>
              <Link to="/login" className="font-bold text-primary-700 hover:underline flex items-center gap-1">
                <LogIn className="w-3 h-3" />
                <span>Sign In</span>
              </Link>
            </div>
          )}

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/60">
            {messages.map((m) => {
              const isMe = user ? m.sender_id === user.id : m.sender_id.startsWith('guest_') || m.sender_id === 'guest';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[10px] text-stone-400 mb-1 px-1 font-medium">
                    {isMe ? 'You' : m.sender?.name || 'Concierge'}
                  </span>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed whitespace-pre-wrap ${
                      isMe
                        ? 'bg-primary-600 text-white rounded-br-xs'
                        : 'bg-white text-stone-800 border border-stone-200 rounded-bl-xs'
                    }`}
                  >
                    {m.body}
                  </div>
                </div>
              );
            })}

            {/* Quick Action Suggestion Chips for Guests/New Chats */}
            {messages.length <= 2 && (
              <div className="pt-2 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block px-1">
                  Suggested Questions:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SUGGESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => sendMessageText(q)}
                      className="text-left text-[11px] bg-white hover:bg-primary-50 text-stone-700 hover:text-primary-800 border border-stone-200 hover:border-primary-300 px-3 py-1.5 rounded-full transition-all shadow-2xs cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isTyping && (
              <div className="text-[11px] text-stone-400 italic px-2 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 bg-primary-600 rounded-full animate-bounce" />
                <span className="inline-block w-1.5 h-1.5 bg-primary-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="inline-block w-1.5 h-1.5 bg-primary-600 rounded-full animate-bounce [animation-delay:0.4s]" />
                Concierge is typing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form onSubmit={handleSend} className="p-3 border-t border-stone-100 bg-white flex gap-2 items-center">
            <input
              type="text"
              value={inputMessage}
              onChange={handleTyping}
              placeholder="Ask anything about tours, rates, or bookings..."
              maxLength={2000}
              className="flex-1 rounded-2xl border border-stone-200 px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 bg-stone-50"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="flex items-center justify-center rounded-2xl bg-primary-600 p-2.5 text-white hover:bg-primary-700 disabled:opacity-40 transition-all cursor-pointer shadow-sm shadow-primary-600/30"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
